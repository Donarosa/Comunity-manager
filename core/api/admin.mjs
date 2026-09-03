// Panel de Administración — Backend
// Autenticación propia del admin con JWT nativo (sin dependencias externas).
// Contraseña almacenada como hash scrypt en variable de entorno ADMIN_PASSWORD_HASH.

import { createHmac, scryptSync, timingSafeEqual, randomBytes } from 'crypto'

const ADMIN_EMAIL     = (process.env.ADMIN_EMAIL || '').toLowerCase().trim()
const PASSWORD_HASH   = process.env.ADMIN_PASSWORD_HASH || ''
const JWT_SECRET      = process.env.ADMIN_JWT_SECRET || ''
const TOKEN_TTL_MS    = 8 * 60 * 60 * 1000  // 8 horas

/* ── JWT minimalista (HS256, sin dependencias) ────────────── */

function b64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

function crearToken(payload) {
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body    = b64url(JSON.stringify(payload))
  const firma   = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  return `${header}.${body}.${b64url(firma)}`
}

function verificarToken(token) {
  if (!token || !JWT_SECRET) return null
  const partes = token.split('.')
  if (partes.length !== 3) return null
  const [header, body, firmaRecibida] = partes
  const firmaEsperada = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  try {
    if (!timingSafeEqual(Buffer.from(firmaRecibida, 'base64url'), firmaEsperada)) return null
  } catch {
    return null
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (payload.exp && Date.now() > payload.exp) return null
  return payload
}

/* ── Hash de contraseña con scrypt ───────────────────────── */

/**
 * Genera un hash para guardar en ADMIN_PASSWORD_HASH.
 * Formato: salt:hash (ambos en hex)
 */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verificarPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  let derivado
  try {
    derivado = scryptSync(password, salt, 64)
  } catch {
    return false
  }
  const esperado = Buffer.from(hash, 'hex')
  if (derivado.length !== esperado.length) return false
  return timingSafeEqual(derivado, esperado)
}

/* ── Middleware de autenticación de admin ─────────────────── */

export function autenticarAdmin(req) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  const payload = verificarToken(token)
  if (!payload || payload.rol !== 'admin') return null
  return payload
}

/* ── Handlers de rutas ───────────────────────────────────── */

/**
 * POST /admin/login
 * Body: { email, password }
 */
export async function handleLogin(req, leerBody, json) {
  const body = await leerBody(req)
  const email = (body.email || '').toLowerCase().trim()
  const password = body.password || ''

  // Verificaciones en tiempo constante para evitar timing attacks
  const emailOk = ADMIN_EMAIL && email === ADMIN_EMAIL
  const passOk  = PASSWORD_HASH ? verificarPassword(password, PASSWORD_HASH) : false

  if (!ADMIN_EMAIL || !PASSWORD_HASH || !JWT_SECRET) {
    return json(401, {
      error: 'Panel de admin no configurado. Definí ADMIN_EMAIL, ADMIN_PASSWORD_HASH y ADMIN_JWT_SECRET en el entorno.',
      codigo: 'admin_no_configurado',
    })
  }

  if (!emailOk || !passOk) {
    return json(401, { error: 'Credenciales incorrectas', codigo: 'credenciales_invalidas' })
  }

  const token = crearToken({
    rol: 'admin',
    email,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  })

  return json(200, {
    ok: true,
    token,
    expira: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  })
}

/**
 * GET /admin/usuarios
 * Lista todos los usuarios con métricas resumidas.
 */
export async function handleListarUsuarios(svc, firestore, json) {
  const usuarios = await listarTodosLosUsuarios(svc, firestore)
  return json(200, { usuarios, total: usuarios.length })
}

/**
 * GET /admin/usuarios/:id
 * Detalle completo de un usuario.
 */
export async function handleDetalleUsuario(id, svc, json) {
  try {
    await svc.hidratarCuenta(id)
    const detalle = await svc.dashboardUsuario(id)
    return json(200, detalle)
  } catch (e) {
    if (/no existe|no encuentro|no encontrado/i.test(e.message)) {
      return json(404, { error: 'Usuario no encontrado' })
    }
    throw e
  }
}

/**
 * POST /admin/usuarios/:id/estado
 * Body: { estado: 'activa' | 'pausada' }
 */
export async function handleCambiarEstado(id, req, leerBody, svc, json) {
  const body = await leerBody(req)
  const nuevoEstado = body.estado

  if (!['activa', 'pausada'].includes(nuevoEstado)) {
    return json(400, { error: 'estado debe ser "activa" o "pausada"' })
  }

  try {
    await svc.hidratarCuenta(id)
    const resultado = svc.cambiarEstadoUsuario(id, nuevoEstado)
    return json(200, resultado)
  } catch (e) {
    if (/no existe|no encuentro|no encontrado/i.test(e.message)) {
      return json(404, { error: 'Usuario no encontrado' })
    }
    throw e
  }
}

/**
 * DELETE /admin/usuarios/:id
 * Elimina una cuenta y sus recursos.
 */
export async function handleEliminarUsuario(id, svc, json) {
  try {
    await svc.eliminarCuentaUsuario(id)
    return json(200, { ok: true, id, eliminado: true })
  } catch (e) {
    if (/no existe|no encuentro|no encontrado/i.test(e.message)) {
      return json(404, { error: 'Usuario no encontrado' })
    }
    throw e
  }
}

/**
 * GET /admin/analitica
 * Métricas globales de la plataforma.
 */
export async function handleAnalitica(svc, firestore, json) {
  const usuarios = await listarTodosLosUsuarios(svc, firestore)

  const ahora = new Date()
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

  let totalPlacasMes = 0
  let totalPlacasHistorico = 0
  let usuariosActivos = 0
  let usuariosPausados = 0
  let usuariosConMarca = 0
  let totalCostoMesUSD = 0
  let totalCostoHistoricoUSD = 0
  const actividadReciente = []

  for (const u of usuarios) {
    if (u.estado === 'activa') usuariosActivos++
    else usuariosPausados++
    if (u.tieneMarca) usuariosConMarca++
    totalPlacasMes += u.placasMes || 0
    totalPlacasHistorico += u.totalPlacas || 0
    totalCostoMesUSD += u.costoMesUSD || 0
    totalCostoHistoricoUSD += u.costoTotalUSD || 0
    if (u.ultimaActividad) {
      actividadReciente.push({ id: u.id, nombre: u.nombre, email: u.email, fecha: u.ultimaActividad })
    }
  }

  actividadReciente.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  return json(200, {
    resumen: {
      totalUsuarios: usuarios.length,
      usuariosActivos,
      usuariosPausados,
      usuariosConMarca,
      totalPlacasMes,
      totalPlacasHistorico,
      totalCostoMesUSD: Number(totalCostoMesUSD.toFixed(4)),
      totalCostoHistoricoUSD: Number(totalCostoHistoricoUSD.toFixed(4)),
      iaActiva: Boolean(process.env.GEMINI_API_KEY),
      mes: mesActual,
    },
    actividadReciente: actividadReciente.slice(0, 10),
  })
}

/* ── Helpers internos ────────────────────────────────────── */

async function listarTodosLosUsuarios(svc, firestore) {
  const ahora = new Date()
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

  // Intentar Firestore primero (producción), luego local
  let cuentasBase = []
  if (firestore.estaActivo()) {
    cuentasBase = await firestore.listarCuentasDeFirestore()
  } else {
    cuentasBase = svc.listarCuentas()
  }

  // Enriquecer con datos de consumo
  const usuarios = []
  for (const c of cuentasBase) {
    try {
      // hidratarCuenta trae la cuenta completa desde Firestore (con consumo real)
      await svc.hidratarCuenta(c.id)
      const rawCuenta = svc.leerCuenta(c.id)
      const estadoRes = svc.estadoCuenta(c.id)
      const cuenta = estadoRes.cuenta
      const estadoQuota = estadoRes.estado

      // estadoQuota.usado.mes contiene { piezas, planes, logos, costoUSD }
      // estadoQuota.valor contiene { placasMes, placasTotal, ... }
      const usadoMes = estadoQuota?.usado?.mes || {}
      const consumoHist = rawCuenta?.consumo || {}
      const costoTotalUSD = Number(Object.values(consumoHist).reduce((acc, m) => acc + (m.costoUSD || 0), 0).toFixed(4))
      const costoMesUSD = Number((usadoMes.costoUSD || estadoQuota?.costoMesUSD || 0).toFixed(4))

      usuarios.push({
        id: c.id,
        nombre: cuenta.nombre || c.nombre || '(sin nombre)',
        email: cuenta.email || c.email || '(sin email)',
        plan: cuenta.plan || c.plan || 'unico',
        estado: cuenta.estado || 'activa',
        tieneMarca: Boolean(cuenta.marca),
        nombreComercio: cuenta.marca?.nombre || null,
        rubro: null,
        creada: c.creada || null,
        placasMes: usadoMes.piezas || estadoQuota?.valor?.placasMes || 0,
        planesMes: usadoMes.planes || 0,
        totalPlacas: estadoQuota?.valor?.placasTotal || 0,
        costoMesUSD,
        costoTotalUSD,
        ultimaActividad: c.actualizada || c.creada || null,
      })
    } catch {
      usuarios.push({
        id: c.id,
        nombre: c.nombre || '(sin nombre)',
        email: c.email || '(sin email)',
        plan: c.plan || 'unico',
        estado: 'activa',
        tieneMarca: Boolean(c.marca),
        nombreComercio: c.marca || null,
        creada: c.creada || null,
        placasMes: 0,
        planesMes: 0,
        totalPlacas: 0,
        costoMesUSD: 0,
        costoTotalUSD: 0,
        ultimaActividad: null,
      })
    }
  }

  return usuarios
}
