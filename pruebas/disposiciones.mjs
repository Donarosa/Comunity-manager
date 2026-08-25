// Renderiza la MISMA placa en las cinco disposiciones, para ver de un vistazo
// si realmente se diferencian.
//
//   node pruebas/disposiciones.mjs && open placas/disposiciones
import { normalizeBrand } from '../core/brand/schema.mjs'
import { renderSpec } from '../core/render/engine.mjs'
import { DISPOSICIONES } from '../core/render/disposiciones.mjs'

const contenido = {
  style: 'flat', type: 'body', format: 'feed',
  kick: 'Antes de comprar',
  title: 'Tres cosas que <span class="acc">hay que mirar</span>',
  body: 'No todas las plantas que se ven lindas en el vivero aguantan tu casa. Estas tres señales te dicen si va a andar en tu balcón.',
}

const slides = []
for (const d of Object.keys(DISPOSICIONES)) {
  slides.push({ ...contenido, name: `disp-${d}`, disposicion: d })
}

const { brand } = normalizeBrand({
  nombre: 'Vivero Las Acacias', color: '#3F6B34', tipografia: 'clasico', handle: 'viverolasacacias',
})

const hechas = await renderSpec({ spec: { slides }, brand, outDir: 'placas/disposiciones' })
for (const r of hechas) console.log('  ✓', r.name)
