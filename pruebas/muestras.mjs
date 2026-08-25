// Genera las tres placas que se ven en la portada del sitio.
//
//   node pruebas/muestras.mjs
//
// Son piezas reales, hechas con el mismo motor que las del producto. Un mockup
// dibujado aparte en la landing es una promesa que después no se cumple.

import { normalizeBrand } from '../core/brand/schema.mjs'
import { renderSpec } from '../core/render/engine.mjs'

const { brand } = normalizeBrand({
  nombre: 'Panadería Mendieta',
  color: '#8C1D2F',
  tipografia: 'calido',
  handle: 'panaderiamendieta',
  rubro: 'panadería de barrio',
  ciudad: 'Rosario',
})

const slides = [
  {
    name: 'muestra-1', format: 'feed', style: 'flat', type: 'cover', idx: '01/03',
    kick: 'Masa madre',
    title: 'Por qué tardamos <span class="acc">tres días</span> en hacer un pan',
    body: 'La masa madre no se apura. Te contamos qué pasa en cada uno de esos días.',
  },
  {
    name: 'muestra-2', format: 'feed', style: 'flat', type: 'steps', idx: '02/03',
    kick: 'El proceso',
    title: 'Tres días, tres etapas',
    steps: [
      { n: '1', k: 'Día uno', t: 'Se alimenta la madre', d: 'Harina y agua. Nada más. Doce horas de espera.' },
      { n: '2', k: 'Día dos', t: 'Fermentación en frío', d: 'La masa descansa a 4 grados y toma sabor.' },
      { n: '3', k: 'Día tres', t: 'Al horno a las cinco', d: 'Sale a las siete. Todavía tibio cuando abrimos.' },
    ],
  },
  {
    name: 'muestra-3', format: 'story', style: 'vector',
    eyebrow: 'Abrimos a las 7',
    headline: 'El pan del día <em>se termina</em> temprano.',
  },
]

const hechas = await renderSpec({ spec: { slides }, brand, outDir: 'web/img' })
for (const r of hechas) console.log('  ✓', r.name, r.format)
