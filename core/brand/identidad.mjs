// Identidad completa sugerida por IA, para el negocio que no tiene nada.
//
// Es UNA sola llamada que devuelve logos, colores y tipografía juntos. No por
// ahorrar tokens —que también— sino porque una identidad es un conjunto: un
// logo pensado en aparte del color termina peleándose con el color.
//
// El modelo elige el color y la familia tipográfica; la paleta de 16 tonos y el
// contraste los calcula `palette.mjs`. El criterio manda sobre la aritmética y
// la aritmética sobre el criterio: cada uno hace lo suyo.

import { pedirJSON } from '../ai/claude.mjs'
import { sanitizeLogoInner } from './schema.mjs'
import { REGLAS_LOGO } from './logo.mjs'
import { derivePalette } from './palette.mjs'
import { FONT_PRESETS } from './fonts.mjs'
import { parseHex } from './color.mjs'

const REGLAS = `${REGLAS_LOGO}

Además del logo, elegís el color y la tipografía de la marca. Tres cosas sobre eso:

COLOR
- Proponés 3 colores principales distintos entre sí, no tres versiones del mismo. Distintos de familia: si uno es un verde, los otros dos no son verdes.
- El color se va a usar como acento sobre fondo claro y como fondo pleno. Los pasteles muy claros y los flúor no funcionan: se recomienda un rango medio-oscuro, de los que aguantan texto blanco encima.
- Evitá el violeta-azulado saturado tipo #7C3AED y los degradés violeta-celeste: son la marca registrada de lo hecho con IA y se nota.
- El color tiene que tener que ver con el rubro sin caer en el cliché exacto: para una verdulería, un verde oliva o un tomate quemado antes que el verde manzana de siempre.
- Devolvés el color en hexadecimal de seis dígitos, con numeral.

TIPOGRAFÍA
- Elegís UNA de las opciones disponibles por su id exacto. No inventes otra.

EXPLICACIONES
- Cada explicación va dirigida al dueño del negocio, en una frase, sin jerga de diseño. "Un verde apagado, más de campo que de farmacia" sirve; "una paleta que transmite confianza y modernidad" no dice nada.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lectura', 'colores', 'tipografia', 'logos'],
  properties: {
    lectura: {
      type: 'string',
      description: 'Cómo leíste el negocio y qué imagen le conviene, en dos frases, dirigido al dueño.',
    },
    colores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['hex', 'nombre', 'porque'],
        properties: {
          hex: { type: 'string', description: 'Color en formato #RRGGBB.' },
          nombre: { type: 'string', description: 'Cómo se llama en castellano: "bordó", "verde oliva", "ladrillo".' },
          porque: { type: 'string', description: 'Por qué le va a este negocio, en una frase.' },
        },
      },
    },
    tipografia: {
      type: 'object',
      additionalProperties: false,
      required: ['preset', 'porque'],
      properties: {
        preset: { type: 'string', enum: FONT_PRESETS.map(f => f.id) },
        porque: { type: 'string', description: 'Por qué esta y no otra, en una frase.' },
      },
    },
    logos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['concepto', 'inner', 'strokeWidth'],
        properties: {
          concepto: { type: 'string' },
          inner: { type: 'string' },
          strokeWidth: { type: 'integer' },
        },
      },
    },
  },
}

function limpiarLogo(p, i) {
  const inner = sanitizeLogoInner(p.inner)
  if (!inner) return null
  const sw = Math.min(10, Math.max(4, Number(p.strokeWidth) || 8))
  return {
    id: `logo-${i + 1}`,
    concepto: String(p.concepto || '').trim(),
    logo: {
      viewBox: '0 0 100 100',
      inner,
      strokeWidth: sw,
      strokeWidthSmall: Math.max(3, Math.round(sw * 0.85)),
      origen: 'ia',
    },
  }
}

/**
 * Sugiere identidad completa: 4 logos, 3 colores y una tipografía.
 * @param {object} negocio { nombre, rubro, queVende, publico, diferencial, ciudad }
 */
export async function sugerirIdentidad(negocio = {}) {
  const { nombre, rubro, queVende, publico, diferencial, ciudad } = negocio
  if (!nombre) throw new Error('falta el nombre del negocio')

  const opciones = FONT_PRESETS.map(f => `- ${f.id}: ${f.label}. ${f.vibe}`).join('\n')
  const contexto = [
    `Negocio: ${nombre}`,
    rubro && `Rubro: ${rubro}`,
    queVende && `Qué vende: ${queVende}`,
    publico && `A quién le vende: ${publico}`,
    diferencial && `Lo que lo diferencia: ${diferencial}`,
    ciudad && `Dónde: ${ciudad}`,
    `\nTipografías disponibles (elegí una por su id):\n${opciones}`,
  ].filter(Boolean).join('\n')

  const { data, costo } = await pedirJSON({
    reglas: REGLAS,
    contexto,
    prompt: 'Armale la identidad a este negocio: 4 isotipos distintos, 3 colores posibles y una tipografía. Todo se va a ver en placas de Instagram.',
    schema: SCHEMA,
    effort: 'high',
    maxTokens: 10000,
  })

  const logos = (data.logos || []).map(limpiarLogo).filter(Boolean)
  if (!logos.length) throw new Error('Ninguna propuesta de logo pasó la validación. Reintentá.')

  // El modelo eligió el color; acá se comprueba que exista de verdad y se
  // deriva la paleta con la que se va a ver. Si un color no se puede parsear
  // se descarta en vez de romper el paso entero.
  const colores = (data.colores || []).map(c => {
    try {
      parseHex(c.hex)
      const { flat, warnings } = derivePalette({ accent: c.hex })
      return {
        hex: c.hex.toUpperCase(),
        nombre: String(c.nombre || '').trim(),
        porque: String(c.porque || '').trim(),
        muestra: { accent: flat.accent, darkBg: flat.darkBg, tint: flat.tint, ink: flat.ink, bg: flat.bg },
        avisos: warnings,
      }
    } catch { return null }
  }).filter(Boolean)

  if (!colores.length) throw new Error('Ningún color sugerido era válido. Reintentá.')

  const preset = FONT_PRESETS.find(f => f.id === data.tipografia?.preset) || FONT_PRESETS[0]

  return {
    lectura: String(data.lectura || '').trim(),
    logos,
    colores,
    tipografia: { preset: preset.id, label: preset.label, porque: String(data.tipografia?.porque || '').trim() },
    costo,
  }
}
