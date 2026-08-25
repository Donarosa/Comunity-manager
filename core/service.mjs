// Casos de uso. Es la única capa que combina marca + IA + cuota + render.
// La API HTTP y la CLI son cáscaras finitas alrededor de esto.
//
// Regla que vale para todo el archivo: la cuota se VERIFICA antes de llamar a
// la API de Claude y se CONSUME después de que el trabajo salió bien. Al revés
// se le cobraría al usuario una pieza que nunca vio, o peor: se gastaría plata
// de API en un pedido que igual se iba a rechazar.

import {
  crearCuenta, leerCuenta, guardarCuenta, listarCuentas, carpetaPiezas,
} from './store/store.mjs'
import { estado, verificar, consumir, registrarCosto, periodo } from './quota/ledger.mjs'
import { resolverPlan } from './quota/plan.mjs'
import { valorGenerado } from './valor.mjs'
import { normalizeBrand, normalizeLogo } from './brand/schema.mjs'
import { generarLogo } from './brand/logo.mjs'
import { sugerirIdentidad } from './brand/identidad.mjs'
import { generarPlan, planToSpec, placaToSlide } from './content/plan.mjs'
import { renderSpec, htmlFor } from './render/engine.mjs'
import { buscarImagenes, guardarDelBanco, guardarSubida, estadoBanco } from './media/imagenes.mjs'
import { FONT_PRESETS } from './brand/fonts.mjs'
import { FORMATS } from './render/formats.mjs'
import { catalogoDisposiciones } from './render/disposiciones.mjs'

export { listarCuentas, leerCuenta }
export const catalogo = () => ({
  planes: Object.values(resolverPlanTodos()),
  tipografias: FONT_PRESETS.map(({ id, label, vibe }) => ({ id, label, vibe })),
  formatos: Object.values(FORMATS).map(f => ({ id: f.id, label: f.label, w: f.w, h: f.h })),
  disposiciones: catalogoDisposiciones(),
  bancos: estadoBanco(),
})
function resolverPlanTodos() {
  return { unico: resolverPlan('unico') }
}

const HISTORIAL_MAX = 24

// Todo estado que sale del servicio lleva el valor generado. Se calcula acá y no
// en el ledger porque el precio de referencia es una decisión comercial, no
// parte de la contabilidad de cuotas.
const estadoCompleto = cuenta => ({
  ...estado(cuenta),
  valor: valorGenerado(cuenta, periodo().mes),
})

function conMarca(cuenta) {
  if (!cuenta.marca) {
    throw new Error('La cuenta todavía no tiene marca cargada. Configurala primero.')
  }
  return cuenta.marca
}

/* ── cuentas ─────────────────────────────────────────────── */

export function altaCuenta({ nombre, email, plan }) {
  const cuenta = crearCuenta({ nombre, email, plan })
  return { cuenta: resumen(cuenta), estado: estadoCompleto(cuenta) }
}

export function estadoCuenta(id) {
  const cuenta = leerCuenta(id)
  return { cuenta: resumen(cuenta), estado: estadoCompleto(cuenta) }
}

function resumen(c) {
  return {
    id: c.id, nombre: c.nombre, email: c.email, plan: c.plan, estado: c.estado,
    marca: c.marca ? { nombre: c.marca.nombre, handle: c.marca.handle, logo: c.marca.logo.origen } : null,
  }
}

/* ── marca ───────────────────────────────────────────────── */

/**
 * Alta o actualización de la marca. Acepta datos parciales: lo que no venga
 * se conserva de la marca anterior, así "cambiame solo el color" es una
 * llamada y no un reenvío de todo el onboarding.
 */
export function configurarMarca(cuentaId, datos) {
  const cuenta = leerCuenta(cuentaId)
  const previo = cuenta.marca

  const base = previo
    ? {
        nombre: previo.nombre,
        handle: previo.handle,
        sitio: previo.site,
        color: previo.meta.colorOriginal,
        tipografia: previo.fonts.preset,
        disposicion: previo.disposicion,
        logo: previo.logo,
        ...previo.negocio,
      }
    : {}

  const { brand, warnings } = normalizeBrand({ ...base, ...datos })
  cuenta.marca = brand
  guardarCuenta(cuenta)
  return { marca: brand, avisos: warnings }
}

/**
 * Sube un logo propio: se sanitiza y, si ya hay marca, la reemplaza.
 *
 * No exige que la marca exista. En el alta el logo se sube en el paso 3 y la
 * marca recién se guarda al final de ese mismo paso, así que pedirla acá rompía
 * el alta de todo negocio que sí tiene logo — que es la mitad de los casos.
 * Cuando todavía no hay marca, el logo se valida y se devuelve limpio: el
 * cliente lo manda después junto con el resto de los datos.
 */
export function subirLogo(cuentaId, logo) {
  const cuenta = leerCuenta(cuentaId)
  const limpio = normalizeLogo({ ...logo, origen: 'usuario' })
  if (limpio.origen === 'default') {
    throw new Error('El SVG no tiene <path> ni <circle> utilizables. Exportalo como trazos, sin texto ni imágenes incrustadas.')
  }
  if (cuenta.marca) {
    cuenta.marca.logo = limpio
    guardarCuenta(cuenta)
  }
  return { logo: limpio }
}

/**
 * Genera 3 propuestas de logo y renderiza una placa de muestra con cada una.
 * Consume la cuota de logos (1 por mes en el plan único): el límite existe
 * para que el logo sea una decisión y no una tragamonedas.
 */
export async function proponerLogos(cuentaId) {
  const cuenta = leerCuenta(cuentaId)
  const marca = conMarca(cuenta)
  verificar(cuenta, 'logos', 1)

  const { propuestas, costo } = await generarLogo({ nombre: marca.nombre, ...marca.negocio })

  const dir = carpetaPiezas(cuentaId, 'logos')
  const previews = []
  for (const p of propuestas) {
    const brandPreview = { ...marca, logo: p.logo }
    const [render] = await renderSpec({
      brand: brandPreview,
      outDir: dir,
      spec: {
        slides: [{
          name: `logo-${p.id}`, style: 'flat', type: 'body', format: 'feed',
          kick: 'Propuesta de logo',
          title: `Así se ve tu <span class="acc">logo</span> en una placa`,
          body: p.concepto,
        }],
      },
    })
    previews.push({ ...p, preview: render.file })
  }

  cuenta.logosPropuestos = previews.map(({ id, concepto, logo }) => ({ id, concepto, logo }))
  consumir(cuenta, 'logos', 1, { costoUSD: costo })
  guardarCuenta(cuenta)

  return { propuestas: previews, costoUSD: costo, estado: estadoCompleto(cuenta) }
}

export function elegirLogo(cuentaId, propuestaId) {
  const cuenta = leerCuenta(cuentaId)
  conMarca(cuenta)
  const p = (cuenta.logosPropuestos || []).find(x => x.id === propuestaId)
  if (!p) throw new Error(`no encuentro la propuesta "${propuestaId}"`)
  cuenta.marca.logo = p.logo
  guardarCuenta(cuenta)
  return { logo: p.logo }
}

/**
 * Identidad completa sugerida: 4 logos, 3 colores y una tipografía, en una
 * sola llamada. Es lo que ve el negocio que llega sin nada.
 *
 * No renderiza PNG: los logos se previsualizan como SVG en el navegador, que
 * es instantáneo y no ocupa Chrome. La cuota que consume es la de logos —una
 * por mes— porque es la misma decisión.
 */
export async function sugerirIdentidadCuenta(cuentaId, datosNegocio = {}) {
  const cuenta = leerCuenta(cuentaId)
  verificar(cuenta, 'logos', 1)

  const negocio = { ...(cuenta.marca?.negocio || {}), ...datosNegocio }
  const nombre = datosNegocio.nombre || cuenta.marca?.nombre || cuenta.nombre
  const r = await sugerirIdentidad({ nombre, ...negocio })

  cuenta.identidadSugerida = {
    fecha: new Date().toISOString(),
    lectura: r.lectura,
    logos: r.logos,
    colores: r.colores,
    tipografia: r.tipografia,
  }
  consumir(cuenta, 'logos', 1, { costoUSD: r.costo })
  guardarCuenta(cuenta)

  return { ...r, estado: estadoCompleto(cuenta) }
}

/** Adopta una combinación de la sugerencia (o una mezcla con lo que el usuario tocó). */
export function adoptarIdentidad(cuentaId, { logoId, color, tipografia } = {}) {
  const cuenta = leerCuenta(cuentaId)
  const sugerida = cuenta.identidadSugerida
  const datos = {}

  if (color) datos.color = color
  if (tipografia) datos.tipografia = tipografia
  if (logoId) {
    const l = (sugerida?.logos || []).find(x => x.id === logoId)
    if (!l) throw new Error(`no encuentro el logo "${logoId}"`)
    datos.logo = l.logo
  }
  return configurarMarca(cuentaId, datos)
}

/* ── previsualización ────────────────────────────────────── */

/**
 * Devuelve el HTML de una placa, sin abrir Chrome y sin gastar cuota.
 *
 * El navegador lo muestra en un iframe achicado. Es la misma hoja de estilos y
 * las mismas fuentes que usa el PNG final, así que lo que ve el usuario
 * mientras escribe es exactamente lo que va a descargar. Una previsualización
 * dibujada aparte se desincroniza del motor en la primera semana.
 *
 * `marcaTemporal` permite previsualizar con un color o una tipografía que el
 * usuario todavía está probando y no guardó.
 */
export function previsualizar(cuentaId, { placa, canal = 'feed', marcaTemporal = null } = {}) {
  const cuenta = leerCuenta(cuentaId)
  let marca = conMarca(cuenta)

  if (marcaTemporal && Object.keys(marcaTemporal).length) {
    marca = normalizeBrand({
      nombre: marca.nombre,
      handle: marca.handle,
      sitio: marca.site,
      color: marca.meta.colorOriginal,
      tipografia: marca.fonts.preset,
      disposicion: marca.disposicion,
      logo: marca.logo,
      ...marca.negocio,
      ...marcaTemporal,
    }).brand
  }

  const formato = canal === 'historia' ? 'story' : canal === 'cuadrado' ? 'cuadrado' : 'feed'
  const slide = placaToSlide(placa, { nombre: 'preview', idx: placa.idx || '', formato, foto: placa.foto || null })

  // Una placa sobre foto se previsualiza aunque todavía no haya foto: el orden
  // natural es elegir la plantilla, escribir, y recién después buscar la imagen.
  // Sin esto, la pantalla se rompe justo en el momento en que el usuario está
  // decidiendo qué escribir. Al renderizar el PNG sí se exige la foto de verdad.
  if (slide.style === 'foto' && !slide.photo) {
    slide.photoData = lienzoVacio(marca.colors.foto.bg)
  }

  return { html: htmlFor(slide, marca, formato), formato }
}

function lienzoVacio(color) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="192">` +
    `<rect width="108" height="192" fill="${color}"/>` +
    `<path d="M -20 192 L 128 44 M -20 240 L 128 92 M -20 144 L 128 -4" stroke="#ffffff" stroke-opacity="0.07" stroke-width="9"/>` +
    `</svg>`
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
}

/* ── imágenes ────────────────────────────────────────────── */

export async function buscarEnBanco(params) {
  return buscarImagenes(params)
}

export async function traerDelBanco(cuentaId, id) {
  leerCuenta(cuentaId) // valida que exista
  return guardarDelBanco(cuentaId, id)
}

export function subirImagen(cuentaId, datos) {
  leerCuenta(cuentaId)
  return guardarSubida(cuentaId, datos)
}

/* ── contenido ───────────────────────────────────────────── */

/**
 * El camino principal: la IA propone el contenido del período y sale
 * renderizado. `fotos` mapea id de publicación → ruta de imagen, para las
 * placas que el plan haya marcado como "sobre foto".
 */
export async function generarContenido(cuentaId, {
  posteos = 3, historias = 2, pedido = '', fotos = {}, etiqueta = '',
} = {}) {
  const cuenta = leerCuenta(cuentaId)
  const marca = conMarca(cuenta)

  // Un carrusel puede traer hasta 5 placas: reservamos por el techo, no por el
  // piso, para no quedarnos sin cuota a mitad del render.
  const techo = posteos * 5 + historias
  verificar(cuenta, 'planes', 1)
  verificar(cuenta, 'piezas', techo)

  const evitar = (cuenta.historial || []).slice(-8).map(h => `- ${h.tema}`).join('\n')
  const { plan, costo } = await generarPlan({ brand: marca, posteos, historias, pedido, evitar })
  registrarCosto(cuenta, costo)

  const { dia } = periodo()
  const sub = etiqueta ? `${dia}-${etiqueta}`.replace(/[^\w.-]/g, '-') : dia
  const outDir = carpetaPiezas(cuentaId, sub)

  const { spec, publicaciones, pendientes, resumen: resumenPlan } = planToSpec(plan, { outDir, fotos })

  if (spec.slides.length) {
    try {
      verificar(cuenta, 'piezas', spec.slides.length)
    } catch (e) {
      guardarCuenta(cuenta) // no perdemos el costo ya incurrido
      throw e
    }
    await renderSpec({ spec, brand: marca })
  }

  consumir(cuenta, 'planes', 1)
  if (spec.slides.length) consumir(cuenta, 'piezas', spec.slides.length)

  cuenta.historial = [
    ...(cuenta.historial || []),
    ...publicaciones.map(p => ({ fecha: dia, tema: p.objetivo, canal: p.canal })),
  ].slice(-HISTORIAL_MAX)
  guardarCuenta(cuenta)

  return {
    resumen: resumenPlan,
    carpeta: outDir,
    publicaciones,
    pendientes,
    costoUSD: costo,
    estado: estadoCompleto(cuenta),
  }
}

/**
 * El otro camino: el usuario escribe su propio texto (o sube su foto) y solo
 * quiere la placa. No pasa por la IA, así que no cuesta API — solo cuota de
 * piezas.
 */
export async function renderizarPieza(cuentaId, { canal = 'feed', placas = [], nombre = '', foto = null }) {
  const cuenta = leerCuenta(cuentaId)
  const marca = conMarca(cuenta)
  if (!placas.length) throw new Error('mandá al menos una placa')
  verificar(cuenta, 'piezas', placas.length)

  const { dia } = periodo()
  const outDir = carpetaPiezas(cuentaId, dia)
  const formato = canal === 'historia' ? 'story' : canal === 'cuadrado' ? 'cuadrado' : 'feed'
  const base = (nombre || `manual-${Date.now()}`).replace(/[^\w.-]/g, '-')
  const total = placas.length

  const slides = placas.map((p, i) => placaToSlide(p, {
    nombre: total > 1 ? `${base}-${String(i + 1).padStart(2, '0')}` : base,
    idx: total > 1 ? `${String(i + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}` : '',
    formato,
    foto: p.foto || foto,
  }))

  const archivos = await renderSpec({ spec: { slides }, brand: marca, outDir })
  consumir(cuenta, 'piezas', placas.length)
  guardarCuenta(cuenta)

  return { carpeta: outDir, archivos, estado: estadoCompleto(cuenta) }
}
