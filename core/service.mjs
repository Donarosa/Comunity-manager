// Casos de uso. Es la única capa que combina marca + IA + cuota + render.
// La API HTTP y la CLI son cáscaras finitas alrededor de esto.
//
// Regla que vale para todo el archivo: la cuota se VERIFICA antes de llamar a
// la API de IA y se CONSUME después de que el trabajo salió bien.

import {
  crearCuenta, leerCuenta, leerCuentaAsync, guardarCuenta, listarCuentas, carpetaPiezas,
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
    throw new Error('La cuenta todavía no tiene marca cargada. Configurala primero.')
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

export function dashboardUsuario(id) {
  const cuenta = leerCuenta(id)
  const publicaciones = listarPublicaciones(id)
  const planes = listarPlanes(id)
  const estadisticas = obtenerEstadisticas(id)
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
  const placaPreview = {
    ...placa,
    titulo: (placa?.titulo != null && placa.titulo !== '') ? placa.titulo : (
      placa?.plantilla === 'frase' ? 'Tu frase principal' :
      placa?.plantilla === 'cierre' ? '¿Hablamos?' :
      placa?.plantilla === 'pasos' ? 'Los pasos' :
      placa?.plantilla === 'oferta' ? 'Tu producto o servicio' :
      'Escribí tu título'
    ),
    pasos: (placa?.pasos && placa.pasos.length > 0) ? placa.pasos : [
      { numero: '1', etiqueta: 'Paso 1', titulo: 'Primer paso', detalle: 'Explicación del paso' },
      { numero: '2', etiqueta: 'Paso 2', titulo: 'Segundo paso', detalle: 'Explicación del paso' },
      { numero: '3', etiqueta: 'Paso 3', titulo: 'Tercer paso', detalle: 'Explicación del paso' },
    ],
  }
  const slide = placaToSlide(placaPreview, { nombre: 'preview', idx: placa?.idx || '', formato, foto: placa?.foto || null })

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
  leerCuenta(cuentaId)
  return guardarDelBanco(cuentaId, id)
}

export function subirImagen(cuentaId, datos) {
  leerCuenta(cuentaId)
  return guardarSubida(cuentaId, datos)
}

/* ── contenido ───────────────────────────────────────────── */

export async function generarContenido(cuentaId, {
  posteos = 3, historias = 2, pedido = '', fotos = {}, etiqueta = '',
} = {}) {
  const cuenta = leerCuenta(cuentaId)
  const marca = conMarca(cuenta)

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
      guardarCuenta(cuenta)
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
