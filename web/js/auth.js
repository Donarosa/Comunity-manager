// Servicio de Autenticación de Usuario (Firebase Auth + OTP por Email + Fallback Local).

import { inicializarFirebaseClient } from './firebase-config.js'

const LLAVE_USUARIO = 'cm.auth.usuario'
const LLAVE_TOKEN = 'cm.auth.token'

let usuarioActual = null
let suscriptores = []
let authListenerIniciado = false

// Cargar usuario inicial desde localStorage
try {
  const guardado = localStorage.getItem(LLAVE_USUARIO)
  if (guardado) usuarioActual = JSON.parse(guardado)
} catch { /* ignora */ }

function notificarCambio() {
  suscriptores.forEach(fn => fn(usuarioActual))
}

/**
 * Registra un callback reactivo que se ejecuta cada vez que el estado de auth cambia.
 */
export function enCambioDeAuth(callback) {
  suscriptores.push(callback)
  callback(usuarioActual)
  return () => {
    suscriptores = suscriptores.filter(fn => fn !== callback)
  }
}

export function obtenerUsuario() {
  return usuarioActual
}

export function obtenerToken() {
  return localStorage.getItem(LLAVE_TOKEN) || usuarioActual?.id || null
}

/**
 * Obtiene un token válido de Firebase Auth (refrescándolo automáticamente si expiró)
 * o desde localStorage como fallback.
 */
export async function obtenerTokenValido(forzarRefresh = false) {
  try {
    const fb = await inicializarFirebaseClient()
    if (fb?.listo && fb?.auth?.currentUser) {
      const token = await fb.auth.currentUser.getIdToken(forzarRefresh)
      if (token) {
        localStorage.setItem(LLAVE_TOKEN, token)
        return token
      }
    }
  } catch (err) {
    console.warn('[auth] No se pudo refrescar token de Firebase:', err?.message)
  }
  return localStorage.getItem(LLAVE_TOKEN) || usuarioActual?.id || null
}

/**
 * Intenta forzar la renovación del token de Firebase Auth.
 */
export async function refrescarTokenFirebase(forzar = true) {
  return await obtenerTokenValido(forzar)
}

function guardarSesion(usuario, token = null) {
  usuarioActual = usuario
  if (usuario) {
    localStorage.setItem(LLAVE_USUARIO, JSON.stringify(usuario))
    if (token) localStorage.setItem(LLAVE_TOKEN, token)
  } else {
    localStorage.removeItem(LLAVE_USUARIO)
    localStorage.removeItem(LLAVE_TOKEN)
  }
  notificarCambio()
}

/**
 * Mantiene la sesión de Firebase sincronizada en tiempo real.
 * Si el usuario cierra el navegador y regresa, Firebase Auth restaura la sesión
 * desde IndexedDB/localStorage y renueva el token automáticamente.
 */
async function iniciarListenerFirebaseAuth() {
  if (authListenerIniciado) return
  authListenerIniciado = true

  try {
    const fb = await inicializarFirebaseClient()
    if (fb.listo && fb.auth) {
      const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
      onAuthStateChanged(fb.auth, async (fbUser) => {
        if (fbUser) {
          const token = await fbUser.getIdToken()
          const usuario = {
            id: fbUser.uid,
            email: fbUser.email,
            nombre: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
            foto: fbUser.photoURL || null,
            proveedor: 'google',
            metodo: 'firebase',
          }
          guardarSesion(usuario, token)
        } else {
          // Solo si el usuario estaba registrado como Firebase y se confirma la desautenticación
          if (usuarioActual && usuarioActual.metodo === 'firebase') {
            guardarSesion(null, null)
          }
        }
      })
    }
  } catch (err) {
    console.warn('[auth] Error iniciando sincronización de Firebase Auth:', err?.message)
  }
}

// Iniciar listener en segundo plano
iniciarListenerFirebaseAuth().catch(() => {})

/* ── Login con Google ────────────────────────────────────── */

/**
 * Los errores de Firebase vienen como "Firebase: Error (auth/algo)". Eso no le
 * dice nada a alguien que solo quiere entrar a hacer una placa, y lo peor es
 * que la mitad de las veces no hay ninguna falla: cerró la ventanita, o el
 * navegador la bloqueó. Un mensaje que nombra lo que pasó y qué hacer evita el
 * "no anda" que en realidad era "hacé clic de nuevo".
 */
const MENSAJES_AUTH = {
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar. Probá de nuevo.',
  'auth/cancelled-popup-request': 'Quedó una ventana de ingreso abierta. Cerrala y probá de nuevo.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio y probá de nuevo.',
  'auth/network-request-failed': 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
  'auth/too-many-requests': 'Demasiados intentos seguidos. Esperá un minuto y volvé a probar.',
  'auth/user-disabled': 'Esa cuenta está deshabilitada. Escribinos si creés que es un error.',
  // Este no lo puede resolver quien lo ve: es el sitio el que falta autorizar
  // en Firebase. Se dice sin pedirle nada, porque no hay nada que pueda hacer.
  'auth/unauthorized-domain': 'El ingreso todavía no está habilitado para este sitio. Ya estamos viéndolo — probá en un rato.',
  'auth/operation-not-allowed': 'El ingreso con Google no está habilitado. Ya estamos viéndolo.',
}

function mensajeDeAuth(e) {
  return MENSAJES_AUTH[e?.code] || 'No pudimos completar el ingreso. Probá de nuevo en un momento.'
}

export async function loginConGoogle() {
  const fb = await inicializarFirebaseClient()

  if (fb.listo && fb.auth) {
    const { signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    
    // Asegurar persistencia local duradera (sobrevive cierres de pestaña y navegador)
    if (setPersistence && browserLocalPersistence) {
      await setPersistence(fb.auth, browserLocalPersistence).catch(() => {})
    }

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    let resultado
    try {
      resultado = await signInWithPopup(fb.auth, provider)
    } catch (e) {
      // El código original queda en consola para poder diagnosticar; a la
      // pantalla va la versión que se entiende.
      console.warn('[auth]', e?.code, e?.message)
      const err = new Error(mensajeDeAuth(e))
      err.code = e?.code
      throw err
    }
    const fbUser = resultado.user
    const token = await fbUser.getIdToken()

    const usuario = {
      id: fbUser.uid,
      email: fbUser.email,
      nombre: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
      foto: fbUser.photoURL || null,
      proveedor: 'google',
      metodo: 'firebase',
    }

    guardarSesion(usuario, token)
    return usuario
  }

  // Sin Firebase configurado no hay forma de entrar con Google, y fingir que
  // sí la hay es peor que no tener el botón: la sesión falsa que se armaba acá
  // abajo cerraba el modal como si hubiera funcionado y recién fallaba en el
  // clic siguiente, con un 401 que no explica nada. El servidor no puede
  // validar un token que nadie emitió.
  //
  // En una máquina el atajo sigue siendo útil para trabajar sin credenciales,
  // así que se conserva ahí y solo ahí.
  const enMaquina = ['localhost', '127.0.0.1', ''].includes(location.hostname)
  if (!enMaquina) {
    throw new Error('El ingreso no está disponible en este momento. Volvé a intentar en unos minutos.')
  }

  const nombrePrompt = 'Demo Usuario Google'
  const emailPrompt = 'usuario.google@ejemplo.com'
  const demoUid = 'goog_' + Math.random().toString(36).slice(2, 11)

  const usuarioDemo = {
    id: demoUid,
    email: emailPrompt,
    nombre: nombrePrompt,
    foto: 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(nombrePrompt),
    proveedor: 'google',
    metodo: 'demo',
  }

  guardarSesion(usuarioDemo, 'demo_token_' + demoUid)
  return usuarioDemo
}

/* ── Login con OTP por Correo ────────────────────────────── */

export async function solicitarCodigoOtp(email) {
  const res = await fetch('/auth/otp/enviar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  const datos = await res.json()
  if (!res.ok) throw new Error(datos.error || 'No se pudo enviar el código')
  return datos
}

export async function validarCodigoOtp(email, codigo, nombre = null) {
  const res = await fetch('/auth/otp/verificar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, codigo, nombre }),
  })

  const datos = await res.json()
  if (!res.ok) throw new Error(datos.error || 'Código incorrecto')

  const usuario = {
    id: datos.cuenta.id,
    email: datos.cuenta.email || email,
    nombre: datos.cuenta.nombre || email.split('@')[0],
    foto: datos.cuenta.foto || null,
    proveedor: 'email_otp',
    metodo: 'otp',
  }

  guardarSesion(usuario, usuario.id)
  return { usuario, cuenta: datos.cuenta, estado: datos.estado }
}

/* ── Cierre de sesión y Modo Invitado ────────────────────── */

export async function cerrarSesion() {
  try {
    const fb = await inicializarFirebaseClient()
    if (fb.listo && fb.auth) {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
      await signOut(fb.auth)
    }
  } catch { /* ignora */ }

  localStorage.removeItem('cm.cuenta')
  localStorage.removeItem('cm.invitado.id')
  guardarSesion(null, null)
}
