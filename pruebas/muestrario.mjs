// Cinco negocios distintos, cada uno con la combinación que le tocaría.
// La pregunta que responde: ¿se distinguen entre sí, o son el mismo logo con
// otro color?
import { normalizeBrand } from '../core/brand/schema.mjs'
import { renderSpec } from '../core/render/engine.mjs'

const NEGOCIOS = [
  { nombre: 'Panadería Mendieta', color: '#8C1D2F', tipografia: 'calido',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'linea', logotipoEscudo: 'circulo',
    logotipoFuente: 'script',
    kick: 'Masa madre', title: 'Tres días para <span class="acc">un pan</span>' },

  { nombre: 'Bruma Estudio', color: '#7A5C86', tipografia: 'editorial',
    logotipoTipo: 'palabra', logotipoTratamiento: 'filete',
    logotipoFuente: 'caligrafica',
    kick: 'Turnos de agosto', title: 'Color sin <span class="acc">arruinar el pelo</span>' },

  { nombre: 'Estudio Ravenna', color: '#1F3A5F', tipografia: 'editorial',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'linea', logotipoEscudo: 'contorno',
    logotipoFuente: 'serif-alto',
    kick: 'Impuestos', title: 'Lo que cambia en <span class="acc">el monotributo</span>' },

  { nombre: 'Taller Sur', color: '#A2542B', tipografia: 'tecnico',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'caja', logotipoEscudo: 'barra',
    logotipoFuente: 'condensada',
    kick: 'Service', title: 'Cuándo tocan <span class="acc">las pastillas</span>' },

  { nombre: 'Verdulería Mendoza', color: '#3F6B34', tipografia: 'geometrico',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'linea', logotipoEscudo: 'cuadrado',
    logotipoFuente: 'compacta',
    kick: 'Entró hoy', title: 'Tomates de <span class="acc">quinta</span>' },

  { nombre: 'Cervecería Fondo', color: '#8A5A16', tipografia: 'calido',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'linea', logotipoEscudo: 'circulo',
    logotipoFuente: 'egipcia',
    kick: 'Tirada nueva', title: 'Una IPA que <span class="acc">no amarga de más</span>' },

  { nombre: 'Librería Otoño', color: '#2E5B52', tipografia: 'clasico',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'filete', logotipoEscudo: 'letra',
    logotipoFuente: 'serif-seca',
    kick: 'Llegó', title: 'Lo nuevo de <span class="acc">Mariana Enriquez</span>' },

  { nombre: 'Joyería Aldana', color: '#6B5B2E', tipografia: 'editorial',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'apilado', logotipoEscudo: 'contorno',
    logotipoFuente: 'serif-moderna',
    kick: 'Hecho acá', title: 'Plata que <span class="acc">no se pone negra</span>' },

  // Los cinco de abajo son los rubros de las cinco tipografías nuevas. Están
  // acá para que la pregunta del muestrario siga teniendo sentido: sumar
  // familias sirve si dos negocios distintos dejan de parecerse, y eso no se
  // comprueba mirando la lista, se comprueba mirando las placas.
  { nombre: 'Estudio Lumen', color: '#4A4A6A', tipografia: 'editorial',
    logotipoTipo: 'palabra', logotipoTratamiento: 'filete',
    logotipoFuente: 'deco',
    kick: 'Obra nueva', title: 'Cuánto cambia <span class="acc">una medianera</span>' },

  { nombre: 'Tostado Café', color: '#7A4522', tipografia: 'calido',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'linea', logotipoEscudo: 'circulo',
    logotipoFuente: 'serif-gruesa',
    kick: 'Tueste del jueves', title: 'Por qué el café <span class="acc">se pone rancio</span>' },

  { nombre: 'Heladería Pelusa', color: '#C2185B', tipografia: 'geometrico',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'pastilla', logotipoEscudo: 'cuadrado',
    logotipoFuente: 'redonda',
    kick: 'Gusto del mes', title: 'Dulce de leche <span class="acc">hecho el lunes</span>' },

  { nombre: 'Cerrajería Norte', color: '#37474F', tipografia: 'tecnico',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'linea', logotipoEscudo: 'cuadrado',
    logotipoFuente: 'tecnica',
    kick: 'Urgencias', title: 'Qué hacer si <span class="acc">se parte la llave</span>' },

  { nombre: 'Vivero El Sauce', color: '#33691E', tipografia: 'clasico',
    logotipoTipo: 'palabra-simbolo', logotipoTratamiento: 'linea', logotipoEscudo: 'marco',
    logotipoFuente: 'tallada',
    kick: 'Entró plantín', title: 'Cuándo trasplantar <span class="acc">sin matarla</span>' },
]

for (const [i, n] of NEGOCIOS.entries()) {
  const { brand } = normalizeBrand({ ...n, handle: n.nombre.toLowerCase().replace(/[^a-z]/g, '') })
  const [hecho] = await renderSpec({
    brand,
    outDir: 'placas/muestrario',
    spec: { slides: [{
      name: `m${i + 1}`, style: 'flat', type: 'body', format: 'feed',
      kick: n.kick, title: n.title,
      body: 'El cuerpo es el mismo en las cinco a propósito: lo único que cambia es la marca.',
    }] },
  })
  console.log('  ✓', n.nombre.padEnd(20), '·', (n.logotipoFuente || 'mismo').padEnd(14), '·', brand.fonts.logo.family)
}
