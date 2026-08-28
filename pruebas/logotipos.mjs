// Rinde la misma placa con cada combinación de logotipo, para ver de un vistazo
// si realmente se distinguen entre sí.
//
//   node pruebas/logotipos.mjs && open placas/logotipos
import { normalizeBrand } from '../core/brand/schema.mjs'
import { renderSpec } from '../core/render/engine.mjs'
import { TIPOS, TRATAMIENTOS, catalogoLogotipos } from '../core/brand/logotipo.mjs'

const contenido = {
  style: 'flat', type: 'body', format: 'feed',
  kick: 'Antes de comprar',
  title: 'Tres cosas que <span class="acc">hay que mirar</span>',
  body: 'No todas las plantas que se ven lindas en el vivero aguantan tu casa.',
}

const slides = []
const marcas = {}

// Los cuatro tratamientos, con nombre y símbolo
for (const t of TRATAMIENTOS) {
  const id = `trat-${t.id}`
  marcas[id] = normalizeBrand({
    nombre: 'Vivero Las Acacias', color: '#3F6B34', tipografia: 'clasico',
    handle: 'viverolasacacias', logotipoTipo: 'palabra-simbolo', logotipoTratamiento: t.id,
  }).brand
  slides.push({ ...contenido, name: id, marca: id })
}

// Los tres tipos, con el mismo tratamiento
for (const t of TIPOS) {
  const id = `tipo-${t.id}`
  marcas[id] = normalizeBrand({
    nombre: 'Vivero Las Acacias', color: '#3F6B34', tipografia: 'clasico',
    handle: 'viverolasacacias', logotipoTipo: t.id, logotipoTratamiento: 'linea',
  }).brand
  slides.push({ ...contenido, name: id, marca: id })
}

// Las cinco variantes de símbolo, con el mismo nombre y tratamiento
for (const e of catalogoLogotipos().escudos) {
  const id = `escudo-${e.id}`
  marcas[id] = normalizeBrand({
    nombre: 'Vivero Las Acacias', color: '#3F6B34', tipografia: 'clasico',
    handle: 'viverolasacacias', logotipoTipo: 'palabra-simbolo',
    logotipoTratamiento: 'linea', logotipoEscudo: e.id,
  }).brand
  slides.push({ ...contenido, name: id, marca: id })
}

// Cada placa usa su propia marca, así que van de a una.
for (const s of slides) {
  const [hecho] = await renderSpec({
    spec: { slides: [s] }, brand: marcas[s.marca], outDir: 'placas/logotipos',
  })
  console.log('  ✓', hecho.name)
}
