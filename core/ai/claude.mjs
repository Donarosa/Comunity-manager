// Cliente de la Claude API para todo lo que genera texto o SVG.
//
// Tres cosas que hace acá y no en cada llamador:
//  1. Salida JSON garantizada por schema (structured outputs), así el resto del
//     código nunca parsea texto libre ni reintenta por un JSON roto.
//  2. Caché de prompt sobre el bloque de reglas, que es idéntico para todas las
//     cuentas. Con muchos clientes ese prefijo se lee una y otra vez a ~10% del
//     precio; el bloque específico de cada marca va después, sin cachear.
//  3. Contabilidad de costo por llamada, para poder decir cuánto sale un
//     usuario por mes en vez de estimarlo a ojo.

import Anthropic from '@anthropic-ai/sdk'

export const MODEL = process.env.CM_MODEL || 'claude-opus-5'

// USD por millón de tokens. Si cambiás de modelo, cambiá esto también:
// el costo reportado es lo que después define el precio de la suscripción.
const PRECIOS = {
  'claude-opus-5': { in: 5, out: 25 },
  'claude-sonnet-5': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 1, out: 5 },
}

let _client = null
export function client() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      // El SDK también resuelve un perfil de `ant auth login`, así que no
      // cortamos acá: solo avisamos si después falla la autenticación.
    }
    _client = new Anthropic()
  }
  return _client
}

export function costoUSD(usage, model = MODEL) {
  const p = PRECIOS[model] || PRECIOS['claude-opus-5']
  const inTok = usage?.input_tokens || 0
  const cacheRead = usage?.cache_read_input_tokens || 0
  const cacheWrite = usage?.cache_creation_input_tokens || 0
  const outTok = usage?.output_tokens || 0
  return (
    (inTok * p.in + cacheRead * p.in * 0.1 + cacheWrite * p.in * 1.25 + outTok * p.out) / 1e6
  )
}

class RefusalError extends Error {
  constructor(details) {
    super('El modelo rechazó la solicitud' + (details?.explanation ? `: ${details.explanation}` : '.'))
    this.name = 'RefusalError'
    this.categoria = details?.category || null
  }
}

/**
 * Una llamada al modelo con salida JSON validada contra `schema`.
 *
 * @param {object}   o
 * @param {string}   o.reglas   bloque estable, igual para todas las cuentas (se cachea)
 * @param {string}   o.contexto bloque propio de la marca/pedido (no se cachea)
 * @param {string}   o.prompt   el pedido concreto
 * @param {object}   o.schema   JSON Schema de la respuesta
 * @param {string}  [o.effort]  low | medium | high | xhigh | max
 * @param {number}  [o.maxTokens]
 * @returns {Promise<{data:any, usage:object, costo:number, model:string}>}
 */
export async function pedirJSON({
  reglas,
  contexto = '',
  prompt,
  schema,
  effort = 'medium',
  maxTokens = 8000,
}) {
  const system = [
    { type: 'text', text: reglas, cache_control: { type: 'ephemeral' } },
  ]
  if (contexto) system.push({ type: 'text', text: contexto })

  const res = await client().beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    // Claude Opus 5 puede declinar un pedido por sus clasificadores de
    // seguridad; con `fallbacks: "default"` la propia API lo reintenta en el
    // modelo recomendado en vez de devolvernos un error al usuario final.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    output_config: {
      effort,
      format: { type: 'json_schema', schema },
    },
    messages: [{ role: 'user', content: prompt }],
  })

  if (res.stop_reason === 'refusal') throw new RefusalError(res.stop_details)
  if (res.stop_reason === 'max_tokens') {
    throw new Error('La respuesta se cortó por límite de tokens. Pedí menos piezas por vez.')
  }

  const texto = res.content.filter(b => b.type === 'text').map(b => b.text).join('')
  let data
  try {
    data = JSON.parse(texto)
  } catch {
    throw new Error('El modelo no devolvió JSON válido pese al schema. Reintentá.')
  }

  return { data, usage: res.usage, costo: costoUSD(res.usage, res.model || MODEL), model: res.model || MODEL }
}
