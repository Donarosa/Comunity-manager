// Las placas de la lluvia: diez negocios distintos, diez marcas distintas.
//
// Sirven para dos cosas a la vez. Son la lluvia del final —lo que la aplicación
// muestra de fondo cuando elegís formato— y son, sin decirlo, el plano del
// sistema de marca que faltaba: diez placas del mismo motor donde lo único que
// cambia es el negocio, y ninguna se parece a otra. Un diagrama de paletas no
// explica eso; diez placas cayendo, sí.
//
//   node video/lluvia-demo.mjs   → video/assets/lluvia-NN.png

import { renderSpec } from '../core/render/engine.mjs'
import { normalizeBrand } from '../core/brand/schema.mjs'

const NEGOCIOS = [
  { nombre: 'Panadería Mendieta', color: '#8C1D2F', tipografia: 'calido', fuente: 'script', trat: 'linea', escudo: 'circulo',
    kick: 'Masa madre', title: 'Tres días para <span class="acc">un pan</span>',
    body: 'La fermentación lenta es lo que hace que dure blando tres días en vez de uno.' },
  { nombre: 'Tostado Café', color: '#7A4522', tipografia: 'calido', fuente: 'serif-gruesa', trat: 'linea', escudo: 'circulo',
    kick: 'Tueste del jueves', title: 'Por qué el café <span class="acc">se pone rancio</span>',
    body: 'No es el aire: es el aceite del grano oxidándose. Molelo justo antes de usarlo.' },
  { nombre: 'Vivero El Sauce', color: '#33691E', tipografia: 'clasico', fuente: 'tallada', trat: 'linea', escudo: 'marco',
    kick: 'Entró plantín', title: 'Cuándo trasplantar <span class="acc">sin matarla</span>',
    body: 'Cuando las raíces asoman por abajo. Si esperás a que amarillee, ya es tarde.' },
  { nombre: 'Taller Sur', color: '#A2542B', tipografia: 'tecnico', fuente: 'condensada', trat: 'caja', escudo: 'barra',
    kick: 'Service', title: 'Cuándo tocan <span class="acc">las pastillas</span>',
    body: 'Si chillan al frenar en seco, ya pasaste el punto. Se revisan cada 20.000 km.' },
  { nombre: 'Heladería Pelusa', color: '#C2185B', tipografia: 'geometrico', fuente: 'redonda', trat: 'pastilla', escudo: 'cuadrado',
    kick: 'Gusto del mes', title: 'Dulce de leche <span class="acc">hecho el lunes</span>',
    body: 'Lo hacemos acá, en olla, sin premezcla. Por eso sale distinto cada tanda.' },
  { nombre: 'Estudio Lumen', color: '#4A4A6A', tipografia: 'editorial', fuente: 'deco', trat: 'filete', escudo: 'contorno',
    kick: 'Obra nueva', title: 'Cuánto cambia <span class="acc">una medianera</span>',
    body: 'Abrir un vano al norte puede darte dos horas más de sol en invierno.' },
  { nombre: 'Cerrajería Norte', color: '#37474F', tipografia: 'tecnico', fuente: 'tecnica', trat: 'linea', escudo: 'cuadrado',
    kick: 'Urgencias', title: 'Qué hacer si <span class="acc">se parte la llave</span>',
    body: 'No la empujes. Cada intento la mete más adentro y encarece el trabajo.' },
  { nombre: 'Joyería Aldana', color: '#6B5B2E', tipografia: 'editorial', fuente: 'serif-moderna', trat: 'apilado', escudo: 'contorno',
    kick: 'Hecho acá', title: 'Plata que <span class="acc">no se pone negra</span>',
    body: 'La plata 925 se oxida; guardarla en bolsita cerrada le estira la vida.' },
  { nombre: 'Librería Otoño', color: '#2E5B52', tipografia: 'clasico', fuente: 'serif-seca', trat: 'filete', escudo: 'letra',
    kick: 'Llegó', title: 'Lo nuevo de <span class="acc">Mariana Enriquez</span>',
    body: 'Nos entraron seis. Si querés que te guardemos uno, escribinos por privado.' },
  { nombre: 'Piletas SOL', color: '#0076B3', tipografia: 'moderno', fuente: 'bloque', trat: 'pastilla', escudo: 'circulo',
    kick: 'Mantenimiento', title: 'Los inflables te <span class="acc">tapan el filtro</span>',
    body: 'Arrastran crema y polvo al skimmer. Sacalos de noche y el agua se mantiene.' },
]

const slides = NEGOCIOS.map((n, i) => ({
  negocio: n,
  slide: {
    name: `lluvia-${String(i + 1).padStart(2, '0')}`,
    style: 'flat', type: 'body', format: 'feed',
    kick: n.kick, title: n.title, body: n.body,
  },
}))

for (const { negocio, slide } of slides) {
  const { brand } = normalizeBrand({
    nombre: negocio.nombre,
    handle: negocio.nombre.toLowerCase().replace(/[^a-z]/g, ''),
    color: negocio.color, tipografia: negocio.tipografia,
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: negocio.trat,
    logotipoEscudo: negocio.escudo, logotipoFuente: negocio.fuente,
  })
  const [hecha] = await renderSpec({ brand, outDir: 'video/assets', spec: { slides: [slide] } })
  console.log('  ✓', hecha.name.padEnd(12), negocio.nombre)
}
