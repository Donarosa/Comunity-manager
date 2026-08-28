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

  // Fallback demo interactivo (si Firebase no tiene keys en .env todavía)
  // Permite simular el inicio con cuenta de Google con un nombre/email
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

export function iniciarComoInvitado(nombre = 'Mi Negocio') {
  const idGuardado = localStorage.getItem('cm.invitado.id') || ('inv_' + Math.random().toString(36).slice(2, 8))
  localStorage.setItem('cm.invitado.id', idGuardado)

  const usuario = {
    id: idGuardado,
    email: 'demo@invitado.local',
    nombre,
    foto: null,
    proveedor: 'invitado',
    metodo: 'invitado',
    esInvitado: true,
  }

  guardarSesion(usuario, idGuardado)
  return usuario
}

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
