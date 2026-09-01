// Servicio de Autenticación de Usuario (Firebase Auth + OTP por Email + Fallback Local).

import { inicializarFirebaseClient } from './firebase-config.js'

const LLAVE_USUARIO = 'cm.auth.usuario'
const LLAVE_TOKEN = 'cm.auth.token'

let usuarioActual = null
let suscriptores = []

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

/* ── Login con Google ────────────────────────────────────── */

export async function loginConGoogle() {
  const fb = await inicializarFirebaseClient()

  if (fb.listo && fb.auth) {
    const { signInWithPopup, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    const resultado = await signInWithPopup(fb.auth, provider)
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

  guardarSesion(null, null)
}
