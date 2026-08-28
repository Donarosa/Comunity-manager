// Configuración y cliente de Firebase Web SDK v10 (ESM).
// Carga dinámicamente Firebase Auth y Firestore sin requerir bundlers.

let firebaseApp = null
let authInstance = null
let dbInstance = null
let configActiva = null

/**
 * Consulta la configuración de Firebase desde el servidor o localStorage.
 */
export async function obtenerConfiguracionFirebase() {
  if (configActiva) return configActiva

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
export async function inicializarFirebaseClient() {
  if (firebaseApp) return { app: firebaseApp, auth: authInstance, db: dbInstance, listo: true }

  const config = await obtenerConfiguracionFirebase()
  if (!config || !config.apiKey) {
    return { app: null, auth: null, db: null, listo: false, modo: 'demo_local' }
  }

  try {
    // Importamos dinámicamente Firebase SDK oficial
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js')
    const { getAuth, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')

    const apps = getApps()
    firebaseApp = apps.length ? apps[0] : initializeApp(config)
    authInstance = getAuth(firebaseApp)
    dbInstance = getFirestore(firebaseApp)

    console.log('[Firebase Web] Inicializado correctamente con proyecto:', config.projectId)
    return { app: firebaseApp, auth: authInstance, db: dbInstance, GoogleAuthProvider, listo: true, modo: 'firebase' }
  } catch (err) {
    console.warn('[Firebase Web] No se pudo cargar el SDK de Firebase:', err.message)
    return { app: null, auth: null, db: null, listo: false, modo: 'demo_local' }
  }
}
