// Persistencia con arquitectura híbrida:
// Si Firebase Firestore está conectado (vía variables de entorno), persiste
// allí. Si no, guarda en archivos JSON locales bajo data/cuentas/.
//
// Esta separación permite probar el sistema de inmediato en modo local,
// y que al conectar Firebase los datos pasen a la nube automáticamente.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import * as firestore from './firestore.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = process.env.CM_DATA || (process.env.VERCEL ? '/tmp/cm-data' : resolve(HERE, '../../data'))
const CUENTAS = join(DATA_DIR, 'cuentas')
const PUBLICACIONES = join(DATA_DIR, 'publicaciones')
const PLANES = join(DATA_DIR, 'planes')
const ESTADISTICAS = join(DATA_DIR, 'estadisticas')

function asegurarDirs() {
  mkdirSync(CUENTAS, { recursive: true })
  mkdirSync(PUBLICACIONES, { recursive: true })
  mkdirSync(PLANES, { recursive: true })
  mkdirSync(ESTADISTICAS, { recursive: true })
}

const archivoCuenta = id => join(CUENTAS, `${id}.json`)
const archivoPubs = id => join(PUBLICACIONES, `${id}.json`)
const archivoPlanes = id => join(PLANES, `${id}.json`)
const archivoStats = id => join(ESTADISTICAS, `${id}.json`)
const archivoLanding = () => join(DATA_DIR, 'landing_metricas.json')

function escribir(ruta, obj) {
  const tmp = `${ruta}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(obj, null, 2))
  renameSync(tmp, ruta)
}

function leerJsonSeguro(ruta, defecto = null) {
  try {
    if (existsSync(ruta)) return JSON.parse(readFileSync(ruta, 'utf8'))
  } catch { /* ignora */ }
  return defecto
}

const idValido = id => typeof id === 'string' && /^[a-zA-Z0-9_.-]{1,128}$/.test(id)

/* ── Cuentas ─────────────────────────────────────────────── */

export function crearCuenta({ id, nombre, email, plan = 'unico', foto = null, userId = null }) {
  asegurarDirs()
  const cuentaId = id || (userId || randomUUID())
  const cuenta = {
    id: cuentaId,
    userId: userId || cuentaId,
    nombre: nombre || email?.split('@')[0] || 'Mi negocio',
    email: email || null,
    foto: foto || null,
    plan,
    estado: 'activa',
    creada: new Date().toISOString(),
    marca: null,
    consumo: {},   // { "2026-08": { piezas: 12, planes: 2, logos: 1, costoUSD: 0.31 } }
    diario: {},    // { "2026-08-14": { piezas: 6, planes: 1 } }
    historial: [], // últimos temas publicados, para no repetir
  }

  escribir(archivoCuenta(cuenta.id), cuenta)

  if (firestore.estaActivo()) {
    enSegundoPlano(firestore.crearCuentaEnFirestore(cuenta).catch(err =>
      console.warn('[Firestore] Error guardando cuenta:', err.message)
    ))
  }

  return cuenta
}

/* ── escrituras en vuelo ──────────────────────────────────
 *
 * Las copias a Firestore no bloquean la respuesta: el usuario no tiene por qué
 * esperar a que sincronice para ver su placa. Pero como función, largarlas y
 * olvidarlas es perderlas: el runtime congela la instancia cuando el handler
 * termina, y una promesa sin dueño se corta a la mitad. Se anotan acá y el
 * servidor las espera antes de devolver el control.
 */
const enVuelo = new Set()

function enSegundoPlano(promesa) {
  const p = promesa.finally(() => enVuelo.delete(p))
  enVuelo.add(p)
  return p
}

/** Esperar lo que quedó sincronizando. La llama el handler, al final. */
export async function esperarEscrituras() {
  while (enVuelo.size) await Promise.allSettled([...enVuelo])
}

export function leerCuenta(id) {
  if (!idValido(id)) throw new Error('id de cuenta inválido')
  
  // Lectura local inmediata
  const ruta = archivoCuenta(id)
  if (existsSync(ruta)) {
    return JSON.parse(readFileSync(ruta, 'utf8'))
  }

  throw new Error(`no existe la cuenta ${id}`)
}

export async function leerCuentaAsync(id) {
  if (!idValido(id)) throw new Error('id de cuenta inválido')

  if (firestore.estaActivo()) {
    try {
      const remota = await firestore.leerCuentaDeFirestore(id)
      if (remota) {
        asegurarDirs()
        escribir(archivoCuenta(id), remota)
        return remota
      }
    } catch (err) {
      console.warn('[Firestore] Error leyendo cuenta:', err.message)
    }
  }

  return leerCuenta(id)
}

export function guardarCuenta(cuenta) {
  if (!idValido(cuenta?.id)) throw new Error('id de cuenta inválido')
  asegurarDirs()
  cuenta.actualizada = new Date().toISOString()
  escribir(archivoCuenta(cuenta.id), cuenta)

  if (firestore.estaActivo()) {
    enSegundoPlano(firestore.guardarCuentaEnFirestore(cuenta).catch(err =>
      console.warn('[Firestore] Error sincronizando cuenta en Firestore:', err.message)
    ))
  }

  return cuenta
}

export function eliminarCuenta(id) {
  if (!idValido(id)) throw new Error('id de cuenta inválido')
  asegurarDirs()
  const rutas = [archivoCuenta(id), archivoPubs(id), archivoPlanes(id), archivoStats(id)]
  for (const r of rutas) {
    if (existsSync(r)) {
      try { unlinkSync(r) } catch { /* ignore */ }
    }
  }
  return true
}

export async function eliminarCuentaAsync(id) {
  eliminarCuenta(id)
  if (firestore.estaActivo()) {
    await firestore.eliminarCuentaDeFirestore(id)
  }
  return true
}

/**
 * Todas las cuentas del sistema, para el panel de administración.
 *
 * Leyendo el disco solo se ven las que esta instancia atendió desde que
 * arrancó: el panel mostraba dos o tres clientes de los que hubiera. Es una
 * lista corta y se consulta poco, así que sale de Firestore directo.
 */
export async function listarCuentasAsync() {
  asegurarDirs()
  if (!firestore.estaActivo()) return listarCuentas()
  try {
    const remotas = await firestore.listarCuentasDeFirestore()
    if (remotas?.length) return remotas
  } catch (err) {
    console.warn('[Firestore] Error listando cuentas:', err.message)
  }
  return listarCuentas()
}

export function listarCuentas() {
  asegurarDirs()
  return readdirSync(CUENTAS)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const c = JSON.parse(readFileSync(join(CUENTAS, f), 'utf8'))
        return {
          id: c.id,
          nombre: c.nombre,
          email: c.email,
          plan: c.plan,
          marca: c.marca?.nombre || null,
          creada: c.creada,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

/* ── Publicaciones e Historial de Piezas ─────────────────── */

export function registrarPublicacion(cuentaId, datos) {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  asegurarDirs()

  const item = {
    id: datos.id || randomUUID(),
    cuentaId,
    fecha: new Date().toISOString(),
    tipo: datos.tipo || 'feed', // feed, historia, carrusel
    titulo: datos.titulo || 'Publicación',
    archivos: datos.archivos || [],
    caption: datos.caption || '',
    hashtags: datos.hashtags || [],
    interacciones: datos.interacciones || { descargas: 1, compartidos: 0, vistas: 1 },
    meta: datos.meta || {},
  }

  const ruta = archivoPubs(cuentaId)
  const lista = leerJsonSeguro(ruta, [])
  lista.unshift(item)
  escribir(ruta, lista.slice(0, 100)) // guarda las últimas 100

  if (firestore.estaActivo()) {
    enSegundoPlano(firestore.guardarPublicacionEnFirestore(cuentaId, item).catch(err =>
      console.warn('[Firestore] Error guardando publicación:', err.message)
    ))
  }

  return item
}

export function listarPublicaciones(cuentaId) {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  asegurarDirs()
  return leerJsonSeguro(archivoPubs(cuentaId), [])
}

/**
 * Traer las publicaciones de Firestore al disco de la función.
 *
 * Mismo caso que las cuentas: se escribían y no se leían nunca de ahí, así que
 * el historial se vaciaba solo cuando la instancia se reciclaba. Lo que el
 * cliente escribió y guardó no puede depender de qué máquina le toque.
 */
export async function listarPublicacionesAsync(cuentaId) {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  asegurarDirs()
  if (!firestore.estaActivo()) return listarPublicaciones(cuentaId)

  try {
    const remotas = await firestore.listarPublicacionesDeFirestore(cuentaId)
    if (remotas?.length) {
      escribir(archivoPubs(cuentaId), remotas.slice(0, 100))
      return remotas
    }
  } catch (err) {
    console.warn('[Firestore] Error leyendo publicaciones:', err.message)
  }
  return listarPublicaciones(cuentaId)
}

/**
 * Cambiar el texto de una publicación ya guardada.
 *
 * El texto que arma el modelo es un borrador: le sobra una palabra, le falta el
 * horario, dice algo que ese negocio no hace. Publicarlo sin poder tocarlo
 * obliga a copiarlo a otro lado para corregirlo, y ahí se pierde.
 */
export async function actualizarPublicacion(cuentaId, pubId, cambios) {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  const lista = await listarPublicacionesAsync(cuentaId)
  const item = lista.find(p => p.id === pubId)
  if (!item) throw new Error('no encontrado: esa publicación no existe')

  if (typeof cambios.caption === 'string') item.caption = cambios.caption
  if (Array.isArray(cambios.hashtags)) item.hashtags = cambios.hashtags
  item.editada = new Date().toISOString()

  escribir(archivoPubs(cuentaId), lista)
  if (firestore.estaActivo()) {
    enSegundoPlano(firestore.guardarPublicacionEnFirestore(cuentaId, item).catch(err =>
      console.warn('[Firestore] Error guardando la edición:', err.message)
    ))
  }
  return item
}

/* ── Planes de Contenido ─────────────────────────────────── */

export function registrarPlan(cuentaId, plan) {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  asegurarDirs()

  const item = {
    id: plan.id || randomUUID(),
    cuentaId,
    fecha: new Date().toISOString(),
    resumen: plan.resumen || '',
    publicaciones: plan.publicaciones || [],
    carpeta: plan.carpeta || '',
    pendientes: plan.pendientes || [],
  }

  const ruta = archivoPlanes(cuentaId)
  const lista = leerJsonSeguro(ruta, [])
  lista.unshift(item)
  escribir(ruta, lista.slice(0, 50))

  if (firestore.estaActivo()) {
    enSegundoPlano(firestore.guardarPlanEnFirestore(cuentaId, item).catch(err =>
      console.warn('[Firestore] Error guardando plan en Firestore:', err.message)
    ))
  }

  return item
}

export async function listarPlanesAsync(cuentaId) {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  asegurarDirs()
  if (!firestore.estaActivo()) return listarPlanes(cuentaId)
  try {
    const remotos = await firestore.listarPlanesDeFirestore(cuentaId)
    if (remotos?.length) {
      escribir(archivoPlanes(cuentaId), remotos.slice(0, 50))
      return remotos
    }
  } catch (err) {
    console.warn('[Firestore] Error leyendo planes:', err.message)
  }
  return listarPlanes(cuentaId)
}

export function listarPlanes(cuentaId) {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  asegurarDirs()
  return leerJsonSeguro(archivoPlanes(cuentaId), [])
}

/* ── Estadísticas e Interacciones ───────────────────────── */

export function registrarEventoEstadistica(cuentaId, evento, metadata = {}) {
  if (!idValido(cuentaId)) return
  asegurarDirs()

  const item = {
    id: randomUUID(),
    evento,
    metadata,
    fecha: new Date().toISOString(),
  }

  const ruta = archivoStats(cuentaId)
  const lista = leerJsonSeguro(ruta, [])
  lista.unshift(item)
  escribir(ruta, lista.slice(0, 200))

  if (firestore.estaActivo()) {
    enSegundoPlano(firestore.registrarEstadisticaEnFirestore(cuentaId, evento, metadata).catch(() => {}))
  }

  return item
}

export async function obtenerEstadisticasAsync(cuentaId) {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  asegurarDirs()
  if (!firestore.estaActivo()) return obtenerEstadisticas(cuentaId)
  try {
    const remotas = await firestore.obtenerEstadisticasDeFirestore(cuentaId)
    if (remotas?.length) {
      escribir(archivoStats(cuentaId), remotas.slice(0, 200))
      return remotas
    }
  } catch (err) {
    console.warn('[Firestore] Error leyendo estadísticas:', err.message)
  }
  return obtenerEstadisticas(cuentaId)
}

export function obtenerEstadisticas(cuentaId) {
  if (!idValido(cuentaId)) return []
  asegurarDirs()
  return leerJsonSeguro(archivoStats(cuentaId), [])
}

/* ── Métricas y Analítica de la Landing (Visitas y Clicks) ─ */

export function registrarEventoLanding({
  tipo = 'visita',
  visitanteId = null,
  sessionId = null,
  dispositivo = 'desktop',
  botonId = null,
  texto = null,
  seccion = null,
  path = '/',
  referrer = '',
} = {}) {
  asegurarDirs()
  const fecha = new Date().toISOString()
  const dia = fecha.slice(0, 10)
  const normTipo = tipo === 'click' ? 'click' : 'visita'
  const normDisp = dispositivo === 'mobile' ? 'mobile' : 'desktop'
  const vId = visitanteId ? String(visitanteId).slice(0, 64) : randomUUID()
  const sId = sessionId ? String(sessionId).slice(0, 64) : null

  const ruta = archivoLanding()
  const datos = leerJsonSeguro(ruta, {
    totalVisitas: 0,
    totalClicks: 0,
    dispositivos: { mobile: 0, desktop: 0 },
    porDia: {},
    clicksPorBoton: {},
    eventos: [],
  })

  // Asegurar estructura
  datos.porDia = datos.porDia || {}
  datos.clicksPorBoton = datos.clicksPorBoton || {}
  datos.dispositivos = datos.dispositivos || { mobile: 0, desktop: 0 }
  datos.eventos = datos.eventos || []

  if (!datos.porDia[dia]) {
    datos.porDia[dia] = { visitas: 0, unicos: [], clicks: 0, dispositivos: { mobile: 0, desktop: 0 } }
  }
  const diaActual = datos.porDia[dia]
  diaActual.unicos = Array.isArray(diaActual.unicos) ? diaActual.unicos : []
  diaActual.dispositivos = diaActual.dispositivos || { mobile: 0, desktop: 0 }

  const eventoItem = {
    id: randomUUID(),
    tipo: normTipo,
    fecha,
    dia,
    visitanteId: vId,
    sessionId: sId,
    dispositivo: normDisp,
    path: String(path || '/').slice(0, 100),
  }

  if (normTipo === 'visita') {
    datos.totalVisitas = (datos.totalVisitas || 0) + 1
    diaActual.visitas = (diaActual.visitas || 0) + 1
    if (!diaActual.unicos.includes(vId)) {
      diaActual.unicos.push(vId)
    }
    datos.dispositivos[normDisp] = (datos.dispositivos[normDisp] || 0) + 1
    diaActual.dispositivos[normDisp] = (diaActual.dispositivos[normDisp] || 0) + 1
    if (referrer) eventoItem.referrer = String(referrer).slice(0, 200)
  } else if (normTipo === 'click') {
    datos.totalClicks = (datos.totalClicks || 0) + 1
    diaActual.clicks = (diaActual.clicks || 0) + 1
    const bId = botonId ? String(botonId).slice(0, 64) : 'boton_desconocido'
    const bTexto = texto ? String(texto).slice(0, 100) : bId
    const bSeccion = seccion ? String(seccion).slice(0, 50) : 'General'

    eventoItem.botonId = bId
    eventoItem.texto = bTexto
    eventoItem.seccion = bSeccion

    if (!datos.clicksPorBoton[bId]) {
      datos.clicksPorBoton[bId] = { id: bId, texto: bTexto, seccion: bSeccion, clicks: 0 }
    }
    datos.clicksPorBoton[bId].clicks = (datos.clicksPorBoton[bId].clicks || 0) + 1
    if (bTexto) datos.clicksPorBoton[bId].texto = bTexto
    if (bSeccion) datos.clicksPorBoton[bId].seccion = bSeccion
  }

  datos.eventos.unshift(eventoItem)
  if (datos.eventos.length > 200) {
    datos.eventos = datos.eventos.slice(0, 200)
  }

  escribir(ruta, datos)

  if (firestore.estaActivo()) {
    enSegundoPlano(firestore.registrarEventoLandingEnFirestore(eventoItem).catch(() => {}))
  }

  return eventoItem
}

export async function obtenerMetricasLanding() {
  asegurarDirs()
  const ruta = archivoLanding()
  const datos = leerJsonSeguro(ruta, {
    totalVisitas: 0,
    totalClicks: 0,
    dispositivos: { mobile: 0, desktop: 0 },
    porDia: {},
    clicksPorBoton: {},
    eventos: [],
  })

  if (firestore.estaActivo()) {
    try {
      const remotos = await firestore.obtenerEventosLandingDeFirestore(100)
      if (remotos?.length && !datos.eventos?.length) {
        datos.eventos = remotos
      }
    } catch (err) {
      console.warn('[Firestore] Error leyendo eventos de landing:', err.message)
    }
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const porDia = datos.porDia || {}
  const clicksPorBotonObj = datos.clicksPorBoton || {}
  const dispositivos = datos.dispositivos || { mobile: 0, desktop: 0 }

  // Calcular visitantes únicos totales
  const todosUnicos = new Set()
  for (const k of Object.keys(porDia)) {
    const unicosDelDia = Array.isArray(porDia[k].unicos) ? porDia[k].unicos : []
    unicosDelDia.forEach(u => todosUnicos.add(u))
  }
  const totalUnicos = todosUnicos.size

  // Métricas de hoy
  const hoyData = porDia[hoy] || { visitas: 0, unicos: [], clicks: 0 }
  const visitasHoy = hoyData.visitas || 0
  const unicosHoy = Array.isArray(hoyData.unicos) ? hoyData.unicos.length : 0
  const clicksHoy = hoyData.clicks || 0
  const ctrHoy = visitasHoy > 0 ? Number(((clicksHoy / visitasHoy) * 100).toFixed(1)) : 0

  // Métricas de últimos 7 días
  let visitas7Dias = 0
  let clicks7Dias = 0
  const setUnicos7Dias = new Set()
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    if (porDia[d]) {
      visitas7Dias += porDia[d].visitas || 0
      clicks7Dias += porDia[d].clicks || 0
      if (Array.isArray(porDia[d].unicos)) {
        porDia[d].unicos.forEach(u => setUnicos7Dias.add(u))
      }
    }
  }

  // Serie diaria de los últimos 14 días (cronológica: más antiguo -> hoy)
  const dias = []
  const NOMBRES_DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dStr = d.toISOString().slice(0, 10)
    const diaObj = porDia[dStr] || { visitas: 0, unicos: [], clicks: 0 }
    const v = diaObj.visitas || 0
    const u = Array.isArray(diaObj.unicos) ? diaObj.unicos.length : 0
    const c = diaObj.clicks || 0
    const ctr = v > 0 ? Number(((c / v) * 100).toFixed(1)) : 0
    dias.push({
      fecha: dStr,
      fechaCorta: `${d.getDate()}/${d.getMonth() + 1}`,
      diaNombre: NOMBRES_DIAS[d.getDay()],
      visitas: v,
      unicos: u,
      clicks: c,
      ctr,
    })
  }

  // Lista de clicks por botón ordenada por cantidad descendente
  const totalClicks = datos.totalClicks || 0
  const clicksPorBoton = Object.values(clicksPorBotonObj)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .map(b => ({
      id: b.id,
      texto: b.texto || b.id,
      seccion: b.seccion || 'General',
      clicks: b.clicks || 0,
      pct: totalClicks > 0 ? Number(((b.clicks / totalClicks) * 100).toFixed(1)) : 0,
    }))

  // Dispositivos y porcentajes
  const totalDisp = (dispositivos.mobile || 0) + (dispositivos.desktop || 0)
  const pctMobile = totalDisp > 0 ? Math.round(((dispositivos.mobile || 0) / totalDisp) * 100) : 0
  const pctDesktop = totalDisp > 0 ? 100 - pctMobile : 0

  const totalVisitas = datos.totalVisitas || 0
  const ctrTotal = totalVisitas > 0 ? Number(((totalClicks / totalVisitas) * 100).toFixed(1)) : 0

  return {
    resumen: {
      totalVisitas,
      visitasHoy,
      visitas7Dias,
      totalUnicos,
      unicosHoy,
      unicos7Dias: setUnicos7Dias.size,
      totalClicks,
      clicksHoy,
      clicks7Dias,
      ctrTotal,
      ctrHoy,
      dispositivos: {
        mobile: dispositivos.mobile || 0,
        desktop: dispositivos.desktop || 0,
        pctMobile,
        pctDesktop,
      },
    },
    dias,
    clicksPorBoton,
    eventosRecientes: (datos.eventos || []).slice(0, 30),
  }
}

/* ── Carpeta de Piezas ───────────────────────────────────── */

export function carpetaPiezas(cuentaId, sub = '') {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  const d = join(DATA_DIR, 'piezas', cuentaId, sub)
  mkdirSync(d, { recursive: true })
  return d
}

/* ── Almacén local de Códigos OTP en memoria ─────────────── */

const codigosOtpLocales = new Map()

export function guardarCodigoOtpLocal(email, codigo, expiraEnMs = 10 * 60 * 1000) {
  const normEmail = String(email).trim().toLowerCase()
  codigosOtpLocales.set(normEmail, {
    codigo: String(codigo).trim(),
    expira: Date.now() + expiraEnMs,
    intentos: 0,
  })
}

export function verificarCodigoOtpLocal(email, codigo) {
  const normEmail = String(email).trim().toLowerCase()
  const reg = codigosOtpLocales.get(normEmail)
  if (!reg) return { ok: false, error: 'No se solicitó ningún código para este email o ya expiró.' }
  if (Date.now() > reg.expira) {
    codigosOtpLocales.delete(normEmail)
    return { ok: false, error: 'El código expiró. Solicitá uno nuevo.' }
  }
  if (reg.intentos >= 5) {
    codigosOtpLocales.delete(normEmail)
    return { ok: false, error: 'Demasiados intentos fallidos. Solicitá un nuevo código.' }
  }
  if (reg.codigo !== String(codigo).trim()) {
    reg.intentos++
    return { ok: false, error: 'Código incorrecto. Revisá el número ingresado.' }
  }
  codigosOtpLocales.delete(normEmail)
  return { ok: true }
}
