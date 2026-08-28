// Conexión y persistencia con Firebase Admin / Cloud Firestore.
// Si las credenciales de Firebase no están configuradas, el sistema
// delega de forma transparente al almacenamiento local sin romper la ejecución.

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

let adminApp = null
let db = null
let auth = null
let inicializado = false

/**
 * Inicializa Firebase Admin SDK si las credenciales existen en el entorno.
 */
export async function inicializarFirebase() {
  if (inicializado) return { db, auth, activo: Boolean(db) }
  inicializado = true

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  // Limpieza de saltos de línea en la clave privada si viene con \n escapado
  if (privateKey && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  let credencial = null

  try {
    const admin = await import('firebase-admin')
    const cert = admin.default?.credential?.cert || admin.credential?.cert
    const applicationDefault = admin.default?.credential?.applicationDefault || admin.credential?.applicationDefault
    const initializeApp = admin.default?.initializeApp || admin.initializeApp
    const getFirestore = admin.default?.firestore || admin.firestore
    const getAuth = admin.default?.auth || admin.auth

    if (credsPath && existsSync(resolve(credsPath))) {
      const archivoCreds = JSON.parse(readFileSync(resolve(credsPath), 'utf8'))
      credencial = cert(archivoCreds)
    } else if (projectId && clientEmail && privateKey) {
      credencial = cert({
        projectId,
        clientEmail,
        privateKey,
      })
    } else if (projectId) {
      try {
        credencial = applicationDefault()
      } catch {
        credencial = null
      }
    }

    if (credencial) {
      adminApp = initializeApp({
        credential: credencial,
        projectId,
      })
      db = getFirestore()
      auth = getAuth()
      console.log(`[Firebase] Conectado exitosamente al proyecto: ${projectId}`)
    } else {
      console.log('[Firebase] Variables de Firebase no detectadas. Operando en modo de persistencia local.')
    }
  } catch (err) {
    console.warn('[Firebase] No se pudo inicializar Firebase Admin:', err.message)
  }

  return { db, auth, activo: Boolean(db) }
}

// Intentamos inicializar al cargar el módulo
inicializarFirebase()

export const estaActivo = () => Boolean(db)

/* ── Cuentas y Usuarios ───────────────────────────────────── */

export async function crearCuentaEnFirestore(cuenta) {
  if (!db) return null
  const ref = db.collection('cuentas').doc(cuenta.id)
  await ref.set({
    ...cuenta,
    actualizada: new Date().toISOString(),
  })
  return cuenta
}

export async function leerCuentaDeFirestore(id) {
  if (!db) return null
  const doc = await db.collection('cuentas').doc(id).get()
  if (!doc.exists) return null
  return doc.data()
}

export async function guardarCuentaEnFirestore(cuenta) {
  if (!db) return null
  const ref = db.collection('cuentas').doc(cuenta.id)
  await ref.set({
    ...cuenta,
    actualizada: new Date().toISOString(),
  }, { merge: true })
  return cuenta
}

export async function listarCuentasDeFirestore() {
  if (!db) return []
  const snapshot = await db.collection('cuentas').get()
  return snapshot.docs.map(d => {
    const c = d.data()
    return { id: c.id, nombre: c.nombre, plan: c.plan, marca: c.marca?.nombre || null, creada: c.creada }
  })
}

/* ── Publicaciones y Piezas ──────────────────────────────── */

export async function guardarPublicacionEnFirestore(cuentaId, publicacion) {
  if (!db) return null
  const col = db.collection('cuentas').doc(cuentaId).collection('publicaciones')
  const ref = publicacion.id ? col.doc(publicacion.id) : col.doc()
  const datos = {
    id: ref.id,
    cuentaId,
    fecha: new Date().toISOString(),
    ...publicacion,
  }
  await ref.set(datos)
  return datos
}

export async function listarPublicacionesDeFirestore(cuentaId, limite = 50) {
  if (!db) return []
  const snapshot = await db.collection('cuentas').doc(cuentaId)
    .collection('publicaciones')
    .orderBy('fecha', 'desc')
    .limit(limite)
    .get()
  return snapshot.docs.map(d => d.data())
}

/* ── Planes de Contenido ─────────────────────────────────── */

export async function guardarPlanEnFirestore(cuentaId, plan) {
  if (!db) return null
  const col = db.collection('cuentas').doc(cuentaId).collection('planes')
  const ref = plan.id ? col.doc(plan.id) : col.doc()
  const datos = {
    id: ref.id,
    cuentaId,
    fecha: new Date().toISOString(),
    ...plan,
  }
  await ref.set(datos)
  return datos
}

export async function listarPlanesDeFirestore(cuentaId, limite = 20) {
  if (!db) return []
  const snapshot = await db.collection('cuentas').doc(cuentaId)
    .collection('planes')
    .orderBy('fecha', 'desc')
    .limit(limite)
    .get()
  return snapshot.docs.map(d => d.data())
}

/* ── Estadísticas e Interacciones ───────────────────────── */

export async function registrarEstadisticaEnFirestore(cuentaId, evento, metadata = {}) {
  if (!db) return null
  const ref = db.collection('cuentas').doc(cuentaId).collection('estadisticas').doc()
  const datos = {
    id: ref.id,
    evento,
    metadata,
    fecha: new Date().toISOString(),
  }
  await ref.set(datos)
  return datos
}

export async function obtenerEstadisticasDeFirestore(cuentaId) {
  if (!db) return []
  const snapshot = await db.collection('cuentas').doc(cuentaId)
    .collection('estadisticas')
    .orderBy('fecha', 'desc')
    .limit(100)
    .get()
  return snapshot.docs.map(d => d.data())
}

/* ── Códigos OTP (Login por Email) ───────────────────────── */

const OTP_COLLECTION = 'otp_codigos'

export async function guardarCodigoOTP(email, codigo, expiraEnMs = 10 * 60 * 1000) {
  const normEmail = String(email).trim().toLowerCase()
  const expira = Date.now() + expiraEnMs
  if (db) {
    await db.collection(OTP_COLLECTION).doc(normEmail).set({
      email: normEmail,
      codigo,
      expira,
      intentos: 0,
      creado: new Date().toISOString(),
    })
  }
  return { email: normEmail, codigo, expira }
}

export async function verificarCodigoOTP(email, codigo) {
  const normEmail = String(email).trim().toLowerCase()
  if (db) {
    const ref = db.collection(OTP_COLLECTION).doc(normEmail)
    const doc = await ref.get()
    if (!doc.exists) return { ok: false, error: 'No se encontró un código para este correo o ya expiró' }
    const data = doc.data()
    if (Date.now() > data.expira) {
      await ref.delete()
      return { ok: false, error: 'El código ha expirado. Solicitá uno nuevo.' }
    }
    if (data.intentos >= 5) {
      await ref.delete()
      return { ok: false, error: 'Demasiados intentos fallidos. Solicitá un nuevo código.' }
    }
    if (String(data.codigo).trim() !== String(codigo).trim()) {
      await ref.update({ intentos: (data.intentos || 0) + 1 })
      return { ok: false, error: 'Código incorrecto. Revisá el número ingresado.' }
    }
    // Código válido -> consumirlo
    await ref.delete()
    return { ok: true }
  }
  return null // Sin DB, se maneja en fallback local
}

/* ── Verificación de Token de Firebase Auth ─────────────── */

export async function verificarTokenAuth(idToken) {
  if (!auth || !idToken) return null
  try {
    const decoded = await auth.verifyIdToken(idToken)
    return decoded
  } catch (err) {
    console.warn('[Firebase Auth] Error validando token:', err.message)
    return null
  }
}
