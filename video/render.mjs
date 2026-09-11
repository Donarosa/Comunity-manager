// El comercial, de la página al archivo.
//
// Abre `comercial.html` en Chrome, le pide un cuadro por vez —`pintar(t)`, sin
// reloj de por medio— y le enchufa las fotos a ffmpeg por la entrada estándar.
// Sin pasar por el disco: son setecientos y pico de cuadros y no hace falta
// dejarlos escritos para después borrarlos.
//
//   node video/render.mjs                 1080×1920 · 30 fps · video/comercial.mp4
//   FPS=24 node video/render.mjs          otra cadencia
//   DESDE=8000 HASTA=13000 node ...       solo un tramo, para revisar una escena
//
// El archivo sale mudo y con una pista de silencio: sin pista de audio hay
// plataformas que rechazan la subida, y la música se le pone después.

import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome } from '../core/render/engine.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const FPS = Number(process.env.FPS || 30)
const SALIDA = resolve(AQUI, process.env.SALIDA || 'comercial.mp4')

const navegador = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none', '--force-color-profile=srgb'],
})

const pagina = await navegador.newPage()
await pagina.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
await pagina.goto(pathToFileURL(resolve(AQUI, 'comercial.html')).href, { waitUntil: 'networkidle0' })

// Las tipografías y las fotos tienen que estar antes del primer cuadro: media
// docena de cuadros con la tipografía de respaldo se ven como un parpadeo.
await pagina.evaluate(async () => {
  await document.fonts.ready
  await Promise.all([...document.images].map(i => i.complete
    ? null
    : new Promise(r => { i.onload = i.onerror = r })))
})

const duracion = await pagina.evaluate(() => window.DURACION)
const desde = Number(process.env.DESDE || 0)
const hasta = Number(process.env.HASTA || duracion)
const cuadros = Math.round((hasta - desde) / 1000 * FPS)

mkdirSync(dirname(SALIDA), { recursive: true })

const ff = spawn('ffmpeg', [
  '-y',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  // La pista muda, para que ninguna plataforma rechace el archivo por no traer
  // audio. La música se agrega después, en el editor.
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
  '-shortest',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
  '-profile:v', 'high', '-level', '4.0',
  '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart',
  SALIDA,
], { stdio: ['pipe', 'inherit', 'inherit'] })

const escribir = buf => new Promise((ok, mal) => {
  ff.stdin.write(buf, e => (e ? mal(e) : ok()))
})

const arranque = Date.now()
for (let i = 0; i < cuadros; i++) {
  const t = desde + (i / FPS) * 1000
  await pagina.evaluate(ms => window.pintar(ms), t)
  await escribir(await pagina.screenshot({ type: 'png', optimizeForSpeed: true }))
  if (i % 60 === 0 || i === cuadros - 1) {
    const hecho = ((i + 1) / cuadros * 100).toFixed(0)
    process.stdout.write(`\r  ${hecho}% · cuadro ${i + 1} de ${cuadros}`)
  }
}
process.stdout.write('\n')

ff.stdin.end()
await new Promise((ok, mal) => {
  ff.on('close', c => (c === 0 ? ok() : mal(new Error(`ffmpeg salió con ${c}`))))
})
await navegador.close()

console.log(`listo · ${SALIDA} · ${(Date.now() - arranque) / 1000 | 0}s de render`)
