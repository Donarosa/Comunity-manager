// Las placas que muestra el comercial, hechas con el motor de verdad.
//
// No son una ilustración de lo que hace el producto: son la salida del producto.
// El texto lo escribo yo —acá no hay clave de IA— pero cada píxel sale de
// `renderSpec` con una marca normalizada igual que la de un cliente.
//
//   node video/piezas-demo.mjs   → video/assets/carrusel-0N.png

import { copyFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { renderSpec } from '../core/render/engine.mjs'
import { normalizeBrand } from '../core/brand/schema.mjs'

const { brand } = normalizeBrand({
  nombre: 'Piletas SOL',
  handle: 'piletassol',
  rubro: 'piletas de fibra de vidrio',
  ciudad: 'Córdoba',
  color: '#0076B3',
  tipografia: 'moderno',
  logotipoTipo: 'palabra-simbolo',
  logotipoTratamiento: 'pastilla',
  logotipoEscudo: 'circulo',
  logotipoFuente: 'bloque',
})

const PLACAS = [
  { name: 'carrusel-01', style: 'flat', type: 'cover', idx: '01/04',
    kick: 'Mantenimiento',
    title: 'Los inflables te <span class="acc">tapan el filtro</span>',
    body: 'Tres cosas que conviene hacer para que el agua no se ponga turbia en pleno enero.' },
  { name: 'carrusel-02', style: 'flat', type: 'body', idx: '02/04',
    kick: 'Lo que pasa',
    title: 'El agua se lleva <span class="acc">el protector solar</span>',
    body: 'Los inflables arrastran crema y polvo al skimmer. Ahí se junta y el filtro empieza a trabajar de más.' },
  { name: 'carrusel-03', style: 'flat', type: 'steps', idx: '03/04',
    kick: 'Qué hacer',
    title: 'Tres minutos <span class="acc">después de cada uso</span>',
    steps: [
      { n: '1', k: 'Sacalos', t: 'No los dejes flotando de noche' },
      { n: '2', k: 'Enjuagá', t: 'Agua fría y que escurran parados' },
      { n: '3', k: 'Guardá', t: 'Secos y a la sombra, nunca doblados' },
    ] },
  { name: 'carrusel-04', style: 'flat', type: 'trial', idx: '04/04',
    pill: 'Te asesoramos',
    title: '¿El agua te queda <span class="acc">turbia igual</span>?',
    body: 'Contanos las medidas de tu pileta y qué filtro tenés. Te decimos qué revisar antes de gastar en productos.' },
]

/* Las mismas placas, también donde la aplicación las sirve.
 *
 * `capturar-flujo.mjs` simula el plan del modelo y ese plan apunta a
 * `/piezas/<cuenta>/demo-video/...`, que es la ruta de producción. Sin copiarlas
 * ahí, la captura del resultado sale con las imágenes rotas — y el que corre
 * esto por primera vez no tiene forma de adivinarlo. */
const SESION = process.env.SESION || 'loc_1964'
const destinoApp = join(process.env.DATA_DIR || 'data', 'piezas', SESION, 'demo-video')

const hechas = await renderSpec({
  brand,
  outDir: 'video/assets',
  spec: { slides: PLACAS.map(p => ({ ...p, format: 'feed' })) },
})
mkdirSync(destinoApp, { recursive: true })
for (const h of hechas) {
  copyFileSync(h.file, join(destinoApp, basename(h.file)))
  console.log('  ✓', h.name)
}
console.log(`\ntambién en ${destinoApp}, que es de donde las toma la captura del flujo`)
