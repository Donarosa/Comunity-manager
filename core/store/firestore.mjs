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

/**
 * ¿El bucket existe de verdad?
 *
 * hayAlmacen() solo dice que la variable está cargada. Con un nombre que no
 * existe —pasa fácil: los proyectos nuevos de Firebase usan
 * `.firebasestorage.app` y no `.appspot.com`— la subida tira, el error se
 * traga con un console.warn para no voltear el render, y la placa desaparece
 * sin que nada lo diga. Esto lo dice.
 */
export async function comprobarAlmacen() {
  if (!bucket) return { ok: false, motivo: 'sin bucket configurado' }
  try {
    const [existe] = await bucket.exists()
    return existe ? { ok: true } : { ok: false, motivo: `el bucket ${bucket.name} no existe` }
  } catch (e) {
    return { ok: false, motivo: e.message }
  }
}

/** Lo mismo para la base: que el objeto exista no prueba que se pueda leer. */
export async function comprobarBase() {
  if (!db) return { ok: false, motivo: 'sin credenciales de servicio' }
  try {
    await db.collection('cuentas').limit(1).get()
    return { ok: true }
  } catch (e) {
    return { ok: false, motivo: e.message }
  }
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

export async function eliminarCuentaDeFirestore(id) {
  if (!db) return false
  const docRef = db.collection('cuentas').doc(id)
  try {
    const subcols = await docRef.listCollections()
    for (const sub of subcols) {
      const snap = await sub.get()
      for (const d of snap.docs) {
        await d.ref.delete()
      }
    }
    await docRef.delete()
    return true
  } catch (err) {
    console.warn('[Firestore] Error eliminando cuenta:', err.message)
    throw err
  }
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

/* ── Métricas de Landing (Visitas y Clicks) ──────────────── */

export async function registrarEventoLandingEnFirestore(evento) {
  if (!db) return null
  const ref = db.collection('landing_eventos').doc()
  const datos = {
    id: ref.id,
    ...evento,
    fecha: evento.fecha || new Date().toISOString(),
  }
  await ref.set(datos)
  return datos
}

export async function obtenerEventosLandingDeFirestore(limite = 100) {
  if (!db) return []
  const snapshot = await db.collection('landing_eventos')
    .orderBy('fecha', 'desc')
    .limit(limite)
    .get()
  return snapshot.docs.map(d => d.data())
}

/* Los agregados, que es lo que muestra el panel.
 *
 * El evento suelto no alcanza: el panel no dibuja una lista, dibuja totales,
 * la serie de catorce días y el ranking de botones. Eso vivía únicamente en
 * `landing_metricas.json`, dentro de DATA_DIR — que en Vercel es `/tmp` y se
 * borra entre invocaciones. Resultado: la visita se contaba en la instancia que
 * la recibió y el panel, que caía en otra, leía un archivo que no existía y
 * mostraba cero. Acá se acumulan con `increment`, que es atómico y no depende
 * de haber leído antes: dos instancias sumando a la vez no se pisan. */

export async function acumularLandingEnFirestore(evento) {
  if (!db) return null
  const { FieldValue } = await import('firebase-admin/firestore')
  const esVisita = evento.tipo !== 'click'
  const disp = evento.dispositivo === 'mobile' ? 'mobile' : 'desktop'

  const dia = db.collection('landing_dias').doc(evento.dia)
  const global = db.collection('landing_agregado').doc('global')

  const porDia = { dia: evento.dia }
  const porTodo = {}
  if (esVisita) {
    porDia.visitas = FieldValue.increment(1)
    porDia.dispositivos = { [disp]: FieldValue.increment(1) }
    // Los únicos del día se guardan como conjunto: arrayUnion no suma dos veces
    // al mismo visitante aunque recargue la página.
    porDia.unicos = FieldValue.arrayUnion(evento.visitanteId)
    porTodo.totalVisitas = FieldValue.increment(1)
    porTodo.dispositivos = { [disp]: FieldValue.increment(1) }
  } else {
    porDia.clicks = FieldValue.increment(1)
    porTodo.totalClicks = FieldValue.increment(1)
    const id = evento.botonId || 'boton_desconocido'
    porTodo.botones = {
      [id]: {
        id,
        texto: evento.texto || id,
        seccion: evento.seccion || 'General',
        clicks: FieldValue.increment(1),
      },
    }
  }

  await Promise.all([
    dia.set(porDia, { merge: true }),
    global.set(porTodo, { merge: true }),
  ])
  return { dia: evento.dia, tipo: evento.tipo }
}

/** Los últimos `dias` documentos diarios, para la serie del panel. */
export async function obtenerDiasLandingDeFirestore(dias = 30) {
  if (!db) return []
  const snapshot = await db.collection('landing_dias')
    .orderBy('dia', 'desc')
    .limit(dias)
    .get()
  return snapshot.docs.map(d => d.data())
}

/** Los totales de siempre y el ranking de botones. */
export async function obtenerAgregadoLandingDeFirestore() {
  if (!db) return null
  const doc = await db.collection('landing_agregado').doc('global').get()
  return doc.exists ? doc.data() : null
}

/**
 * Todos los eventos de landing, paginados.
 *
 * `obtenerEventosLandingDeFirestore` corta en 100 porque alimenta la lista de
 * "últimos movimientos". Para reconstruir la historia hacen falta todos, y
 * traerlos de una sola query revienta con el tiempo: se pagina por cursor.
 */
export async function recorrerEventosLandingDeFirestore(porPagina = 500, tope = 50000) {
  if (!db) return []
  const todos = []
  let ultimo = null
  while (todos.length < tope) {
    let q = db.collection('landing_eventos').orderBy('fecha', 'asc').limit(porPagina)
    if (ultimo) q = q.startAfter(ultimo)
    const snap = await q.get()
    if (snap.empty) break
    todos.push(...snap.docs.map(d => d.data()))
    ultimo = snap.docs[snap.docs.length - 1]
    if (snap.size < porPagina) break
  }
  return todos
}

/**
 * Escribe los agregados con valores absolutos, pisando lo que hubiera.
 *
 * Es `set` sin merge a propósito: reconstruir es reemplazar. Con merge, un
 * total viejo más alto sobreviviría al arreglo y nadie se enteraría.
 */
export async function escribirAgregadosLandingEnFirestore({ dias = [], global = null }) {
  if (!db) return { dias: 0, global: false }
  let escritos = 0
  // En lotes: Firestore admite 500 operaciones por batch.
  for (let i = 0; i < dias.length; i += 400) {
    const lote = db.batch()
    for (const d of dias.slice(i, i + 400)) {
      lote.set(db.collection('landing_dias').doc(d.dia), d)
      escritos++
    }
    await lote.commit()
  }
  if (global) await db.collection('landing_agregado').doc('global').set(global)
  return { dias: escritos, global: Boolean(global) }
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
