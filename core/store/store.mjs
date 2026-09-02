// Persistencia con arquitectura híbrida:
// Si Firebase Firestore está conectado (vía variables de entorno), persiste
// allí. Si no, guarda en archivos JSON locales bajo data/cuentas/.
//
// Esta separación permite probar el sistema de inmediato en modo local,
// y que al conectar Firebase los datos pasen a la nube automáticamente.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'fs'
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
