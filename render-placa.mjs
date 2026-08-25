#!/usr/bin/env node
// CLI del motor de render. Sigue funcionando igual que siempre:
//
//   node render-placa.mjs <spec.json> [--brand=<brand.json>]
//
// La lógica vive en core/render/. Este archivo solo lee argumentos y archivos.
// El spec puede pedir formato por placa (`"format": "story"`) o para todas
// (`"format"` en la raíz); si no dice nada, es feed 1080×1350 como siempre.

import { readFileSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { renderSpec } from './core/render/engine.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const specPath = args.find(a => !a.startsWith('--'))
const brandArg = args.find(a => a.startsWith('--brand='))?.slice('--brand='.length)

if (!specPath) {
  console.error('uso: node render-placa.mjs <spec.json> [--brand=<brand.json>]')
  process.exit(1)
}

const brandPath = brandArg
  ? resolve(brandArg)
  : process.env.BRAND
    ? resolve(process.env.BRAND)
    : resolve(HERE, 'brand.json')

if (!existsSync(brandPath)) {
  console.error(`no encuentro el brand.json en ${brandPath}`)
  console.error('pasá la ruta con --brand=<archivo> o poné brand.json junto al motor.')
  process.exit(1)
}

try {
  const brand = JSON.parse(readFileSync(brandPath, 'utf8'))
  const spec = JSON.parse(readFileSync(resolve(specPath), 'utf8'))

  const hechas = await renderSpec({
    spec,
    brand,
    onSlide: r => console.log('  ✓', `${r.name}.png`, `(${r.style}${r.type ? '/' + r.type : ''}, ${r.format})`),
  })

  console.log(`Listo — ${hechas.length} placa(s) en ${dirname(hechas[0].file)}`)
} catch (e) {
  console.error('Error:', e.message)
  process.exit(1)
}
