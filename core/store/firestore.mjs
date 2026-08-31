// Conexión y persistencia con Firebase Admin / Cloud Firestore.
// Si las credenciales de Firebase no están configuradas, el sistema
// delega de forma transparente al almacenamiento local sin romper la ejecución.

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

let adminApp = null
let db = null
let auth = null
let bucket = null
let inicializado = false
let errorInicializacion = null
let promesaInit = null

/**
 * Inicializa Firebase Admin SDK si las credenciales existen en el entorno.
 */
export async function inicializarFirebase() {
  if (inicializado) return { db, auth, activo: Boolean(db), error: errorInicializacion }
  inicializado = true

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || (clientEmail ? clientEmail.split('@')[1]?.split('.')[0] : null)
  let privateKey = process.env.FIREBASE_PRIVATE_KEY
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (privateKey) {
    // Quitar comillas envolventes si las tiene
    privateKey = privateKey.trim().replace(/^["']|["']$/g, '')
    // Reemplazar saltos de línea literales escapados
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }
  }

  let credencial = null

  try {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    const { getAuth } = await import('firebase-admin/auth')
    const { getStorage } = await import('firebase-admin/storage')

    if (credsPath && existsSync(resolve(credsPath))) {
      try {
        const archivoCreds = JSON.parse(readFileSync(resolve(credsPath), 'utf8'))
        credencial = cert(archivoCreds)
      } catch (err) {
        errorInicializacion = `Error archivo creds: ${err.message}`
        console.warn('[Firebase] No se pudo leer GOOGLE_APPLICATION_CREDENTIALS:', err.message)
      }
    } else if (projectId && clientEmail && privateKey) {
      try {
        credencial = cert({
          projectId,
          clientEmail,
          privateKey,
        })
      } catch (err) {
        errorInicializacion = `Error certificado: ${err.message}`
        console.warn('[Firebase] Claves de servicio inválidas:', err.message)
      }
    } else {
      const faltantes = []
      if (!projectId) faltantes.push('projectId')
      if (!clientEmail) faltantes.push('FIREBASE_CLIENT_EMAIL')
      if (!privateKey) faltantes.push('FIREBASE_PRIVATE_KEY')
      if (faltantes.length) {
        errorInicializacion = `Faltan variables: ${faltantes.join(', ')}`
      }
    }

    if (credencial) {
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
        || (projectId ? `${projectId}.appspot.com` : undefined)

      const apps = getApps()
      adminApp = apps.length > 0 ? apps[0] : initializeApp({
        credential: credencial,
        projectId,
        ...(storageBucket ? { storageBucket } : {}),
      })
      db = getFirestore(adminApp)
      auth = getAuth(adminApp)

      if (storageBucket) {
        try {
          bucket = getStorage(adminApp).bucket()
          console.log(`[Firebase] Almacenamiento de placas en: ${storageBucket}`)
        } catch (err) {
          console.warn('[Firebase] Storage no disponible:', err.message)
        }
      }
      console.log(`[Firebase] Conectado exitosamente al proyecto: ${projectId}`)
    } else {
      console.log('[Firebase] Backend operando con SDK Web / almacenamiento local.')
    }
  } catch (err) {
    errorInicializacion = `Error general: ${err.message}`
    console.warn('[Firebase] Inicialización omitida:', err.message)
  }

  return { db, auth, activo: Boolean(db), error: errorInicializacion }
}

export async function asegurarInicializado() {
  if (!promesaInit) {
    promesaInit = inicializarFirebase()
  }
  return await promesaInit
}

// Inicialización diferida segura
promesaInit = inicializarFirebase().catch(() => {})

export const estaActivo = () => Boolean(db)
export const detalleError = () => errorInicializacion

/* ── Placas ───────────────────────────────────────────────
 *
 * Los PNG no pueden quedarse en el disco cuando el servidor corre como función:
 * el filesystem es de solo lectura salvo /tmp, y /tmp se borra entre
 * invocaciones. Con el bucket configurado, la placa se sube apenas se
 * renderiza y lo que se guarda en la cuenta es su ruta remota.
 */

export const hayAlmacen = () => Boolean(bucket)

/** Sube un PNG y devuelve la ruta con la que después se lo pide. */
export async function subirPieza(ruta, contenido) {
  if (!bucket) return null
  const archivo = bucket.file(`piezas/${ruta}`)
  await archivo.save(contenido, {
    contentType: 'image/png',
    // Las placas son inmutables: el nombre lleva un id único por render.
    metadata: { cacheControl: 'private, max-age=31536000' },
    resumable: false,
  })
  return ruta
}

/**
 * Un enlace temporal para servir la placa.
 *
 * Firmado y no público: las placas son de un cliente y no tienen por qué
 * quedar accesibles para cualquiera que adivine la ruta.
 */
export async function urlDePieza(ruta, minutos = 60) {
  if (!bucket) return null
  const [url] = await bucket.file(`piezas/${ruta}`).getSignedUrl({
    action: 'read',
    expires: Date.now() + minutos * 60 * 1000,
  })
  return url
}

export async function leerPieza(ruta) {
  if (!bucket) return null
  const archivo = bucket.file(`piezas/${ruta}`)
  const [existe] = await archivo.exists()
  if (!existe) return null
  const [buf] = await archivo.download()
  return buf
}

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
