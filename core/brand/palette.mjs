// Deriva la paleta completa (16 colores) a partir de uno o dos que carga el
// usuario. Es el corazón del onboarding: una pyme sabe "mi color es este
// bordó", no sabe qué es un `accentOnDark` ni un `hair`.
//
// Todo se calcula en OKLCH desde el tono del acento, así los grises no salen
// neutros y sucios sino tintados con la marca, y después se fuerza contraste
// para que ningún texto quede ilegible por elegir un amarillo flúor.

import { tune, tinted, ensureContrast, hexToOklch, contrast } from './color.mjs'

/**
 * @param {object}  o
 * @param {string}  o.accent     color principal de la marca (#RRGGBB)
 * @param {string} [o.deep]      color secundario/oscuro; si falta se deriva
 * @returns {{flat:object, vector:object, foto:object, warnings:string[]}}
 */
export function derivePalette({ accent, deep } = {}) {
  if (!accent) throw new Error('falta el color principal (accent)')
  const warnings = []
  const { H, C } = hexToOklch(accent)

  // Un acento muy pálido o muy claro no se lee sobre fondo blanco: lo bajamos
  // hasta 4.5:1 y avisamos, en vez de entregar una placa ilegible en silencio.
  const bg = tinted(accent, 0.985, 0.006)
  const accentSafe = ensureContrast(accent, bg, 4.5)
  if (accentSafe !== accent.toUpperCase()) {
    warnings.push(
      `El color ${accent} no contrasta lo suficiente sobre fondo claro. ` +
      `Para los textos se usa ${accentSafe}; el color original se mantiene en los fondos.`
    )
  }

  // Cromas acotados: si el color de marca es muy saturado, los grises tintados
  // heredarían ese exceso y la placa se vería teñida.
  const cSoft = Math.min(C, 0.16)
  const grey = L => tinted(accent, L, Math.min(cSoft * 0.12, 0.014))

  const darkBg = deep ? tune(deep, { L: 0.24 }) : tune(accent, { L: 0.24, C: Math.min(cSoft, 0.09) })
  const accentDeep = tune(accentSafe, { dL: -0.14, dC: 0.01 })
  const accentOnDark = ensureContrast(
    tune(accent, { L: 0.84, C: Math.min(cSoft, 0.11) }),
    darkBg,
    4.5
  )

  const flat = {
    accent: accentSafe,
    accentDeep,
    accentOnDark,
    darkBg,
    bg,
    tint: tinted(accent, 0.955, Math.min(cSoft * 0.28, 0.045)),
    paper: '#FFFFFF',
    ink: grey(0.19),
    fg: grey(0.27),
    muted: grey(0.47),
    soft: grey(0.66),
    hair: tinted(accent, 0.915, Math.min(cSoft * 0.1, 0.012)),
  }

  const vectorBg = darkBg
  const vector = {
    bg: vectorBg,
    accent: ensureContrast(accentOnDark, vectorBg, 4.5),
    paper: tinted(accent, 0.975, 0.008),
  }

  const foto = { bg: vectorBg, accent: vector.accent }

  // Chequeo final de los pares que realmente se leen en una placa.
  const pairs = [
    ['título sobre fondo claro', flat.ink, flat.bg, 7],
    ['cuerpo sobre fondo claro', flat.muted, flat.bg, 4.5],
    ['acento sobre fondo oscuro', flat.accentOnDark, flat.darkBg, 4.5],
    ['headline sobre fondo vector', vector.paper, vector.bg, 7],
  ]
  for (const [what, a, b, min] of pairs) {
    const r = contrast(a, b)
    if (r < min) warnings.push(`Contraste bajo en ${what}: ${r.toFixed(1)}:1 (mínimo ${min}:1).`)
  }

  return { flat, vector, foto, warnings, hue: Math.round(H) }
}
