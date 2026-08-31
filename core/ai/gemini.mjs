// Cliente de la Gemini API para todo lo que genera texto o JSON estructurado.
//
// Reemplaza a claude.mjs manteniendo la misma interfaz pública:
//   - pedirJSON({ reglas, contexto, prompt, schema, effort, maxTokens })
//   - costoUSD(usage, model)
//
// Usa "Controlled generation" (responseSchema) para garantizar salida JSON
// válida, de la misma forma que claude.mjs usaba structured outputs.
// El modelo por defecto es gemini-2.0-flash, que tiene 1.500 req/día gratis
// en el tier free. Para más volumen se puede cambiar a gemini-2.5-pro.
//
// Variables de entorno requeridas:
//   GEMINI_API_KEY  — se obtiene gratis en https://aistudio.google.com/app/apikey

import { GoogleGenAI } from '@google/genai'

export const MODEL = process.env.CM_MODEL || 'gemini-2.0-flash'

// USD por millón de tokens (precios tier pago; en tier free es $0).
// Útil si en algún momento superás el free tier o cambiás de plan.
const PRECIOS = {
  'gemini-2.0-flash':    { in: 0.10,  out: 0.40 },
  'gemini-2.5-flash':    { in: 0.30,  out: 2.50 },
  'gemini-2.5-pro':      { in: 1.25,  out: 10.00 },
}

/**
 * La IA no está configurada en este servidor.
 *
 * El mensaje va a la pantalla de un dueño de comercio, así que dice qué puede
 * hacer él, no qué le falta al servidor: no tiene un archivo `.env` ni tiene
 * por qué saber qué es una clave de API. La instrucción para quien opera la
 * instalación se avisa una vez por consola.
 */
export class SinIAError extends Error {
  constructor() {
    super('El armado automático no está disponible por ahora. Podés escribir las placas a mano: el editor y la descarga funcionan igual.')
    this.name = 'SinIAError'
    this.codigo = 'sin_ia'
  }
}

let avisado = false

let _client = null
export function client() {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      if (!avisado) {
        avisado = true
        console.warn(
          '[IA] Falta GEMINI_API_KEY, así que el plan de contenido y la sugerencia de identidad quedan apagados.\n' +
          '     Se consigue gratis en https://aistudio.google.com/app/apikey y va en .env como: GEMINI_API_KEY=AIza...'
        )
      }
      throw new SinIAError()
    }
    _client = new GoogleGenAI({ apiKey: key })
  }
  return _client
}

export function costoUSD(usage, model = MODEL) {
  const p = PRECIOS[model] || PRECIOS['gemini-2.0-flash']
  const inTok  = usage?.inputTokenCount  || usage?.input_tokens  || 0
  const outTok = usage?.outputTokenCount || usage?.output_tokens || 0
  return (inTok * p.in + outTok * p.out) / 1e6
}

/**
 * Una llamada al modelo con salida JSON validada contra `schema`.
 * Misma firma que la función homónima en claude.mjs.
 *
 * @param {object}   o
 * @param {string}   o.reglas   bloque de instrucciones estables del sistema
 * @param {string}  [o.contexto] contexto específico de la marca/pedido
 * @param {string}   o.prompt   el pedido concreto del usuario
 * @param {object}   o.schema   JSON Schema de la respuesta esperada
 * @param {string}  [o.effort]  ignorado (se mapea a thinkingBudget internamente)
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
  // Armamos el system instruction combinando reglas + contexto de marca.
  const systemParts = [reglas]
  if (contexto) systemParts.push(contexto)
  const systemInstruction = systemParts.join('\n\n')

  // Mapeamos el "effort" de la interfaz original a thinkingBudget de Gemini.
  // Solo aplica a modelos que soporten thinking (gemini-2.5-*).
  const effortMap = { low: 512, medium: 2048, high: 8192, xhigh: 16384, max: 24576 }
  const thinkingBudget = effortMap[effort] ?? effortMap.medium

  const genAI = client()

  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: schema,
      maxOutputTokens: maxTokens,
      // thinkingConfig solo lo usan los modelos 2.5-*; los demás lo ignoran.
      thinkingConfig: { thinkingBudget },
    },
  })

  const texto = response.text()
  if (!texto) {
    throw new Error('El modelo devolvió una respuesta vacía. Reintentá.')
  }

  let data
  try {
    data = JSON.parse(texto)
  } catch {
    throw new Error('El modelo no devolvió JSON válido pese al schema. Reintentá.')
  }

  const usage = response.usageMetadata || {}
  return {
    data,
    usage,
    costo: costoUSD(usage, MODEL),
    model: MODEL,
  }
}
