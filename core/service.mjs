// Casos de uso. Es la única capa que combina marca + IA + cuota + render.
// La API HTTP y la CLI son cáscaras finitas alrededor de esto.
//
// Regla que vale para todo el archivo: la cuota se VERIFICA antes de llamar a
// la API de IA y se CONSUME después de que el trabajo salió bien.

import { readFileSync } from 'fs'
import {
  crearCuenta, leerCuenta, leerCuentaAsync, guardarCuenta, listarCuentas, carpetaPiezas,
  listarPublicacionesAsync, actualizarPublicacion, listarPlanesAsync, obtenerEstadisticasAsync,
  listarCuentasAsync, eliminarCuentaAsync,
  registrarPublicacion, listarPublicaciones, registrarPlan, listarPlanes,
  registrarEventoEstadistica, obtenerEstadisticas,
  guardarCodigoOtpLocal, verificarCodigoOtpLocal,
} from './store/store.mjs'
import * as firestore from './store/firestore.mjs'
import { estado, verificar, consumir, registrarCosto, periodo } from './quota/ledger.mjs'
import { resolverPlan } from './quota/plan.mjs'
import { valorGenerado } from './valor.mjs'
import { normalizeBrand, normalizeLogo } from './brand/schema.mjs'
import { generarLogo } from './brand/logo.mjs'
import { buscarIsotipos } from './brand/repositorio.mjs'
import { sugerirIdentidad } from './brand/identidad.mjs'
import { generarPlan, planToSpec, placaToSlide } from './content/plan.mjs'
import { CAMPOS_DE_PLANTILLA } from './content/plantillas.mjs'
import { generarTemas, temasLocales } from './content/temas.mjs'
import { renderSpec, htmlFor } from './render/engine.mjs'
import { buscarImagenes, guardarDelBanco, guardarSubida, estadoBanco } from './media/imagenes.mjs'
import { FONT_PRESETS, LOGO_FONTS } from './brand/fonts.mjs'
import { FORMATS } from './render/formats.mjs'
import { catalogoDisposiciones } from './render/disposiciones.mjs'
import { catalogoLogotipos, tratamientosPara } from './brand/logotipo.mjs'

export {
  listarCuentas, leerCuenta, leerCuentaAsync,
  listarPublicaciones, listarPlanes, obtenerEstadisticas, registrarEventoEstadistica,
}
export const buscarLogosCatalogo = (q, limite) => buscarIsotipos(q, limite)
export const catalogo = () => ({
  planes: Object.values(resolverPlanTodos()),
  tipografias: FONT_PRESETS.map(({ id, label, vibe }) => ({ id, label, vibe })),
  formatos: Object.values(FORMATS).map(f => ({ id: f.id, label: f.label, w: f.w, h: f.h })),
  disposiciones: catalogoDisposiciones(),
  logotipos: catalogoLogotipos(),
  // Se manda también familia/caps/tracking: sin eso la vista previa del
  // navegador tendría que hardcodear los nombres y se despegaría del motor.
  fuentesLogotipo: LOGO_FONTS.map(({ id, label, vibe, family, caps, tracking, monograma, importUrl }) =>
    ({ id, label, vibe, family, caps, tracking, monograma, importUrl })),
  bancos: estadoBanco(),
  firebase: {
    activo: firestore.estaActivo(),
  },
})

function resolverPlanTodos() {
  return { unico: resolverPlan('unico') }
}

const HISTORIAL_MAX = 24

// Todo estado que sale del servicio lleva el valor generado.
const estadoCompleto = cuenta => ({
  ...estado(cuenta),
  valor: valorGenerado(cuenta, periodo().mes),
})

function conMarca(cuenta) {
  if (!cuenta.marca) {
    // El mensaje va a la pantalla de un cliente, así que dice qué hacer. Y
    // lleva código: sin él, el servidor lo trataba como una falla interna y
    // devolvía un 500 en vez de decir que falta un paso.
    const e = new Error('Todavía no armaste tu marca. Cargala una vez y las placas salen con tus colores y tu firma.')
    e.codigo = 'sin_marca'
    throw e
  }
  return cuenta.marca
}

/* ── cuentas ─────────────────────────────────────────────── */

export function altaCuenta({ id, nombre, email, plan, foto, userId }) {
  // Si ya existe la cuenta con ese ID, la traemos y actualizamos
  try {
    const previa = leerCuenta(id || userId)
    if (previa) {
      if (nombre) previa.nombre = nombre
      if (email) previa.email = email
      if (foto) previa.foto = foto
      guardarCuenta(previa)
      return { cuenta: resumen(previa), estado: estadoCompleto(previa) }
    }
  } catch { /* no existía previamente */ }

  const cuenta = crearCuenta({ id, nombre, email, plan, foto, userId })
  registrarEventoEstadistica(cuenta.id, 'cuenta_creada', { nombre: cuenta.nombre, email: cuenta.email })
  return { cuenta: resumen(cuenta), estado: estadoCompleto(cuenta) }
}

export function estadoCuenta(id) {
  const cuenta = leerCuenta(id)
  return { cuenta: resumen(cuenta), estado: estadoCompleto(cuenta) }
}

/**
 * Todo lo que muestra el dashboard.
 *
 * Es asincrónica porque las tres listas hay que traerlas de Firestore. Con las
 * lecturas sincrónicas —que solo miran el disco de la función— el dashboard
 * salía vacío al día siguiente: la cuota decía "10 placas este mes", porque el
 * contador vive en la cuenta y esa sí se hidrataba, y abajo no había ninguna.
 * Peor que no mostrar nada: mostraba que el trabajo existió y no aparecía.
 */
export async function dashboardUsuario(id) {
  const cuenta = leerCuenta(id)
  const [publicaciones, planes, estadisticas] = await Promise.all([
    listarPublicacionesAsync(id),
    listarPlanesAsync(id),
    obtenerEstadisticasAsync(id),
  ])
  const est = estadoCompleto(cuenta)

  return {
    cuenta: {
      ...resumen(cuenta),
      foto: cuenta.foto || null,
      creada: cuenta.creada,
    },
    marca: cuenta.marca || null,
    estado: est,
    publicaciones: publicaciones.slice(0, 30),
    planes: planes.slice(0, 10),
    estadisticas: estadisticas.slice(0, 30),
    resumenMetricas: {
      totalPublicaciones: publicaciones.length,
      totalPlanes: planes.length,
      totalDescargas: publicaciones.reduce((acc, p) => acc + (p.interacciones?.descargas || 1), 0),
      ahorroTotal: est.valor?.equivalenteTotal || 0,
      placasEsteMes: est.valor?.placasMes || 0,
      costoMesUSD: Number((est.costoMesUSD || est.usado?.mes?.costoUSD || 0).toFixed(4)),
      costoTotalUSD: Number(Object.values(cuenta.consumo || {}).reduce((acc, m) => acc + (m.costoUSD || 0), 0).toFixed(4)),
    },
  }
}

function resumen(c) {
  return {
    id: c.id,
    userId: c.userId || c.id,
    nombre: c.nombre,
    email: c.email,
    foto: c.foto || null,
    plan: c.plan,
    estado: c.estado,
    marca: c.marca ? {
      nombre: c.marca.nombre,
      handle: c.marca.handle,
      logo: c.marca.logo?.origen || 'default',
      colores: c.marca.colors || null,
      colorHex: c.marca.meta?.colorOriginal || null,
      tipografia: c.marca.fonts?.preset || null,
      // La usa el editor para dibujar la tarjeta "La de tu marca" con la
      // disposición que la marca realmente tiene. Sin esto dibujaba siempre la
      // clásica, así que a cualquier marca que use otra le mostraba una que no
      // era la suya.
      disposicion: c.marca.disposicion || null,
    } : null,
  }
}

/* ── OTP y Autenticación ─────────────────────────────────── */

export async function enviarOtp(email) {
  const normEmail = String(email).trim().toLowerCase()
  if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
    throw new Error('Ingresá un correo electrónico válido')
  }

  // Generamos un código numérico seguro de 6 dígitos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString()

  if (firestore.estaActivo()) {
    await firestore.guardarCodigoOTP(normEmail, codigo)
  } else {
    guardarCodigoOtpLocal(normEmail, codigo)
  }

  console.log(`\n========================================`)
  console.log(`[AUTH OTP] Código para ${normEmail}: ${codigo}`)
  console.log(`========================================\n`)

  return {
    ok: true,
    email: normEmail,
    mensaje: `Código de acceso enviado a ${normEmail}`,
    // En desarrollo local devolvemos el código en el payload para pruebas sin servidor SMTP
    codigoDev: process.env.NODE_ENV !== 'production' ? codigo : undefined,
  }
}

export async function verificarOtp(email, codigo, nombre = null) {
  const normEmail = String(email).trim().toLowerCase()
  const cod = String(codigo).trim()

  let resultado
  if (firestore.estaActivo()) {
    resultado = await firestore.verificarCodigoOTP(normEmail, cod)
    if (!resultado) resultado = verificarCodigoOtpLocal(normEmail, cod)
  } else {
    resultado = verificarCodigoOtpLocal(normEmail, cod)
  }

  if (!resultado.ok) {
    throw new Error(resultado.error || 'Código incorrecto')
  }

  // Si el usuario no existe, creamos su cuenta automáticamente
  let cuentaExistente = listarCuentas().find(c => c.email === normEmail)
  let cuenta
  if (cuentaExistente) {
    cuenta = leerCuenta(cuentaExistente.id)
  } else {
    const idGenerado = 'usr_' + Buffer.from(normEmail).toString('hex').slice(0, 16)
    const alta = altaCuenta({
      id: idGenerado,
      email: normEmail,
      nombre: nombre || normEmail.split('@')[0],
    })
    cuenta = leerCuenta(alta.cuenta.id)
  }

  registrarEventoEstadistica(cuenta.id, 'login_otp', { email: normEmail })

  return {
    ok: true,
    cuenta: resumen(cuenta),
    estado: estadoCompleto(cuenta),
  }
}

/* ── marca ───────────────────────────────────────────────── */

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
        logotipoTipo: previo.logotipo?.tipo,
        logotipoTratamiento: previo.logotipo?.tratamiento,
        logotipoEscudo: previo.logotipo?.escudo,
        logotipoFuente: previo.fonts?.logo?.preset,
        logo: previo.logo,
        ...previo.negocio,
      }
    : {}

  const { brand, warnings } = normalizeBrand({ ...base, ...datos })
  cuenta.marca = brand
  guardarCuenta(cuenta)
  registrarEventoEstadistica(cuentaId, 'marca_actualizada', { nombre: brand.nombre })

  return {
    marca: brand,
    advertencias: warnings,
    estado: estadoCompleto(cuenta),
  }
}

export async function sugerirIdentidadCuenta(cuentaId, negocio) {
  const cuenta = leerCuenta(cuentaId)
  verificar(cuenta, 'logos', 1)

  const { propuesta, costo } = await sugerirIdentidad(negocio)
  registrarCosto(cuenta, costo)
  consumir(cuenta, 'logos', 1)
  guardarCuenta(cuenta)
  registrarEventoEstadistica(cuentaId, 'identidad_sugerida', { negocio: negocio.rubro })

  return {
    propuesta,
    costoUSD: costo,
    estado: estadoCompleto(cuenta),
  }
}

export function adoptarIdentidad(cuentaId, { propuesta, opcionLogo = 0, opcionColor = 0, nombre = '', handle = '', sitio = '', disposicion = '' }) {
  if (!propuesta?.logos?.[opcionLogo] || !propuesta?.colores?.[opcionColor]) {
    throw new Error('Opción de logo o color inválida')
  }

  const logoElegido = propuesta.logos[opcionLogo]
  const colorElegido = propuesta.colores[opcionColor]
  const tipografiaElegida = propuesta.tipografia?.id || 'editorial-seriedad'

  return configurarMarca(cuentaId, {
    nombre: nombre || propuesta.negocio?.nombre || 'Mi Marca',
    rubro: propuesta.negocio?.rubro || '',
    descripcion: propuesta.negocio?.descripcion || '',
    publico: propuesta.negocio?.publico || '',
    diferencial: propuesta.negocio?.diferencial || '',
    handle: handle || propuesta.negocio?.handle || '',
    sitio: sitio || propuesta.negocio?.sitio || '',
    color: colorElegido.hex,
    tipografia: tipografiaElegida,
    disposicion: disposicion || 'clasica',
    logo: {
      origen: 'propuesta',
      svg: logoElegido.svg,
      ancho: 120,
      alto: 120,
       viewBox: logoElegido.viewBox || '0 0 100 100',
    },
  })
}

export async function proponerLogos(cuentaId) {
  const cuenta = leerCuenta(cuentaId)
  const marca = conMarca(cuenta)
  verificar(cuenta, 'logos', 1)

  const { propuestas, costo } = await generarLogo({ brand: marca })
  registrarCosto(cuenta, costo)
  consumir(cuenta, 'logos', 1)
  guardarCuenta(cuenta)

  return {
    propuestas,
    costoUSD: costo,
    estado: estadoCompleto(cuenta),
  }
}

export function elegirLogo(cuentaId, propuesta) {
  const cuenta = leerCuenta(cuentaId)
  const marca = conMarca(cuenta)

  marca.logo = normalizeLogo({
    origen: 'propuesta',
    svg: propuesta.svg,
    ancho: propuesta.ancho || 120,
    alto: propuesta.alto || 120,
    viewBox: propuesta.viewBox || '0 0 100 100',
  })

  guardarCuenta(cuenta)
  return { marca, estado: estadoCompleto(cuenta) }
}

export function subirLogo(cuentaId, datos) {
  const cuenta = leerCuenta(cuentaId)
  const norm = normalizeLogo({
    origen: 'usuario',
    ...datos,
  })
  if (!norm.inner || norm.origen === 'default') {
    throw new Error('El SVG no tiene trazos de dibujo usables (<path> o <circle>).')
  }

  if (cuenta.marca) {
    cuenta.marca.logo = norm
    guardarCuenta(cuenta)
  }

  return { logo: norm, marca: cuenta.marca, estado: estadoCompleto(cuenta) }
}

/**
 * Qué mostrar en los campos que todavía están vacíos.
 *
 * Solo para la vista previa: al render de verdad no llegan, así que una placa
 * generada nunca sale con esto impreso. Sirve para que se vea la forma de la
 * placa mientras se escribe —dónde cae cada cosa y cuánto ocupa— en vez de un
 * rectángulo casi vacío del que no se deduce nada.
 *
 * Están redactados como consignas y no como contenido creíble, y es a propósito:
 * un ejemplo tipo "2 × 1" se lee como una promoción que el negocio estaría
 * haciendo, y si alguien no lo reemplaza termina publicando algo falso sobre sí
 * mismo. "Tu oferta acá" no puede confundirse con la placa terminada.
 */
function ejemplosDeCampos(placa) {
  const vacio = v => v == null || v === '' || (Array.isArray(v) && !v.length)
  const plantilla = placa?.plantilla

  const titulo = {
    frase: 'Tu frase principal',
    cierre: '¿Hablamos?',
    pasos: 'Los pasos, uno por uno',
    oferta: 'Tu producto o servicio',
    manifiesto: 'Lo que defiende tu negocio',
  }[plantilla] || 'Escribí tu título'

  const cuerpo = {
    frase: 'La línea que acompaña a la frase.',
    cierre: 'Cómo te contactan: teléfono, dirección u horario.',
    oferta: 'Qué incluye y hasta cuándo vale.',
  }[plantilla] || 'Acá va el texto que acompaña al título. Dos o tres líneas alcanzan.'

  const ejemplos = {
    kicker: 'Tu etiqueta',
    titulo,
    cuerpo,
    linea2: 'Tu segunda línea',
    fuente: 'De dónde sacaste el dato',
    emoji: 'Tu oferta acá',
    chips: ['Tu dato', 'Otro dato'],
    pasos: [
      { numero: '1', etiqueta: marcarEjemplo('Paso 1'), titulo: marcarEjemplo('Qué se hace primero') },
      { numero: '2', etiqueta: marcarEjemplo('Paso 2'), titulo: marcarEjemplo('Qué sigue') },
      { numero: '3', etiqueta: marcarEjemplo('Paso 3'), titulo: marcarEjemplo('Cómo termina') },
    ],
  }

  // Solo los campos que esta plantilla dibuja: rellenar los demás no cambiaría
  // nada en pantalla y ensuciaría el spec.
  const declarados = CAMPOS_DE_PLANTILLA[plantilla] || CAMPOS_DE_PLANTILLA.texto
  const relleno = {}
  for (const campo of declarados) {
    if (ejemplos[campo] === undefined) continue

    // Los pasos no están vacíos aunque no tengan nada escrito: el editor abre
    // con tres ya creados y los textos en blanco. Mirar solo si el arreglo
    // existe dejaba la placa con tres cajas numeradas y nada adentro, que es
    // justo lo que había que evitar. Se rellena paso por paso.
    if (campo === 'pasos' && Array.isArray(placa?.pasos) && placa.pasos.length) {
      relleno.pasos = placa.pasos.map((paso, i) => {
        const ej = ejemplos.pasos[i % ejemplos.pasos.length]
        return {
          ...paso,
          numero: paso.numero || String(i + 1),
          etiqueta: vacio(paso.etiqueta) ? marcarEjemplo(ej.etiqueta) : paso.etiqueta,
          titulo: vacio(paso.titulo) ? marcarEjemplo(ej.titulo) : paso.titulo,
        }
      })
      continue
    }

    if (vacio(placa?.[campo])) {
      relleno[campo] = Array.isArray(ejemplos[campo])
        ? ejemplos[campo].map(marcarEjemplo)
        : marcarEjemplo(ejemplos[campo])
    }
  }
  return relleno
}

/**
 * Envolver un ejemplo para que se vea que todavía no está escrito.
 *
 * Se marca el valor y no el elemento porque el motor no tiene —ni tiene por qué
 * tener— un estado de "esto es provisorio": es el mismo render que produce el
 * PNG. Los templates ya insertan HTML en estos campos (los resaltes van así),
 * de modo que el span pasa sin tocar ninguna plantilla.
 */
const marcarEjemplo = v => typeof v === 'string' ? `<span class="ej">${v}</span>` : v

export function previsualizar(cuentaId, { canal = 'feed', placa, marcaTemporal = null }) {
  const cuenta = leerCuenta(cuentaId)
  let marca = cuenta.marca

  if (!marca && !marcaTemporal) {
    marca = normalizeBrand({
      nombre: cuenta.nombre || 'Mi Negocio',
      color: '#8C1D2F',
    }).brand
  } else if (marcaTemporal) {
    marca = normalizeBrand({
      nombre: marca?.nombre || cuenta.nombre || 'Mi Marca',
      handle: marca?.handle || '',
      sitio: marca?.site || '',
      color: marca?.meta?.colorOriginal || '#16140F',
      tipografia: marca?.fonts?.preset || 'editorial-seriedad',
      disposicion: marca?.disposicion || 'clasica',
      logo: marca?.logo || { origen: 'default' },
      ...marca?.negocio,
      ...marcaTemporal,
    }).brand
  }

  const formato = canal === 'historia' ? 'story' : canal === 'cuadrado' ? 'cuadrado' : 'feed'
  const placaPreview = { ...placa, ...ejemplosDeCampos(placa) }
  const slide = placaToSlide(placaPreview, { nombre: 'preview', idx: placa?.idx || '', formato, foto: placa?.foto || null })

  if (slide.style === 'foto' && !slide.photo) {
    slide.photoData = lienzoVacio(marca.colors.foto.bg)
  }

  /* Lo que todavía no se escribió se ve atenuado y con punteado.
   *
   * Va acá y no en el motor: el motor es el mismo que produce el PNG y no puede
   * saber de estados provisorios. Sin esta marca la vista previa mostraba los
   * ejemplos igual que el texto escrito, así que no se distinguía lo propio de
   * la consigna —y peor con los campos que están detrás de un "+", que ni
   * siquiera se van a imprimir si no se agregan—. */
  // box-decoration-break: sin esto, un ejemplo que ocupa dos líneas recibe un
  // solo contorno que envuelve las dos y cruza el espacio vacío del final de la
  // primera. Con `clone` cada línea lleva el suyo y se lee como texto marcado.
  const estiloEjemplos =
    '<style>.ej{opacity:.42;outline:1.5px dashed currentColor;outline-offset:3px;' +
    'border-radius:4px;font-style:normal;' +
    '-webkit-box-decoration-break:clone;box-decoration-break:clone}</style>'

  return { html: htmlFor(slide, marca, formato) + estiloEjemplos, formato }
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

/**
 * Manda las placas recién renderizadas al almacén remoto.
 *
 * En una función serverless el disco donde escribió el motor es /tmp, que se
 * borra entre invocaciones: sin esto la placa desaparece antes de que el
 * navegador la pida. Sin bucket configurado no hace nada y los archivos se
 * quedan donde estaban, que es lo correcto cuando corre en una máquina.
 */
async function archivarPiezas(archivos, prefijo) {
  if (!firestore.hayAlmacen()) return []
  const fallidas = []
  await Promise.all(archivos.map(async a => {
    const ruta = a.file || a
    const nombre = String(ruta).split('/').pop()
    try {
      await firestore.subirPieza(`${prefijo}/${nombre}`, readFileSync(ruta))
    } catch (e) {
      // No voltea el render —la placa ya existe y el usuario la está viendo—
      // pero queda anotado con la ruta completa: una placa que no se archiva
      // desaparece recién cuando se recicla la instancia, y para entonces
      // nadie relaciona el 404 con este momento.
      fallidas.push(nombre)
      console.warn(`[placas] no se pudo archivar ${prefijo}/${nombre}:`, e.message)
    }
  }))
  if (fallidas.length) {
    console.warn(`[placas] ${fallidas.length} de ${archivos.length} no llegaron al almacén: van a dar 404 cuando se recicle la instancia`)
  }
  return fallidas
}

/**
 * Traer la cuenta de Firestore al disco de la función.
 *
 * Todo el resto del service lee con leerCuenta(), que es sincrónica y solo
 * mira el disco. Como función, ese disco arranca vacío en cada instancia, así
 * que sin este paso Firestore es un pozo: se escribe y no se lee nunca.
 *
 * No falla si la cuenta no está en ningún lado: de eso se encarga la ruta, que
 * ya sabe devolver 404. Acá lo único que se hace es no dejarla afuera por
 * haberla buscado en el lugar equivocado.
 */
export async function hidratarCuenta(id) {
  if (!firestore.estaActivo()) return null
  try {
    return await leerCuentaAsync(id)
  } catch {
    return null
  }
}

/* ── administración ──────────────────────────────────────── */

/**
 * Cambia el estado de una cuenta de usuario (para uso del admin).
 * @param {string} id - ID de la cuenta
 * @param {'activa'|'pausada'} nuevoEstado
 */
export function cambiarEstadoUsuario(id, nuevoEstado) {
  const cuenta = leerCuenta(id)
  const estadoAnterior = cuenta.estado
  cuenta.estado = nuevoEstado
  guardarCuenta(cuenta)
  registrarEventoEstadistica(id, 'estado_cambiado_admin', {
    anterior: estadoAnterior,
    nuevo: nuevoEstado,
  })
  return {
    ok: true,
    id,
    estado: nuevoEstado,
    nombre: cuenta.nombre,
    email: cuenta.email,
  }
}

/**
  * Elimina una cuenta de usuario por completo (para uso del admin).
  * @param {string} id - ID de la cuenta
  */
export async function eliminarCuentaUsuario(id) {
  return await eliminarCuentaAsync(id)
}

/**
 * Corregir el texto de una publicación.
 *
 * Lo que devuelve el modelo es un borrador, no una pieza terminada: se le
 * escapa una palabra repetida, no sabe el horario del local, propone algo que
 * ese negocio no hace. Sin poder editarlo acá, el dueño lo copia a otro lado
 * para arreglarlo y lo que queda guardado deja de ser lo que publicó.
 */
export async function editarPublicacion(cuentaId, pubId, { caption, hashtags } = {}) {
  leerCuenta(cuentaId)   // valida que la cuenta exista antes de tocar nada
  const limpios = Array.isArray(hashtags)
    ? hashtags.map(h => String(h).trim()).filter(Boolean).map(h => h.startsWith('#') ? h : `#${h}`)
    : undefined
  return actualizarPublicacion(cuentaId, pubId, { caption, hashtags: limpios })
}

/** Todas las cuentas, traídas de Firestore si hace falta. */
export async function cuentasDe() {
  return listarCuentasAsync()
}

/** Los planes guardados, traídos de Firestore si hace falta. */
export async function planesDe(cuentaId) {
  return listarPlanesAsync(cuentaId)
}

/** La actividad guardada, traída de Firestore si hace falta. */
export async function estadisticasDe(cuentaId) {
  return obtenerEstadisticasAsync(cuentaId)
}

/** Las publicaciones guardadas, traídas de Firestore si hace falta. */
export async function publicacionesDe(cuentaId) {
  return listarPublicacionesAsync(cuentaId)
}

/* ── de qué publicar ─────────────────────────────────────── */

/**
 * Los temas que la pantalla ofrece como atajo.
 *
 * Se guardan en la cuenta y se reusan: pedirlos a la IA cada vez que alguien
 * abre la pantalla sería gastar una llamada por curiosear. Se vuelven a pedir
 * cuando cambia la marca —el negocio cambió lo que cuenta de sí mismo—, cuando
 * pasaron los días de `VIGENCIA_TEMAS`, o cuando quien mira pide otros.
 *
 * Si la IA no está disponible, se responde igual con los temas locales: la
 * pantalla nunca se queda vacía, y el que llama sabe de dónde salieron.
 */
const VIGENCIA_TEMAS = 14 * 24 * 60 * 60 * 1000

export async function temasParaPublicar(cuentaId, { refrescar = false } = {}) {
  const cuenta = leerCuenta(cuentaId)
  const marca = conMarca(cuenta)
  const evitar = (cuenta.historial || []).slice(-8).map(h => h.tema).filter(Boolean)

  const guardados = cuenta.temas
  const vigente = guardados
    && guardados.marca === marca.meta?.slug
    && Date.now() - new Date(guardados.fecha).getTime() < VIGENCIA_TEMAS
    && guardados.temas?.length

  if (vigente && !refrescar) {
    return { temas: guardados.temas, origen: guardados.origen, guardado: true }
  }

  try {
    const { temas, costo } = await generarTemas({ brand: marca, evitar })
    if (temas.length) {
      registrarCosto(cuenta, costo)
      cuenta.temas = { temas, origen: 'ia', fecha: new Date().toISOString(), marca: marca.meta?.slug }
      guardarCuenta(cuenta)
      return { temas, origen: 'ia', guardado: false }
    }
  } catch (e) {
    // La IA apagada o caída no puede dejar la pantalla sin nada que ofrecer.
    if (e.codigo !== 'sin_ia') console.warn('[temas] la IA falló, van los locales:', e.message)
  }

  return { temas: temasLocales(marca.negocio, { evitar }), origen: 'local', guardado: false }
}

export async function buscarEnBanco(params) {
  return buscarImagenes(params)
}

export async function traerDelBanco(cuentaId, id) {
  leerCuenta(cuentaId)
  return guardarDelBanco(cuentaId, id)
}

export function subirImagen(cuentaId, datos) {
  leerCuenta(cuentaId)
  return guardarSubida(cuentaId, datos)
}

/* ── contenido ───────────────────────────────────────────── */

export async function generarContenido(cuentaId, {
  posteos = 3, historias = 2, pedido = '', fotos = {}, etiqueta = '', forma = '',
} = {}) {
  const cuenta = leerCuenta(cuentaId)
  const marca = conMarca(cuenta)

  // Con una forma pedida es una sola publicación, así que el techo de cuota es
  // el de esa publicación y no el de una semana entera.
  const TECHO_DE_FORMA = { post: 1, carrusel: 5, historia: 1, cuadrado: 1 }
  const techo = TECHO_DE_FORMA[forma] ?? (posteos * 5 + historias)
  verificar(cuenta, 'planes', 1)
  verificar(cuenta, 'piezas', techo)

  const evitar = (cuenta.historial || []).slice(-8).map(h => `- ${h.tema}`).join('\n')
  const { plan, costo } = await generarPlan({ brand: marca, posteos, historias, pedido, evitar, forma })
  registrarCosto(cuenta, costo)

  const { dia } = periodo()
  const sub = etiqueta ? `${dia}-${etiqueta}`.replace(/[^\w.-]/g, '-') : dia
  const outDir = carpetaPiezas(cuentaId, sub)

  const { spec, publicaciones, pendientes, resumen: resumenPlan } = planToSpec(plan, { outDir, fotos })

  if (spec.slides.length) {
    try {
      verificar(cuenta, 'piezas', spec.slides.length)
    } catch (e) {
      guardarCuenta(cuenta)
      throw e
    }
    // Sin archivar, las placas del plan viven solo en el /tmp de la instancia
    // que las renderizó. El navegador pide las tres miniaturas a la vez, cada
    // pedido puede caer en otra instancia, y las que no tocaron la que las
    // generó dan 404: en un carrusel cargaba una sola. El render manual sí
    // archivaba; este camino quedó sin hacerlo.
    const archivos = await renderSpec({ spec, brand: marca })
    await archivarPiezas(archivos, `${cuentaId}/${sub}`)
  }

  consumir(cuenta, 'planes', 1)
  if (spec.slides.length) consumir(cuenta, 'piezas', spec.slides.length)

  cuenta.historial = [
    ...(cuenta.historial || []),
    ...publicaciones.map(p => ({ fecha: dia, tema: p.objetivo, canal: p.canal })),
  ].slice(-HISTORIAL_MAX)
  guardarCuenta(cuenta)

  // Guardar el plan en la base de datos de la cuenta
  const planRegistrado = registrarPlan(cuentaId, {
    resumen: resumenPlan,
    carpeta: outDir,
    publicaciones,
    pendientes,
    costoUSD: costo,
  })

  // Registrar cada publicación individual para el dashboard del usuario
  for (const pub of publicaciones) {
    registrarPublicacion(cuentaId, {
      tipo: pub.canal === 'historia' ? 'historia' : (pub.archivos.length > 1 ? 'carrusel' : 'feed'),
      titulo: pub.objetivo,
      archivos: pub.archivos.map(a => `/piezas/${cuentaId}/${sub}/${a}`),
      caption: pub.caption,
      hashtags: pub.hashtags,
      meta: { dia: pub.dia, planId: planRegistrado.id },
    })
  }

  registrarEventoEstadistica(cuentaId, 'plan_generado', { posteos, historias, costoUSD: costo })

  return {
    id: planRegistrado.id,
    resumen: resumenPlan,
    carpeta: outDir,
    publicaciones,
    pendientes,
    costoUSD: costo,
    estado: estadoCompleto(cuenta),
  }
}

export async function renderizarPieza(cuentaId, { canal = 'feed', placas = [], nombre = '', foto = null, caption = '', hashtags = [] }) {
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
  await archivarPiezas(archivos, `${cuentaId}/${dia}`)
  consumir(cuenta, 'piezas', placas.length)
  guardarCuenta(cuenta)

  const archivosUrls = archivos.map(a => `/piezas/${cuentaId}/${dia}/${a.file ? a.file.split('/').pop() : a}`)

  // Registrar la publicación en el historial del usuario
  const pubRegistrada = registrarPublicacion(cuentaId, {
    tipo: canal === 'historia' ? 'historia' : (total > 1 ? 'carrusel' : 'feed'),
    titulo: placas[0]?.titulo || nombre || 'Publicación manual',
    archivos: archivosUrls,
    caption: caption || placas[0]?.texto || '',
    hashtags: hashtags || [],
    meta: { placas: total, canal },
  })

  registrarEventoEstadistica(cuentaId, 'placa_renderizada', { canal, cantidad: total })

  return {
    id: pubRegistrada.id,
    carpeta: outDir,
    archivos,
    archivosUrls,
    estado: estadoCompleto(cuenta),
  }
}
