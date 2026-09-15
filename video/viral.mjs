// El comercial viral, de la página al archivo.
//
//   npm run web                     (para recapturar el flujo, si hace falta)
//   node video/capturar-flujo.mjs   las pantallas de la aplicación
//   node video/piezas-demo.mjs      las placas que muestra
//   node video/viral.mjs            → video/viral.mp4
//   PAGINA=storyboard.html node video/viral.mjs   → video/storyboard.mp4
//
//   DESDE=9000 HASTA=19000 node video/viral.mjs    solo el tramo del flujo
//
// Se sirve por HTTP y no por `file://` porque la página lee `flujo.json`, y un
// módulo no puede pedir un archivo local: el navegador lo rechaza por origen.
//
// De qué vive `video/assets/` —que no se versiona, como todo lo generado—:
//
//   flujo-*.png, flujo.json    `capturar-flujo.mjs`, contra la app corriendo
//   lluvia-NN.png              `lluvia-demo.mjs`     diez negocios, placa de texto
//   lluviafoto-NN.png          `fotos-demo.mjs`      tres negocios, placa con foto
//   carrusel-NN.png            `piezas-demo.mjs`     el carrusel de Piletas SOL
//
// Y cuatro que ningún script rehace porque no salen del motor: los cinco
// `flyer-0N` del muro del principio, que son capturas que trajo Santiago, y
// `foto-piletas` / `foto-runclubs`, dos placas que ya había generado la
// aplicación de verdad. Están en `Recursos video/`, fuera del repositorio. Si
// se pierden, el aviso no se puede volver a armar igual.

import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { createReadStream, statSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome } from '../core/render/engine.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
// Se sirve la raíz: la página importa `web/js/frasco.js`, el mismo módulo que
// usa la aplicación, y desde `video/` no se alcanza.
const RAIZ = resolve(AQUI, '..')
const FPS = Number(process.env.FPS || 30)
// Sirve para los dos comerciales: el viral y el storyboard.
const PAGINA = process.env.PAGINA || 'viral.html'
const SALIDA = resolve(AQUI, process.env.SALIDA || PAGINA.replace('.html', '.mp4'))

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
}
const servidor = createServer((req, res) => {
  const f = join(RAIZ, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!f.startsWith(RAIZ) || !statSync(f, { throwIfNoEntry: false })?.isFile()) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': TIPOS[extname(f)] || 'application/octet-stream' })
  createReadStream(f).pipe(res)
})
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok))
const SITIO = `http://127.0.0.1:${servidor.address().port}`

const navegador = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none', '--force-color-profile=srgb'],
})
const p = await navegador.newPage()
await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
await p.goto(`${SITIO}/video/${PAGINA}`, { waitUntil: 'networkidle0' })
await p.evaluate(async () => {
  await document.fonts.ready
  await Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r })))
})

const duracion = await p.evaluate(() => window.DURACION)
const desde = Number(process.env.DESDE || 0)
const hasta = Number(process.env.HASTA || duracion)
const cuadros = Math.round((hasta - desde) / 1000 * FPS)

const ff = spawn('ffmpeg', [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-shortest',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
  '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', SALIDA,
], { stdio: ['pipe', 'inherit', 'inherit'] })
const escribir = b => new Promise((ok, mal) => ff.stdin.write(b, e => (e ? mal(e) : ok())))

const arranque = Date.now()
for (let i = 0; i < cuadros; i++) {
  await p.evaluate(ms => window.pintar(ms), desde + (i / FPS) * 1000)
  await escribir(await p.screenshot({ type: 'png', optimizeForSpeed: true }))
  if (i % 60 === 0 || i === cuadros - 1) process.stdout.write(`\r  ${((i + 1) / cuadros * 100).toFixed(0)}% · cuadro ${i + 1} de ${cuadros}`)
}
process.stdout.write('\n')
ff.stdin.end()
await new Promise((ok, mal) => ff.on('close', c => (c === 0 ? ok() : mal(new Error(`ffmpeg salió con ${c}`)))))
await navegador.close()
servidor.close()

const kb = Math.round(statSync(SALIDA).size / 1024)
console.log(`listo · ${SALIDA} · ${kb} KB · ${((Date.now() - arranque) / 1000).toFixed(0)}s de render`)
