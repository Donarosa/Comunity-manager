// ¿Se lee el texto de un comercial en un teléfono?
//
//   node video/auditar.mjs                      revisa viral.html
//   PAGINA=storyboard.html node video/auditar.mjs
//
// La regla viene de `video-shotcraft` (Q11), y viene con su caso: alguien miró
// un video terminado y dijo «hay varios planos donde la letra es tan chica que
// directamente no se ve». El piso quedó en subtítulo ≥56 píxeles sobre un cuadro
// de 1920 —un 5,2 % del alto— y texto auxiliar ≥32.
//
// Lo que hace que la regla sirva es cómo se mide: **sobre el cuadro renderizado,
// no sobre el `font-size` del código**. Un texto de 64 píxeles adentro de algo
// que está escalado a 0,7 mide 45 y no se lee, y en el código sigue diciendo 64.
// Acá se multiplica por todas las escalas que arrastran los padres.
//
// Y hay un tercer estado que la regla prohíbe: el texto que es demasiado chico
// para leerse pero demasiado visible para ignorarse. O es textura —atenuado, se
// lee como ruido— o se lee. El medio no existe: si no se va a poder leer,
// conviene bajarlo hasta que nadie lo intente.

import { createServer } from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome } from '../core/render/engine.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const PAGINA = process.env.PAGINA || 'viral.html'
const ALTO = 1920
const PISO_SUBTITULO = 56        // 5,2 % del alto
const PISO_AUXILIAR = 32         // 3 %

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
}
const servidor = createServer((req, res) => {
  const f = join(AQUI, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!f.startsWith(AQUI) || !statSync(f, { throwIfNoEntry: false })?.isFile()) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': TIPOS[extname(f)] || 'application/octet-stream' })
  createReadStream(f).pipe(res)
})
await new Promise(ok => servidor.listen(0, '127.0.0.1', ok))

const navegador = await puppeteer.launch({
  executablePath: findChrome(), headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none'],
})
const p = await navegador.newPage()
await p.setViewport({ width: 1080, height: ALTO, deviceScaleFactor: 1 })
await p.goto(`http://127.0.0.1:${servidor.address().port}/${PAGINA}`, { waitUntil: 'networkidle0' })
await p.evaluate(async () => {
  await document.fonts.ready
  await Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r })))
})

const duracion = await p.evaluate(() => window.DURACION)
// Se muestrea medio segundo por medio segundo: un texto que aparece y se va en
// menos de eso no alcanza a leerse igual.
const visto = new Map()
for (let t = 200; t < duracion; t += 500) {
  const filas = await p.evaluate(ms => {
    window.pintar(ms)
    const out = []
    for (const n of document.querySelectorAll('#escena *')) {
      if (n.children.length || !n.textContent.trim()) continue
      const caja = n.getBoundingClientRect()
      if (!caja.width || !caja.height) continue

      // Lo que de verdad se ve: la opacidad se multiplica por toda la cadena.
      let opacidad = 1, esc = 1, el = n
      while (el && el.id !== 'escena') {
        const cs = getComputedStyle(el)
        opacidad *= Number(cs.opacity)
        if (cs.transform && cs.transform !== 'none') esc *= Math.abs(new DOMMatrix(cs.transform).a)
        el = el.parentElement
      }
      if (opacidad < 0.55) continue

      out.push({
        sel: (n.id ? '#' + n.id : String(n.className || n.tagName.toLowerCase())).split(' ')[0],
        texto: n.textContent.trim().slice(0, 32),
        px: Math.round(parseFloat(getComputedStyle(n).fontSize) * esc),
        opacidad: Math.round(opacidad * 100) / 100,
      })
    }
    return out
  }, t)
  for (const f of filas) {
    const clave = f.sel + '·' + f.texto
    // Se guarda la aparición más grande: si en algún momento se lee, alcanza.
    if (!visto.has(clave) || visto.get(clave).px < f.px) visto.set(clave, { ...f, t })
  }
}
await navegador.close()
servidor.close()

const todo = [...visto.values()].sort((a, b) => a.px - b.px)
const bajos = todo.filter(f => f.px < PISO_AUXILIAR)
// Textura legítima: chiquito y además atenuado, para que nadie lo intente leer.
const textura = bajos.filter(f => f.opacidad <= 0.6)
const intermedios = bajos.filter(f => f.opacidad > 0.6)

console.log(`\nQ11 · ${PAGINA} · altura útil sobre el cuadro de ${ALTO}`)
console.log(`      subtítulo ≥${PISO_SUBTITULO}px · auxiliar ≥${PISO_AUXILIAR}px\n`)
for (const f of todo.filter(f => f.px >= PISO_AUXILIAR)) {
  const marca = f.px >= PISO_SUBTITULO ? '✓' : '·'
  console.log(`  ${marca} ${String(f.px).padStart(3)}px  ${f.sel.padEnd(16)} "${f.texto}"`)
}
if (textura.length) console.log(`\n  ${textura.length} textos chicos y atenuados — textura, está bien`)
if (intermedios.length) {
  console.log('\n  ✗ ni textura ni legible: demasiado chicos para leerse, demasiado visibles para ignorarse')
  for (const f of intermedios) {
    console.log(`      ${String(f.px).padStart(3)}px · opacidad ${f.opacidad}  ${f.sel.padEnd(14)} "${f.texto}"  (t=${f.t}ms)`)
  }
}
console.log()
process.exitCode = intermedios.length ? 1 : 0
