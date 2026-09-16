// Configuración y cliente de Firebase Web SDK v10 (ESM).
// Carga dinámicamente Firebase Auth y Firestore sin requerir bundlers.

let firebaseApp = null
let authInstance = null
let dbInstance = null
let configActiva = null

/* Lo que ya se está haciendo, no lo que ya se hizo.
 *
 * Las dos funciones de abajo se llaman desde varios lugares a la vez —cuatro
 * en `auth.js`— y las dos guardaban el resultado recién al terminar. Mientras
 * la primera estaba esperando, la segunda veía el cajón vacío y arrancaba de
 * nuevo: cuatro pedidos de `/config/firebase` y otras tantas inicializaciones
 * del SDK por cada carga de la página. Se recuerda la promesa desde el primer
 * llamado, así el segundo se cuelga de la que ya está en vuelo.
 *
 * Es exactamente el mismo error que tenía el arranque de Firebase en el
 * servidor, y da el mismo tipo de resultado: todos creen que no hay nada
 * porque preguntaron antes de tiempo. */
let promesaConfig = null
let promesaCliente = null

/**
 * Consulta la configuración de Firebase desde el servidor o localStorage.
 */
export function obtenerConfiguracionFirebase() {
  if (configActiva) return Promise.resolve(configActiva)
  if (!promesaConfig) promesaConfig = buscarConfiguracion()
  return promesaConfig
}

async function buscarConfiguracion() {
  // 1. Verificar si hay configuración inyectada en window
  if (window.__FIREBASE_CONFIG__ && window.__FIREBASE_CONFIG__.apiKey) {
    configActiva = window.__FIREBASE_CONFIG__
    return configActiva
  }

  // 2. Consultar al endpoint backend /config/firebase
  try {
    const res = await fetch('/config/firebase')
    if (res.ok) {
      const data = await res.json()
      if (data.apiKey && (data.projectId || data.authDomain)) {
        configActiva = data
        return configActiva
      }
    }
  } catch { /* modo offline */ }

  // 3. Chequear si el usuario guardó credenciales locales en localStorage
  try {
    const local = localStorage.getItem('cm.firebase.config')
    if (local) {
      configActiva = JSON.parse(local)
      return configActiva
    }
  } catch { /* ignora */ }

  return null
}

/**
 * Inicializa los módulos de Firebase si la configuración está disponible.
 */
export function inicializarFirebaseClient() {
  if (firebaseApp) return Promise.resolve({ app: firebaseApp, auth: authInstance, db: dbInstance, listo: true })
  if (!promesaCliente) {
    // Si falla, se olvida: un corte de red no tiene por qué dejar la sesión
    // rota para siempre; el próximo llamado vuelve a intentar.
    promesaCliente = arrancarCliente().catch(e => { promesaCliente = null; throw e })
  }
  return promesaCliente
}

async function arrancarCliente() {
  const config = await obtenerConfiguracionFirebase()
  if (!config || !config.apiKey) {
    return { app: null, auth: null, db: null, listo: false, modo: 'demo_local' }
  }

  try {
    // Importamos dinámicamente Firebase SDK oficial
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js')
    const { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')

    const apps = getApps()
    firebaseApp = apps.length ? apps[0] : initializeApp(config)
    authInstance = getAuth(firebaseApp)
    if (setPersistence && browserLocalPersistence) {
      await setPersistence(authInstance, browserLocalPersistence).catch(err => {
        console.warn('[Firebase Auth] No se pudo fijar persistencia local:', err?.message)
      })
    }
    dbInstance = getFirestore(firebaseApp)

    console.log('[Firebase Web] Inicializado correctamente con proyecto:', config.projectId)
    return { app: firebaseApp, auth: authInstance, db: dbInstance, GoogleAuthProvider, listo: true, modo: 'firebase' }
  } catch (err) {
    console.warn('[Firebase Web] No se pudo cargar el SDK de Firebase:', err.message)
    return { app: null, auth: null, db: null, listo: false, modo: 'demo_local' }
  }
}
