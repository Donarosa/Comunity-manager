// Las placas con foto de la lluvia.
//
//   node video/fotos-demo.mjs   → video/assets/lluviafoto-NN.png
//
// La lluvia con puras placas de texto muestra medio producto: el motor también
// arma placas sobre una foto, y ese es el formato que más se publica. Acá se
// generan tres, del mismo motor y con la marca de cada negocio aplicada.
//
// Las fotos son de Pexels y salen del propio almacén de la aplicación: ya las
// bajó un cliente desde el buscador. Van sin crédito estampado a propósito —
// los términos de Pexels no lo exigen, y la regla del producto es que el
// crédito se pone donde la licencia obliga (Unsplash, Openverse) y no donde no.

import { renderSpec } from '../core/render/engine.mjs'
import { normalizeBrand } from '../core/brand/schema.mjs'

const CASOS = [
  {
    nombre: 'Panadería Mendieta', rubro: 'panadería artesanal', ciudad: 'Rosario',
    color: '#8C1D2F', tipografia: 'calido', fuente: 'script', trat: 'linea', escudo: 'circulo',
    foto: 'data/piezas/inv_ltzptx/imagenes/pexels-10202985.jpg', pos: '50% 45%',
    kick: 'Horneado hoy',
    line1: 'Seis panes', line2: 'y ninguno igual',
    body: 'Cada masa pide su tiempo. El de centeno sale a las siete; el de campo, recién a las once.',
  },
  {
    nombre: 'Vivero El Sauce', rubro: 'vivero', ciudad: 'Córdoba',
    color: '#33691E', tipografia: 'clasico', fuente: 'tallada', trat: 'linea', escudo: 'marco',
    foto: 'data/piezas/977d8fb6-1438-4dc4-b9b0-a477caddaa27/imagenes/pexels-33887641.jpg', pos: '50% 55%',
    kick: 'Entró temporada',
    line1: 'El plantín', line2: 'no se riega igual',
    body: 'Tiene la raíz corta: pide poco y seguido. La planta grande, al revés — mucho y espaciado.',
  },
  {
    nombre: 'Bici Norte', rubro: 'bicicletería', ciudad: 'Córdoba',
    color: '#B34700', tipografia: 'tecnico', fuente: 'condensada', trat: 'caja', escudo: 'barra',
    foto: 'data/piezas/inv_2esdjt/imagenes/pexels-11242850.jpg', pos: '50% 40%',
    kick: 'Taller',
    line1: 'La cadena', line2: 'se estira',
    body: 'Pasado el 0,75 de desgaste empieza a comerse los piñones. Cambiarla a tiempo sale la mitad.',
  },
]

for (const [i, c] of CASOS.entries()) {
  const { brand } = normalizeBrand({
    nombre: c.nombre,
    handle: c.nombre.toLowerCase().replace(/[^a-z]/g, ''),
    rubro: c.rubro, ciudad: c.ciudad,
    color: c.color, tipografia: c.tipografia,
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: c.trat,
    logotipoEscudo: c.escudo, logotipoFuente: c.fuente,
  })
  const [hecha] = await renderSpec({
    brand, outDir: 'video/assets',
    spec: { slides: [{
      name: `lluviafoto-${String(i + 1).padStart(2, '0')}`,
      style: 'foto', format: 'feed',
      photo: c.foto, objectPos: c.pos,
      kick: c.kick, line1: c.line1, line2: c.line2, body: c.body,
    }] },
  })
  console.log('  ✓', hecha.name.padEnd(16), c.nombre)
}
