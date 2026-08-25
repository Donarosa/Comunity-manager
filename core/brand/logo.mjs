// Generación de logo por IA.
//
// El logo no se genera como imagen sino como geometría SVG: el modelo escribe
// los <path> y <circle> directamente. Eso tiene tres consecuencias buenas:
// cuesta lo mismo que un texto (centavos, no dólares por imagen), sale
// vectorial —escala a cualquier tamaño sin pixelarse— y entra tal cual en el
// motor, que ya dibuja el logo con currentColor sobre fondo claro y oscuro.

import { pedirJSON } from '../ai/claude.mjs'
import { sanitizeLogoInner } from './schema.mjs'

export const REGLAS_LOGO = `Sos un diseñador de identidad especializado en isotipos monolineales para micro y pequeñas empresas. Diseñás en SVG crudo: escribís la geometría a mano, con criterio de diseñador, no de programador.

RESTRICCIONES TÉCNICAS — son absolutas, un logo que las viole se descarta:
- El lienzo es un viewBox "0 0 100 100". Toda la geometría vive ahí adentro, con un margen de al menos 8 unidades en los cuatro lados.
- Solo podés usar elementos <path> y <circle>. Nada de <rect>, <line>, <polygon>, <g>, <text> ni <defs>.
- <path> lleva únicamente el atributo d. <circle> lleva únicamente cx, cy y r.
- No pongas fill, stroke, stroke-width, class, style ni ningún atributo de presentación. El color y el grosor los aplica el sistema.
- Los <path> se van a dibujar como trazo (contorno), nunca rellenos. Los <circle> se van a dibujar rellenos y sólidos.
- En el atributo d usá solo comandos M, L, C, Q, A, Z y números. Nada de comandos relativos en minúscula: dificultan la revisión.

CRITERIOS DE DISEÑO:
- Monolineal: un trazo de grosor uniforme, como un dibujo hecho de alambre.
- Tiene que leerse a 40 píxeles. Si a ese tamaño los detalles se empastan, el logo está mal. Como regla: máximo 3 o 4 trazos, ningún hueco menor a 6 unidades.
- Geometría simple y decidida: círculos, arcos, ángulos rectos, diagonales a 45°. Evitá curvas orgánicas irregulares y cualquier cosa que parezca dibujada a pulso.
- Un solo concepto por logo. Un símbolo que dice una cosa gana siempre a uno que intenta decir tres.
- Buscá la abstracción del oficio, no la ilustración literal. Para una panadería, mejor la geometría de una espiga o el arco de un horno que un croissant dibujado. Para un estudio contable, mejor una estructura de ejes o un ábaco abstracto que un signo pesos.
- Evitá los clichés del rubro y los símbolos genéricos de app (el pin de mapa, el chat globo, el engranaje, el cohete, el corazón).
- No intentes formar letras ni monogramas: a 40 píxeles y en trazo, las letras se leen mal y compiten con el nombre que va al lado.

Devolvés exactamente 3 propuestas distintas entre sí — distintas de concepto, no la misma forma rotada. Cada una con una explicación de una frase de qué representa, escrita para que la entienda el dueño del negocio, sin jerga de diseño.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['propuestas'],
  properties: {
    propuestas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['concepto', 'inner', 'strokeWidth'],
        properties: {
          concepto: { type: 'string', description: 'Qué representa, en una frase, sin jerga.' },
          inner: {
            type: 'string',
            description: 'Los elementos <path> y <circle>, concatenados, sin atributos de presentación.',
          },
          strokeWidth: {
            type: 'integer',
            description: 'Grosor del trazo sobre el viewBox de 100. Entre 5 y 10.',
          },
        },
      },
    },
  },
}

/**
 * Genera 3 propuestas de isotipo para un negocio.
 * @param {object} negocio { nombre, rubro, queVende, publico, diferencial, ciudad }
 * @returns {Promise<{propuestas:Array, costo:number, usage:object}>}
 */
export async function generarLogo(negocio = {}) {
  const { nombre, rubro, queVende, publico, diferencial, ciudad } = negocio
  if (!nombre) throw new Error('falta el nombre del negocio')

  const contexto = [
    `Negocio: ${nombre}`,
    rubro && `Rubro: ${rubro}`,
    queVende && `Qué vende: ${queVende}`,
    publico && `A quién le vende: ${publico}`,
    diferencial && `Lo que lo diferencia: ${diferencial}`,
    ciudad && `Dónde: ${ciudad}`,
  ].filter(Boolean).join('\n')

  const { data, usage, costo } = await pedirJSON({
    reglas: REGLAS_LOGO,
    contexto,
    prompt: `Diseñá 3 isotipos para este negocio. Recordá: se van a ver en la esquina de una placa de Instagram, a 40 píxeles, en un solo color.`,
    schema: SCHEMA,
    effort: 'high',
    maxTokens: 6000,
  })

  // El sanitizador es la última línea: nada que venga del modelo entra a un
  // render sin pasar por acá.
  const propuestas = (data.propuestas || [])
    .map((p, i) => {
      const inner = sanitizeLogoInner(p.inner)
      if (!inner) return null
      const sw = Math.min(10, Math.max(4, Number(p.strokeWidth) || 8))
      return {
        id: `opcion-${i + 1}`,
        concepto: String(p.concepto || '').trim(),
        logo: {
          viewBox: '0 0 100 100',
          inner,
          strokeWidth: sw,
          strokeWidthSmall: Math.max(3, Math.round(sw * 0.85)),
          origen: 'ia',
        },
      }
    })
    .filter(Boolean)

  if (!propuestas.length) {
    throw new Error('Ninguna propuesta pasó la validación de SVG. Reintentá.')
  }

  return { propuestas, usage, costo }
}
