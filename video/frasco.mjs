// El frasco de la espera, en GIF.
//
//   node video/frasco.mjs
//     → video/frasco.gif     sobre el papel de la marca
//     → video/frasco.png     APNG, con transparencia de verdad
//
//   ANCHO=320 node video/frasco.mjs   otro tamaño
//
// Dos archivos porque el GIF no sabe hacer transparencia a medias: su alfa es de
// un bit, así que el borde antialiasado del vidrio contra un fondo que no conoce
// sale recortado a dientes. Donde haga falta fondo transparente —una web, una
// presentación— va el APNG, que tiene alfa real. Pesa bastante más, y no lo
// aceptan ni Instagram ni WhatsApp: para eso está el GIF.

import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { createReadStream, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome } from '../core/render/engine.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '..')
const FPS = Number(process.env.FPS || 25)
const ANCHO = Number(process.env.ANCHO || 480)

/* La página importa el SVG del mismo módulo que usa la aplicación, y un módulo
   no se puede importar desde `file://`: el navegador lo rechaza por origen. Un
   servidor de dos líneas alcanza y evita tener el frasco escrito dos veces. */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' }
const servidor = createServer((req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  const archivo = join(RAIZ, rel)
  if (!archivo.startsWith(RAIZ) || !statSync(archivo, { throwIfNoEntry: false })?.isFile()) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] || 'application/octet-stream' })
  createReadStream(archivo).pipe(res)
})
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok))
const SITIO = `http://127.0.0.1:${servidor.address().port}`

const navegador = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--force-color-profile=srgb'],
})

/** Saca los cuadros de una vuelta entera del bucle. */
async function cuadros({ conFondo, carpeta }) {
  const pagina = await navegador.newPage()
  // El doble de resolución y después se achica: el vidrio es una curva fina y a
  // tamaño final sale dentada.
  await pagina.setViewport({ width: 512, height: 512, deviceScaleFactor: 2 })
  await pagina.goto(`${SITIO}/video/frasco.html${conFondo ? '' : '?fondo=no'}`, { waitUntil: 'networkidle0' })

  const bucle = await pagina.evaluate(() => window.DURACION)
  const n = Math.round(bucle / 1000 * FPS)
  const caja = await pagina.$('#lienzo')

  for (let i = 0; i < n; i++) {
    await pagina.evaluate(ms => window.pintar(ms), (i / FPS) * 1000)
    await caja.screenshot({
      path: join(carpeta, `${String(i).padStart(3, '0')}.png`),
      omitBackground: !conFondo,
    })
  }
  await pagina.close()
  return n
}

const ff = (...args) => {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`ffmpeg salió con ${r.status}`)
}

/* ── el GIF, sobre el papel de la marca ── */
{
  const carpeta = mkdtempSync(join(tmpdir(), 'frasco-'))
  const n = await cuadros({ conFondo: true, carpeta })
  /* Dos pasadas: primero una paleta sacada de los propios cuadros, después el
     difuminado. Con la paleta genérica el degradado del líquido sale con bandas
     y el verde de la marca se vuelve otro verde. */
  ff('-framerate', String(FPS), '-i', join(carpeta, '%03d.png'),
     '-vf', `scale=${ANCHO}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,
     '-loop', '0', join(AQUI, 'frasco.gif'))
  rmSync(carpeta, { recursive: true, force: true })
  console.log(`gif  · ${n} cuadros · ${ANCHO}px`)
}

/* ── el APNG, con alfa de verdad ── */
{
  const carpeta = mkdtempSync(join(tmpdir(), 'frasco-a-'))
  const n = await cuadros({ conFondo: false, carpeta })
  ff('-framerate', String(FPS), '-i', join(carpeta, '%03d.png'),
     '-vf', `scale=${ANCHO}:-1:flags=lanczos`,
     '-c:v', 'apng', '-plays', '0', '-pix_fmt', 'rgba',
     '-f', 'apng', join(AQUI, 'frasco.png'))
  rmSync(carpeta, { recursive: true, force: true })
  console.log(`apng · ${n} cuadros · ${ANCHO}px · con transparencia`)
}

await navegador.close()
servidor.close()
