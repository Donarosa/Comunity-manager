// Motor de render. Un spec entra, PNG salen.
//
// El motor NO contiene identidad de marca: colores, fuentes, logo, wordmark,
// handle y sitio salen del objeto `brand`. Tampoco contiene tamaños: salen de
// `formats.mjs`. Cada placa puede pedir su propio formato (feed / story /
// cuadrado), así un mismo plan de contenido produce carrusel e historias en
// una sola corrida.

import puppeteer from 'puppeteer-core'
import { mkdirSync, existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'

import { resolveFormat, DEFAULT_FORMAT } from './formats.mjs'
import { brandContext } from './brand-context.mjs'
import { flatHTML } from './templates/flat.mjs'
import { vectorHTML } from './templates/vector.mjs'
import { fotoHTML } from './templates/foto.mjs'

const CHROME_CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

export function findChrome() {
  const found = CHROME_CANDIDATES.filter(Boolean).find(p => existsSync(p))
  if (!found) {
    throw new Error(
      'no encuentro Chrome. Instalalo o exportá la ruta: CHROME=/ruta/a/chrome'
    )
  }
  return found
}

/** HTML de una placa. Útil para previsualizar sin abrir Chrome. */
export function htmlFor(slide, brand, formatName) {
  const ctx = brandContext(brand)
  const fmt = resolveFormat(slide.format || formatName || DEFAULT_FORMAT)
  if (slide.style === 'vector') return vectorHTML(slide, ctx, fmt)
  if (slide.style === 'foto') return fotoHTML(slide, ctx, fmt)
  return flatHTML(slide, ctx, fmt)
}

/**
 * Renderiza un spec completo.
 * @param {object}   o
 * @param {object}   o.spec    { outDir, format?, slides[] }
 * @param {object}   o.brand   identidad ya normalizada
 * @param {string}  [o.outDir] pisa spec.outDir
 * @param {function}[o.onSlide] callback (name, path) por placa
 * @returns {Promise<Array<{name,file,format,style,type}>>}
 */
// Las familias que la placa necesita sí o sí antes de la foto.
const familiasDe = F => [...new Set([F.sans, F.serif, F.mono, F.logo?.family, F.logo?.monogramaFamily].filter(Boolean))]

export async function renderSpec({ spec, brand, outDir, onSlide }) {
  if (!spec?.slides?.length) throw new Error('el spec no tiene slides')

  const dirRaw = outDir || spec.outDir
  if (!dirRaw) throw new Error('falta outDir en el spec')
  const dir = isAbsolute(dirRaw) ? dirRaw : resolve(process.cwd(), dirRaw)
  mkdirSync(dir, { recursive: true })

  const ctx = brandContext(brand)
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none'],
  })

  const out = []
  try {
    const page = await browser.newPage()
    let viewport = null

    for (const s of spec.slides) {
      const fmt = resolveFormat(s.format || spec.format || DEFAULT_FORMAT)

      if (!viewport || viewport.w !== fmt.w || viewport.h !== fmt.h) {
        await page.setViewport({ width: fmt.w, height: fmt.h, deviceScaleFactor: 2 })
        viewport = { w: fmt.w, h: fmt.h }
      }

      const html =
        s.style === 'vector' ? vectorHTML(s, ctx, fmt)
        : s.style === 'foto' ? fotoHTML(s, ctx, fmt)
        : flatHTML(s, ctx, fmt)

      // 'load' y no 'domcontentloaded': con domcontentloaded las hojas de
      // fuentes pueden no estar parseadas todavía, así que sus @font-face no
      // están registradas y `document.fonts.ready` resuelve antes de tiempo —
      // la placa sale con la fuente de sistema. Se notó al sumar la segunda
      // familia (texto + logotipo): con una sola ganaba la carrera por poco.
      await page.setContent(html, { waitUntil: 'load' })
      await page.evaluate(async (familias) => {
        await document.fonts.ready
        // `ready` no garantiza que ESTA familia haya cargado si nada la usó
        // todavía. Se pide explícitamente y se espera a que esté disponible.
        await Promise.all(familias.map(f => document.fonts.load(`700 31px "${f}"`)))
        await document.fonts.ready
      }, familiasDe(ctx.F))
      await new Promise(r => setTimeout(r, s.style === 'foto' ? 600 : 250))

      const file = `${dir}/${s.name}.png`
      await page.screenshot({ path: file })

      const rec = { name: s.name, file, format: fmt.id, style: s.style || 'flat', type: s.type || null }
      out.push(rec)
      onSlide?.(rec)
    }
  } finally {
    await browser.close()
  }

  return out
}
