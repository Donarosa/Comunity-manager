// La prueba barata: ¿cuánto cuesta una historia animada?
//
//   node video/historia.mjs
//     → video/historia.html   la placa del motor con una capa de animación encima
//     → video/historia.mp4    1080×1920 · 6 s · 30 fps
//
//   SEGUNDOS=8 FPS=24 node video/historia.mjs
//
// No es una maqueta: la placa la dibuja `htmlFor()`, el mismo motor que hace los
// PNG, con una marca normalizada igual que la de un cliente. Lo único que se le
// suma es una capa de animación por encima, escrita acá y no en el motor: el
// motor es la fuente de verdad del render y no se toca para resolver una pieza
// puntual.
//
// Al final imprime lo que importa para decidir: cuánto tardó, cuánto pesa y
// cuántas veces más caro es que la misma placa quieta.

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome, htmlFor } from '../core/render/engine.mjs'
import { normalizeBrand } from '../core/brand/schema.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const FPS = Number(process.env.FPS || 30)
const SEGUNDOS = Number(process.env.SEGUNDOS || 6)

/* El negocio de prueba, con la misma forma que le sale a un cliente del alta. */
const { brand } = normalizeBrand({
  nombre: 'Tostado Café',
  handle: 'tostadocafe',
  rubro: 'café de especialidad',
  ciudad: 'Rosario',
  color: '#7A4522',
  tipografia: 'calido',
  logotipoTipo: 'palabra-simbolo',
  logotipoTratamiento: 'linea',
  logotipoEscudo: 'circulo',
  logotipoFuente: 'serif-gruesa',
})

const placa = htmlFor({
  name: 'historia', style: 'flat', type: 'body', format: 'story',
  kick: 'Tueste del jueves',
  title: 'Por qué el café <span class="acc">se pone rancio</span>',
  body: 'No es el aire: es el aceite del grano oxidándose. Molelo justo antes y guardalo en frasco cerrado, lejos de la hornalla.',
}, brand, 'story')

/* ── la capa de animación ─────────────────────────────────────
 *
 * Va inyectada al final del HTML del motor, no adentro de las plantillas. Eso
 * importa: el día que se decida hacer esto de verdad, el motor sigue siendo el
 * que manda sobre cómo se ve la placa, y la coreografía se le apoya encima.
 *
 * Nada de animaciones de CSS: todo lo dibuja `pintar(t)` desde un milisegundo,
 * para que el render salga cuadro por cuadro sin depender del reloj.
 */
const ANIMACION = `
<style>
  /* Cada parte arranca escondida. Si algo falla, la placa queda en negro y se
     nota — mejor que quedar a medio armar sin que nadie lo vea. */
  .kick, .title, .body, .fuente, .foot, .top { opacity: 0; }
  .palabra { display: inline-block; white-space: pre; }
  /* El encuadre respira: un acercamiento muy lento sobre los seis segundos.
     Sin esto la pieza se lee como una foto con textos que aparecen, que es
     exactamente lo que no queremos. */
  .frame { transform-origin: 50% 45%; }
</style>
<script>
const sujeta = v => Math.max(0, Math.min(1, v))
const tramo = (t, a, b) => sujeta((t - a) / (b - a))
const frena = p => 1 - Math.pow(1 - p, 3)
const entre = (a, b, p) => a + (b - a) * p

/* El título entra palabra por palabra, y para eso hay que envolver cada una
   sin romper el resaltado: el <span class="acc"> del motor tiene que seguir
   entero. Se recorren los nodos de texto y se parte sólo adentro de cada uno. */
function porPalabras(nodo) {
  const salida = []
  const caminar = el => {
    for (const hijo of [...el.childNodes]) {
      if (hijo.nodeType === 3) {
        const trozos = hijo.textContent.split(/(\\s+)/).filter(Boolean)
        const frag = document.createDocumentFragment()
        for (const t of trozos) {
          if (/^\\s+$/.test(t)) { frag.append(t); continue }
          const s = document.createElement('span')
          s.className = 'palabra'
          s.textContent = t
          frag.append(s)
          salida.push(s)
        }
        hijo.replaceWith(frag)
      } else if (hijo.nodeType === 1) caminar(hijo)
    }
  }
  caminar(nodo)
  return salida
}

const $ = s => document.querySelector(s)
const palabras = $('.title') ? porPalabras($('.title')) : []
const poner = (n, e) => n && Object.assign(n.style, e)

const DURACION = ${SEGUNDOS * 1000}

function pintar(t) {
  // El encuadre, todo el tiempo.
  poner($('.frame'), { transform: 'scale(' + entre(1.04, 1, tramo(t, 0, DURACION)) + ')' })

  // La firma baja desde arriba.
  const firma = frena(tramo(t, 150, 750))
  poner($('.top'), { opacity: firma, transform: 'translateY(' + entre(-26, 0, firma) + 'px)' })

  // La etiqueta, con su barrita creciendo.
  const kick = frena(tramo(t, 600, 1100))
  poner($('.kick'), { opacity: kick, transform: 'translateX(' + entre(-18, 0, kick) + 'px)' })

  // El título, palabra por palabra. Es lo que hace que se lea como algo que
  // pasa y no como algo que aparece.
  palabras.forEach((p, i) => {
    const v = frena(tramo(t, 1000 + i * 85, 1500 + i * 85))
    poner(p, { opacity: v, transform: 'translateY(' + entre(22, 0, v) + 'px)' })
  })
  poner($('.title'), { opacity: 1 })

  const cuerpo = frena(tramo(t, 1000 + palabras.length * 85 + 250, 1000 + palabras.length * 85 + 900))
  poner($('.body'), { opacity: cuerpo, transform: 'translateY(' + entre(16, 0, cuerpo) + 'px)' })

  const pie = frena(tramo(t, DURACION - 2400, DURACION - 1800))
  poner($('.foot'), { opacity: pie })
  poner($('.fuente'), { opacity: pie })
}

window.pintar = pintar
window.DURACION = DURACION
pintar(0)

if (new URLSearchParams(location.search).has('vivo')) {
  const a = performance.now()
  const tic = ahora => { pintar((ahora - a) % DURACION); requestAnimationFrame(tic) }
  requestAnimationFrame(tic)
}
</script>
`

const pagina = placa.replace('</body>', ANIMACION + '</body>')
writeFileSync(resolve(AQUI, 'historia.html'), pagina)

/* ── el render ── */
const arranque = Date.now()
const navegador = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none', '--force-color-profile=srgb'],
})
const p = await navegador.newPage()
await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
await p.goto(pathToFileURL(resolve(AQUI, 'historia.html')).href, { waitUntil: 'networkidle0' })
await p.evaluate(async () => {
  await document.fonts.ready
  await Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r })))
})

// Cuánto tarda la misma placa quieta, para tener con qué comparar.
const unaPlaca = Date.now()
await p.screenshot({ type: 'png' })
const msPlaca = Date.now() - unaPlaca

const salida = resolve(AQUI, 'historia.mp4')
const ff = spawn('ffmpeg', [
  '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-shortest',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
  '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', salida,
], { stdio: ['pipe', 'inherit', 'inherit'] })
const escribir = buf => new Promise((ok, mal) => ff.stdin.write(buf, e => (e ? mal(e) : ok())))

const cuadros = SEGUNDOS * FPS
const empezoElBarrido = Date.now()
for (let i = 0; i < cuadros; i++) {
  await p.evaluate(ms => window.pintar(ms), (i / FPS) * 1000)
  await escribir(await p.screenshot({ type: 'png', optimizeForSpeed: true }))
  if (i % 30 === 0) process.stdout.write(`\r  cuadro ${i + 1} de ${cuadros}`)
}
process.stdout.write('\n')
const msBarrido = Date.now() - empezoElBarrido

ff.stdin.end()
await new Promise((ok, mal) => ff.on('close', c => (c === 0 ? ok() : mal(new Error(`ffmpeg salió con ${c}`)))))
await navegador.close()

const { statSync } = await import('node:fs')
const kb = Math.round(statSync(salida).size / 1024)
const total = (Date.now() - arranque) / 1000

console.log(`
  ${SEGUNDOS} s · ${FPS} fps · ${cuadros} cuadros · 1080×1920

  una placa quieta        ${msPlaca} ms
  los ${String(cuadros).padStart(3)} cuadros         ${(msBarrido / 1000).toFixed(1)} s
  de punta a punta        ${total.toFixed(1)} s  (incluye abrir Chrome y codificar)

  el video pesa           ${kb} KB
  cuesta                  ${Math.round(msBarrido / msPlaca)}× una placa

  → ${salida}
`)
