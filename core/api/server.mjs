// API HTTP + servidor de la aplicación web.
// Soporta autenticación híbrida (Tokens estáticos o Firebase ID Tokens).

import { createServer } from 'http'
import { createReadStream, existsSync, statSync, readFileSync } from 'fs'
import { resolve, extname, sep, dirname, relative, join } from 'path'
import { fileURLToPath } from 'url'
import { timingSafeEqual } from 'crypto'

import * as svc from '../service.mjs'
import * as firestore from '../store/firestore.mjs'
import { QuotaError } from '../quota/ledger.mjs'
import { DATA_DIR, esperarEscrituras } from '../store/store.mjs'
import { esServerless } from '../render/engine.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(HERE, '../..')
const WEB = join(RAIZ, 'web')
const PIEZAS = resolve(DATA_DIR, 'piezas')

const PUERTO = Number(process.env.CM_PORT || 8787)
const HOST = process.env.CM_HOST || '127.0.0.1'
const TOKEN = process.env.CM_TOKEN || null

const LIMITE_NORMAL = 2 * 1024 * 1024   // alcanza para un SVG o un plan
const LIMITE_IMAGEN = 20 * 1024 * 1024  // una foto de celular en base64

if (!TOKEN && HOST !== '127.0.0.1' && HOST !== 'localhost' && !process.env.VERCEL) {
  console.log('[Info] Servidor escuchando en red local. Token estático no configurado.')
}

export const MODULOS_WEB = new Set([
  'brand/color.mjs', 'brand/palette.mjs', 'brand/fonts.mjs', 'brand/logotipo.mjs',
  'render/formats.mjs', 'content/plantillas.mjs',
])

/* ── helpers ─────────────────────────────────────────────── */

const json = (res, code, obj) => {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS, PUT, DELETE',
  })
  res.end(body)
}

const texto = (res, code, tipo, body) => {
  res.writeHead(code, {
    'content-type': tipo,
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS, PUT, DELETE',
  })
  res.end(body)
}

export async function obtenerUsuarioAutenticado(req) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  // 1. Chequeo de token estático de entorno si está configurado
  if (TOKEN) {
    const dado = Buffer.from(token)
    const esperado = Buffer.from(TOKEN)
    if (dado.length === esperado.length && timingSafeEqual(dado, esperado)) {
      return { tipo: 'admin', uid: 'admin' }
    }
  }

  // 2. Chequeo con Firebase Admin Auth si está activo
  if (firestore.estaActivo()) {
    const decoded = await firestore.verificarTokenAuth(token)
    if (decoded) {
      return { tipo: 'firebase', uid: decoded.uid, email: decoded.email, nombre: decoded.name || decoded.email }
    }
  }

  // 3. Token de invitado: puede navegar pero no gastar API
  if (/^inv_[a-z0-9]{4,}$/.test(token)) return { tipo: 'invitado', uid: token }

  // 4. Sin token estático y sin Firebase, cualquier cadena vale como sesión.
  //    Es cómodo para trabajar en una máquina y es una puerta abierta en
  //    producción: `Bearer loquesea` entraba como el usuario "loquesea" y le
  //    leía la cuenta. Queda atado a no estar corriendo como función, así que
  //    en el server las únicas sesiones posibles son Firebase, el token de
  //    admin y el invitado —que no puede gastar API—.
  if (!TOKEN && !firestore.estaActivo() && !esServerless()) {
    return { tipo: 'local', uid: token }
  }

  return null
}

function autorizado(req) {
  if (!TOKEN) return true
  const dado = Buffer.from((req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
  const esperado = Buffer.from(TOKEN)
  return dado.length === esperado.length && timingSafeEqual(dado, esperado)
}

function leerBody(req, limite = LIMITE_NORMAL) {
  return new Promise((ok, fail) => {
    let n = 0
    const partes = []
    req.on('data', c => {
      n += c.length
      if (n > limite) { fail(new Error('el cuerpo del pedido es demasiado grande')); req.destroy(); return }
      partes.push(c)
    })
    req.on('end', () => {
      const s = Buffer.concat(partes).toString('utf8')
      if (!s) return ok({})
      try { ok(JSON.parse(s)) } catch { fail(new Error('el cuerpo no es JSON válido')) }
    })
    req.on('error', fail)
  })
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

function servirArchivo(res, base, rutaRelativa, cache = 'no-cache') {
  let abs
  try { abs = resolve(base, decodeURIComponent(rutaRelativa)) }
  catch { return json(res, 400, { error: 'ruta mal codificada' }) }

  if (abs !== base && !abs.startsWith(base + sep)) return json(res, 403, { error: 'ruta fuera de alcance' })
  if (!existsSync(abs) || !statSync(abs).isFile()) return json(res, 404, { error: 'no encontrado' })

  res.writeHead(200, {
    'content-type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream',
    'content-length': statSync(abs).size,
    'cache-control': cache,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS, PUT, DELETE',
  })
  createReadStream(abs).pipe(res)
}

const urlDePieza = ruta => '/piezas/' + relative(PIEZAS, ruta).split(sep).join('/')

/* ── ruteo ───────────────────────────────────────────────── */

/**
 * Las copias a Firestore salen sin bloquear la respuesta, pero el runtime
 * congela la instancia apenas este handler devuelve: sin esperarlas acá, una
 * escritura larga se corta a la mitad y el dato se pierde sin ruido. Es lo que
 * pasaba con las cuentas —se escribían y no llegaban— y por eso al día
 * siguiente la marca del cliente no estaba.
 */
export async function manejador(req, res) {
  try {
    return await despachar(req, res)
  } finally {
    try { await esperarEscrituras() } catch { /* ya se reportó adentro */ }
  }
}

async function despachar(req, res) {
  // Manejo de CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS, PUT, DELETE',
    })
    return res.end()
  }

  // En Vercel o proxies inversos, x-matched-path o x-now-route-matches contiene la ruta solicitada original
  let reqUrl = req.headers['x-matched-path'] || req.url || '/'
  if (reqUrl.startsWith('/api/')) reqUrl = reqUrl.replace(/^\/api/, '')
  if (reqUrl === '/api') reqUrl = '/'
  
  const url = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`)
  const partes = url.pathname.split('/').filter(Boolean)
  const m = req.method

  try {
    await firestore.asegurarInicializado()

    // Además de "está vivo", dice con qué está corriendo. Diagnosticar por qué
    // el render fallaba en producción llevó varios despliegues a ciegas: la
    // arquitectura y el runtime son justo lo que hay que mirar cuando el
    // navegador no arranca, y desde afuera no se ven.
    if (m === 'GET' && url.pathname === '/salud') {
      // Se comprueban de verdad, no se reporta que la variable esté cargada: un
      // bucket mal nombrado —los proyectos nuevos de Firebase usan
      // `.firebasestorage.app`, no `.appspot.com`— daba `almacen: true` y
      // perdía todas las placas en silencio.
      const [base, almacen] = await Promise.all([firestore.comprobarBase(), firestore.comprobarAlmacen()])
      const problemas = [base.motivo, almacen.motivo, firestore.detalleError()].filter(Boolean)
      return json(res, 200, {
        ok: true,
        firebase: base.ok,
        almacen: almacen.ok,
        ia: Boolean(process.env.GEMINI_API_KEY),
        ...(problemas.length ? { problemas } : {}),
        entorno: {
          node: process.version,
          arch: process.arch,
          plataforma: process.platform,
          serverless: esServerless(),
          region: process.env.VERCEL_REGION || null,
          // Qué está corriendo realmente. Sin esto, después de cada push hay
          // que adivinar si lo que se está probando es el código nuevo o el
          // viejo, y un arreglo que no llegó se confunde con un arreglo que no
          // funciona.
          commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
        },
      })
    }

    /* — la aplicación web estática — */
    if (m === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return servirArchivo(res, WEB, 'index.html')
    }
    if (m === 'GET' && (url.pathname === '/user-flow.html' || url.pathname === '/user-flow')) {
      return servirArchivo(res, WEB, 'user-flow.html')
    }
    if (m === 'GET' && (url.pathname === '/mapa.html' || url.pathname === '/mapa')) {
      return servirArchivo(res, WEB, 'mapa.html')
    }
    if (m === 'GET' && (url.pathname === '/logotipos.html' || url.pathname === '/logotipos' || url.pathname === '/firmas')) {
      return servirArchivo(res, WEB, 'logotipos.html')
    }

    if (m === 'GET' && (url.pathname === '/logos-visor.html' || url.pathname === '/logos-visor' || url.pathname === '/logos')) {
      return servirArchivo(res, WEB, 'logos-visor.html')
    }
    if (m === 'GET' && (url.pathname === '/ejemplos-logos-marcas.html' || url.pathname === '/ejemplos-logos-marcas' || url.pathname === '/ejemplos')) {
      return servirArchivo(res, WEB, 'ejemplos-logos-marcas.html')
    }
    if (m === 'GET' && (partes[0] === 'css' || partes[0] === 'js' || partes[0] === 'img' || partes[0] === 'capturas')) {
      return servirArchivo(res, WEB, partes.join('/'))
    }
    if (m === 'GET' && partes[0] === 'nucleo') {
      const mod = partes.slice(1).join('/')
      if (!MODULOS_WEB.has(mod)) return json(res, 404, { error: 'ese módulo no se sirve al navegador' })
      return texto(res, 200, MIME['.mjs'], readFileSync(join(RAIZ, 'core', mod), 'utf8'))
    }

    /* — archivos generados — */
    if (m === 'GET' && partes[0] === 'piezas') {
      const relativa = partes.slice(1).join('/')
      // El disco es el camino rápido y el único que hay cuando corre en una
      // máquina. Con el servidor como función, /tmp se vació entre
      // invocaciones y la placa solo está en el almacén remoto.
      const enDisco = resolve(PIEZAS, decodeURIComponent(relativa))
      if (enDisco.startsWith(PIEZAS + sep) && existsSync(enDisco)) {
        return servirArchivo(res, PIEZAS, relativa, 'private, max-age=3600')
      }
      if (firestore.hayAlmacen()) {
        const buf = await firestore.leerPieza(decodeURIComponent(relativa))
        if (buf) {
          res.writeHead(200, {
            'content-type': 'image/png',
            'content-length': buf.length,
            'cache-control': 'private, max-age=31536000',
            'access-control-allow-origin': '*',
          })
          return res.end(buf)
        }
      }
      return json(res, 404, { error: 'no encontrado' })
    }

    /* — configuración pública de Firebase para el navegador — */
    if (m === 'GET' && url.pathname === '/config/firebase') {
      return json(res, 200, {
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_APP_ID || '',
        activo: Boolean(process.env.FIREBASE_API_KEY && (process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT)),
      })
    }

    /* — autenticación OTP por email — */
    if (m === 'POST' && url.pathname === '/auth/otp/enviar') {
      const body = await leerBody(req)
      const resOtp = await svc.enviarOtp(body.email)
      return json(res, 200, resOtp)
    }

    if (m === 'POST' && url.pathname === '/auth/otp/verificar') {
      const body = await leerBody(req)
      const resVerif = await svc.verificarOtp(body.email, body.codigo, body.nombre)
      return json(res, 200, resVerif)
    }

    /* — autenticación y sincronización con cuenta Firebase — */
    if (m === 'POST' && url.pathname === '/auth/firebase-login') {
      const body = await leerBody(req)
      const { uid, email, nombre, foto } = body
      if (!uid) return json(res, 400, { error: 'Falta UID de Firebase' })

      const alta = svc.altaCuenta({
        id: uid,
        userId: uid,
        email: email || null,
        nombre: nombre || email?.split('@')[0] || 'Mi Negocio',
        foto: foto || null,
      })
      return json(res, 200, alta)
    }

    /* — de acá para abajo hay que identificarse — */
    const usuario = await obtenerUsuarioAutenticado(req)
    if (!usuario) return json(res, 401, { error: 'hace falta iniciar sesión', codigo: 'sin_sesion' })

    /* — rutas caras: solo para usuarios registrados — */
    if (usuario.tipo === 'invitado') {
      const subRuta = partes[0] === 'cuentas' && partes[1] ? partes.slice(2).join('/') : ''
      const CARAS = new Set(['temas', 'contenido', 'identidad/sugerir', 'logo', 'imagenes/banco'])
      if (CARAS.has(subRuta) || url.pathname === '/imagenes/buscar') {
        return json(res, 402, { error: 'Creá tu cuenta gratis para usar esta función', codigo: 'solo_registrados' })
      }
    }

    /* — catálogo — */
    if (m === 'GET' && url.pathname === '/catalogo') return json(res, 200, svc.catalogo())

    /* — banco de imágenes — */
    if (m === 'GET' && url.pathname === '/imagenes/buscar') {
      return json(res, 200, await svc.buscarEnBanco({
        q: url.searchParams.get('q'),
        pagina: url.searchParams.get('pagina'),
        orientacion: url.searchParams.get('orientacion') || '',
      }))
    }

    /* — catálogo de isotipos vectoriales — */
    if (m === 'GET' && url.pathname === '/logos/buscar') {
      return json(res, 200, {
        logos: await svc.buscarLogosCatalogo(url.searchParams.get('q'), Number(url.searchParams.get('limite')) || 24)
      })
    }

    /* — cuentas y dashboards — */
    if (m === 'GET' && url.pathname === '/cuentas') {
      if (usuario.tipo !== 'admin') return json(res, 403, { error: 'no disponible' })
      return json(res, 200, { cuentas: svc.listarCuentas() })
    }
    if (m === 'POST' && url.pathname === '/cuentas') {
      const cuerpo = await leerBody(req)
      // Con un id que ya existe, altaCuenta no falla: actualiza el nombre, el
      // correo y la foto de esa cuenta. Sin comparar contra quién pide,
      // cualquiera con sesión le cambia el correo a la cuenta de otro, que es
      // como se secuestra una. Se miran las dos llaves porque altaCuenta
      // resuelve `id || userId`.
      const pedido = cuerpo.id || cuerpo.userId
      // Sin traerla primero, altaCuenta no la encuentra en el disco vacío y
      // crea una nueva encima: el cliente vuelve al día siguiente y su marca
      // no está, porque la pisó su propio ingreso.
      if (pedido) await svc.hidratarCuenta(pedido)
      if (usuario.tipo !== 'admin' && pedido && pedido !== usuario.uid) {
        return json(res, 403, { error: 'esa cuenta no es tuya', codigo: 'ajena' })
      }
      return json(res, 201, svc.altaCuenta({ ...cuerpo, id: pedido || usuario.uid }))
    }

    if (partes[0] === 'cuentas' && partes[1]) {
      const id = partes[1]
      const sub = partes.slice(2).join('/')

      if (usuario.tipo !== 'admin' && usuario.uid !== id) {
        return json(res, 403, { error: 'esa cuenta no es tuya', codigo: 'ajena' })
      }

      // El disco de la función se vacía entre invocaciones y leerCuenta() —que
      // es la que usa todo el service— solo mira el disco. Sin este paso la
      // cuenta que se creó en otra invocación "no existe": se escribía a
      // Firestore y no se leía nunca de ahí. Se trae una vez y queda en /tmp
      // para las lecturas sincrónicas de abajo.
      await svc.hidratarCuenta(id)

      if (m === 'GET' && !sub) return json(res, 200, svc.estadoCuenta(id))
      if (m === 'GET' && sub === 'dashboard') return json(res, 200, svc.dashboardUsuario(id))
      if (m === 'GET' && sub === 'publicaciones') return json(res, 200, { publicaciones: svc.listarPublicaciones(id) })
      if (m === 'GET' && sub === 'planes') return json(res, 200, { planes: svc.listarPlanes(id) })
      if (m === 'GET' && sub === 'estadisticas') return json(res, 200, { estadisticas: svc.obtenerEstadisticas(id) })
      // ?refrescar=1 pide temas nuevos aunque los guardados sigan vigentes.
      if (m === 'GET' && sub === 'temas') {
        return json(res, 200, await svc.temasParaPublicar(id, {
          refrescar: url.searchParams.get('refrescar') === '1',
        }))
      }

      if (m === 'POST') {
        switch (sub) {
          case 'marca':
            return json(res, 200, svc.configurarMarca(id, await leerBody(req)))

          case 'identidad/sugerir':
            return json(res, 200, await svc.sugerirIdentidadCuenta(id, await leerBody(req)))

          case 'identidad/adoptar':
            return json(res, 200, svc.adoptarIdentidad(id, await leerBody(req)))

          case 'logo':
            return json(res, 200, await svc.proponerLogos(id))

          case 'logo/elegir':
            return json(res, 200, svc.elegirLogo(id, (await leerBody(req)).propuesta))

          case 'logo/subir':
            return json(res, 200, svc.subirLogo(id, await leerBody(req)))

          case 'previsualizar': {
            const { html, formato } = svc.previsualizar(id, await leerBody(req))
            return texto(res, 200, MIME['.html'], html)
          }

          case 'placa': {
            const r = await svc.renderizarPieza(id, await leerBody(req))
            return json(res, 200, {
              ...r,
              archivos: r.archivos.map(a => typeof a === 'string' ? a : ({ ...a, url: urlDePieza(a.file || a) })),
            })
          }

          case 'contenido':
            return json(res, 200, await svc.generarContenido(id, await leerBody(req)))

          case 'imagenes/banco': {
            const r = await svc.traerDelBanco(id, (await leerBody(req)).id)
            return json(res, 200, { ...r, url: urlDePieza(r.ruta) })
          }

          case 'imagenes/subir': {
            const r = svc.subirImagen(id, await leerBody(req, LIMITE_IMAGEN))
            return json(res, 200, { ...r, url: urlDePieza(r.ruta) })
          }

          case 'estadisticas/evento': {
            const body = await leerBody(req)
            const r = svc.registrarEventoEstadistica(id, body.evento, body.metadata)
            return json(res, 200, { ok: true, evento: r })
          }
        }
      }
    }

    json(res, 404, { error: `no hay ruta para ${m} ${url.pathname}` })
  } catch (e) {
    if (e instanceof QuotaError) return json(res, 429, { error: e.message, codigo: e.codigo, detalle: e.detalle })
    // La IA apagada no es un error del pedido: es una función que este servidor
    // no tiene prendida. 503 y el mensaje ya viene escrito para el usuario.
    if (e.codigo === 'sin_ia') return json(res, 503, { error: e.message, codigo: e.codigo })
    // Falta un paso del alta, no falló el pedido.
    if (e.codigo === 'sin_marca') return json(res, 409, { error: e.message, codigo: e.codigo })
    if (/no existe la cuenta|no encuentro|no encontrado/.test(e.message)) return json(res, 404, { error: e.message })
    if (/falta|inválid|demasiado|no es JSON|al menos|no es una imagen|pesa más|correo|código/i.test(e.message)) {
      return json(res, 400, { error: e.message })
    }
    console.error(e)
    json(res, 500, { error: e.message })
  }
}

export const server = createServer(manejador)

const esEjecutadoDirectamente = process.argv[1] && (
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url)) ||
  process.argv[1].endsWith('server.mjs')
)

if (esEjecutadoDirectamente) {
  server.listen(PUERTO, HOST, () => {
    console.log(`\nServidor web y API escuchando en http://${HOST}:${PUERTO}\n`)
  })
}
