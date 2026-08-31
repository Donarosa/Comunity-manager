// De qué puede publicar un negocio.
//
// Es la lista de temas que la pantalla ofrece como atajo a quien abre la
// aplicación sin saber qué poner. Hay dos caminos y no son equivalentes.
//
// Con IA salen temas que dependen de saber del rubro —"cuándo hay que cambiar
// las pastillas de freno", "cómo conservar el pan"— y son los que de verdad
// sirven. Sin IA se arman combinando lo que el negocio escribió en el alta, y
// ahí hay un límite que conviene tener presente: las plantillas no saben el
// verbo del rubro. Una panadería *hace* su producto, un vivero lo *cría* y una
// bicicletería lo *vende y repara*. Una plantilla del tipo "Cómo hacemos X" le
// proponía a la bicicletería hablar de "cómo hacemos bicicletas urbanas", que
// es falso sobre su propio negocio — y un tema falso es peor que ninguno.
//
// Por eso el respaldo local nunca conjuga un verbo sobre el producto: cita lo
// que el negocio ya escribió, o pregunta por cosas que son ciertas en cualquier
// rubro (quiénes trabajan, dónde está).

import { pedirJSON } from '../ai/gemini.mjs'
import { contextoDeMarca } from './plan.mjs'

const CUANTOS = 5

/* ── el respaldo, sin IA ─────────────────────────────────── */

const partir = s => String(s || '').split(/,|;| y (?=\w)/).map(x => x.trim()).filter(Boolean)
const minuscula = s => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '')
const Mayuscula = s => (s ? s.charAt(0).toUpperCase() + minuscula(s).slice(1) : '')

/**
 * Temas armados con lo que el negocio ya escribió, sin llamar a la IA.
 *
 * Solo entra lo que se puede afirmar sin inventar nada: una cita del
 * diferencial, un producto nombrado sin decir qué se hace con él, y dos
 * preguntas que valen para cualquier negocio.
 */
export function temasLocales(negocio = {}, { evitar = [] } = {}) {
  const productos = partir(negocio.queVende)
  // Un diferencial muy largo no entra en un chip y queda cortado a la mitad.
  const difs = partir(negocio.diferencial).filter(d => d.length <= 38)
  const temas = []

  for (const d of difs.slice(0, 2)) temas.push(`Por qué ${minuscula(d)}`)
  for (const p of productos.slice(0, 2)) {
    if (p.length <= 34) temas.push(`${Mayuscula(p)}, de cerca`)
  }
  temas.push('Quiénes trabajan acá')
  if (negocio.ciudad) temas.push(`Dónde estamos en ${negocio.ciudad}`)

  const usados = new Set(evitar.map(t => String(t).toLowerCase().trim()))
  return temas.filter(t => !usados.has(t.toLowerCase())).slice(0, CUANTOS)
}

/* ── con IA ──────────────────────────────────────────────── */

const REGLAS = `Proponés temas de publicación para el Instagram de una micro pyme argentina.

Cada tema es un título corto —de 3 a 7 palabras— que describe DE QUÉ trata la
publicación. No es el texto de la placa: es el asunto.

Reglas que no se negocian:
- Solo temas que ESE negocio puede contar con verdad. Si no sabés si fabrica,
  revende o repara lo que vende, no lo afirmes: preguntá por el producto sin
  atribuirle un proceso.
- Nada genérico que le sirva a cualquier rubro ("calidad y servicio",
  "nuestra historia"). Si el tema no cambia al cambiar de negocio, no va.
- Al menos dos tienen que ser útiles para quien lo lee aunque nunca compre:
  un consejo, una señal de alerta, algo que enseñe del oficio.
- Escribilos en voseo rioplatense, sin signos de admiración ni emojis.
- No repitas temas ya publicados.`

const SCHEMA = {
  type: 'object',
  properties: {
    temas: {
      type: 'array',
      minItems: CUANTOS,
      maxItems: CUANTOS,
      items: { type: 'string', description: 'De 3 a 7 palabras. Sin punto final.' },
    },
  },
  required: ['temas'],
}

/**
 * Le pide a la IA los temas. Devuelve también el costo, para el contador.
 * Si la IA no está configurada, esto lanza: quien llama decide el respaldo.
 */
export async function generarTemas({ brand, evitar = [] }) {
  const yaHechos = evitar.length
    ? `\n\nYa publicó sobre esto, no lo repitas:\n${evitar.map(t => `- ${t}`).join('\n')}`
    : ''

  const { data, usage, costo } = await pedirJSON({
    reglas: REGLAS,
    contexto: contextoDeMarca(brand),
    prompt: `Proponé ${CUANTOS} temas para las próximas publicaciones de este negocio.${yaHechos}`,
    schema: SCHEMA,
    // Es una lista corta: no hace falta pensar mucho y sale más barato.
    effort: 'low',
    maxTokens: 900,
  })

  const temas = (data?.temas || [])
    .map(t => String(t).trim().replace(/[.·]+$/, ''))
    .filter(Boolean)
    .slice(0, CUANTOS)

  return { temas, usage, costo }
}
