// API HTTP + servidor de la aplicación web. Sin framework: son veinte rutas y
// una dependencia menos que auditar.
//
//   npm run web                       → http://127.0.0.1:8787
//   CM_TOKEN=... CM_HOST=0.0.0.0 npm run web
//
// Autenticación: un token en Authorization: Bearer. Si no hay token definido,
// el server solo acepta conexiones locales — es más fácil olvidarse de poner el
// token que acordarse, y una API sin auth escuchando en 0.0.0.0 gasta la cuenta
// de API de otro.

import { createServer } from 'http'
import { createReadStream, existsSync, statSync, readFileSync } from 'fs'
import { resolve, extname, sep, dirname, relative, join } from 'path'
import { fileURLToPath } from 'url'
import { timingSafeEqual } from 'crypto'

import * as svc from '../service.mjs'
import { QuotaError } from '../quota/ledger.mjs'
import { DATA_DIR } from '../store/store.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(HERE, '../..')
const WEB = join(RAIZ, 'web')
const PIEZAS = resolve(DATA_DIR, 'piezas')

const PUERTO = Number(process.env.CM_PORT || 8787)
const HOST = process.env.CM_HOST || '127.0.0.1'
const TOKEN = process.env.CM_TOKEN || null

const LIMITE_NORMAL = 2 * 1024 * 1024   // alcanza para un SVG o un plan
const LIMITE_IMAGEN = 20 * 1024 * 1024  // una foto de celular en base64

if (!TOKEN && HOST !== '127.0.0.1' && HOST !== 'localhost') {
  console.error('Definí CM_TOKEN antes de escuchar fuera de localhost.')
  process.exit(1)
}

// Módulos del núcleo que el navegador importa directamente. Son los que no
// tocan Node: así el cálculo de color de la web es exactamente el mismo código
// que usa el render, y no dos implementaciones que se van separando.
const MODULOS_WEB = new Set(['brand/color.mjs', 'brand/palette.mjs', 'brand/fonts.mjs', 'render/formats.mjs'])

/* ── helpers ─────────────────────────────────────────────── */

const json = (res, code, obj) => {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) })
  res.end(body)
}

const texto = (res, code, tipo, body) => {
  res.writeHead(code, { 'content-type': tipo, 'content-length': Buffer.byteLength(body) })
  res.end(body)
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

/** Sirve un archivo comprobando que no se salga de la carpeta permitida. */
function servirArchivo(res, base, rutaRelativa, cache = 'no-cache') {
  let abs
  // Se decodifica primero y se valida después: si se validara sobre la ruta
  // codificada, un "%2e%2e" pasaría el control y se volvería ".." recién al
  // tocar el disco.
  try { abs = resolve(base, decodeURIComponent(rutaRelativa)) }
  catch { return json(res, 400, { error: 'ruta mal codificada' }) }

  if (abs !== base && !abs.startsWith(base + sep)) return json(res, 403, { error: 'ruta fuera de alcance' })
  if (!existsSync(abs) || !statSync(abs).isFile()) return json(res, 404, { error: 'no encontrado' })

  res.writeHead(200, {
    'content-type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream',
    'content-length': statSync(abs).size,
    'cache-control': cache,
  })
  createReadStream(abs).pipe(res)
}

/** Una ruta absoluta de data/piezas → la URL con la que el navegador la pide. */
const urlDePieza = ruta => '/piezas/' + relative(PIEZAS, ruta).split(sep).join('/')

/* ── ruteo ───────────────────────────────────────────────── */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const partes = url.pathname.split('/').filter(Boolean)
  const m = req.method

  try {
    if (m === 'GET' && url.pathname === '/salud') return json(res, 200, { ok: true })

    /* — la aplicación web — */
    if (m === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return servirArchivo(res, WEB, 'index.html')
    }
    if (m === 'GET' && (partes[0] === 'css' || partes[0] === 'js' || partes[0] === 'img')) {
      return servirArchivo(res, WEB, partes.join('/'))
    }
    if (m === 'GET' && partes[0] === 'nucleo') {
      const mod = partes.slice(1).join('/')
      if (!MODULOS_WEB.has(mod)) return json(res, 404, { error: 'ese módulo no se sirve al navegador' })
      return texto(res, 200, MIME['.mjs'], readFileSync(join(RAIZ, 'core', mod), 'utf8'))
    }

    if (!autorizado(req)) return json(res, 401, { error: 'token inválido o ausente' })

    /* — archivos generados — */
    if (m === 'GET' && partes[0] === 'piezas') {
      return servirArchivo(res, PIEZAS, partes.slice(1).join('/'), 'private, max-age=3600')
    }

    /* — catálogo y cuentas — */
    if (m === 'GET' && url.pathname === '/catalogo') return json(res, 200, svc.catalogo())
    if (m === 'GET' && url.pathname === '/cuentas') return json(res, 200, { cuentas: svc.listarCuentas() })
    if (m === 'POST' && url.pathname === '/cuentas') return json(res, 201, svc.altaCuenta(await leerBody(req)))

    /* — banco de imágenes (no depende de una cuenta) — */
    if (m === 'GET' && url.pathname === '/imagenes/buscar') {
      return json(res, 200, await svc.buscarEnBanco({
        q: url.searchParams.get('q'),
        pagina: url.searchParams.get('pagina'),
        orientacion: url.searchParams.get('orientacion') || '',
      }))
    }

    if (partes[0] === 'cuentas' && partes[1]) {
      const id = partes[1]
      const sub = partes.slice(2).join('/')

      if (m === 'GET' && !sub) return json(res, 200, svc.estadoCuenta(id))

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
            return json(res, 200, { ...r, archivos: r.archivos.map(a => ({ ...a, url: urlDePieza(a.file) })) })
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
        }
      }
    }

    json(res, 404, { error: `no hay ruta para ${m} ${url.pathname}` })
  } catch (e) {
    if (e instanceof QuotaError) return json(res, 429, { error: e.message, codigo: e.codigo, detalle: e.detalle })
    if (/no existe la cuenta|no encuentro|no encontrado/.test(e.message)) return json(res, 404, { error: e.message })
    if (/falta|inválid|demasiado|no es JSON|al menos|no es una imagen|pesa más/i.test(e.message)) {
      return json(res, 400, { error: e.message })
    }
    console.error(e)
    json(res, 500, { error: e.message })
  }
})

server.listen(PUERTO, HOST, () => {
  console.log(`\n  Community manager en http://${HOST}:${PUERTO}`)
  console.log(`  ${TOKEN ? 'auth: Bearer token activo' : 'auth: sin token (solo localhost)'}`)

  // Qué bancos de imágenes hay conectados. Esto es información para quien opera
  // el servicio, no para el cliente final: a una panadería no se le pide que
  // consiga una clave de API.
  const { activos, faltantes } = svc.catalogo().bancos
  console.log(`  imágenes: ${activos.map(b => b.nombre).join(', ')}`)
  if (faltantes.length) {
    console.log(`  sin conectar — mejoran mucho la calidad de las fotos:`)
    for (const f of faltantes) console.log(`    ${f.clave.padEnd(20)} ${f.alta}`)
  }
  console.log()
})
