// Deriva la paleta completa (16 colores) a partir de los colores que carga el
// usuario. Es el corazón del onboarding: una pyme sabe "mi color es este
// bordó", no sabe qué es un `accentOnDark` ni un `hair`.
//
// Todo se calcula en OKLCH desde el tono del acento, así los grises no salen
// neutros y sucios sino tintados con la marca, y después se fuerza contraste
// para que ningún texto quede ilegible por elegir un amarillo flúor.
//
// ── Más de un color ───────────────────────────────────────────────────────
//
// Un negocio con dos colores es lo normal, no la excepción: el logo tiene un
// azul y un naranja y los dos son suyos. Hasta acá se guardaba uno solo.
//
// Se guardan hasta tres, y **no se mezclan en la misma placa**: cada uno arma
// su propia paleta y las placas se van turnando. En un carrusel la portada sale
// con el principal, la segunda con el secundario y la tercera con el terciario.
// Una placa suelta usa siempre el principal.
//
// La razón de turnarlos en vez de repartirlos adentro de una placa es que tres
// colores fuertes juntos en 1080×1350 se pelean, y el que pierde es el texto.
// Turnándolos, cada placa se lee limpia y el conjunto igual muestra la marca
// entera — que es lo que el dueño quería cuando dijo "tengo dos colores".
//
// Lo que **no** rota son los neutros: el papel, la tinta, los grises y los
// filetes salen siempre del color principal. Si rotaran también, la segunda
// placa tendría otro blanco y otro gris y el carrusel se leería como dos
// marcas distintas en vez de una con dos colores.

import { tune, tinted, ensureContrast, hexToOklch, contrast } from './color.mjs'

/** Los neutros: salen una sola vez, del color principal, y no rotan. */
function neutrosDe(principal) {
  const { C } = hexToOklch(principal)
  // Cromas acotados: si el color de marca es muy saturado, los grises tintados
  // heredarían ese exceso y la placa se vería teñida.
  const cSoft = Math.min(C, 0.16)
  const grey = L => tinted(principal, L, Math.min(cSoft * 0.12, 0.014))
  return {
    bg: tinted(principal, 0.985, 0.006),
    paper: '#FFFFFF',
    ink: grey(0.19),
    fg: grey(0.27),
    muted: grey(0.47),
    soft: grey(0.66),
    hair: tinted(principal, 0.915, Math.min(cSoft * 0.1, 0.012)),
  }
}

/** Todo lo que sí rota: el acento, sus variantes, el fondo oscuro y el tinte. */
function unaPaleta(color, neutros, warnings, etiqueta) {
  const { C } = hexToOklch(color)
  const cSoft = Math.min(C, 0.16)

  // Un acento muy pálido o muy claro no se lee sobre fondo blanco: lo bajamos
  // hasta 4.5:1 y avisamos, en vez de entregar una placa ilegible en silencio.
  const accentSafe = ensureContrast(color, neutros.bg, 4.5)
  if (accentSafe !== color.toUpperCase()) {
    warnings.push(
      `El color ${etiqueta} ${color} no contrasta lo suficiente sobre fondo claro. ` +
      `Para los textos se usa ${accentSafe}; el color original se mantiene en los fondos.`
    )
  }

  const darkBg = tune(color, { L: 0.24, C: Math.min(cSoft, 0.09) })
  const accentDeep = tune(accentSafe, { dL: -0.14, dC: 0.01 })
  const accentOnDark = ensureContrast(
    tune(color, { L: 0.84, C: Math.min(cSoft, 0.11) }),
    darkBg,
    4.5
  )

  const flat = {
    ...neutros,
    accent: accentSafe,
    accentDeep,
    accentOnDark,
    darkBg,
    tint: tinted(color, 0.955, Math.min(cSoft * 0.28, 0.045)),
  }

  const vector = {
    bg: darkBg,
    accent: ensureContrast(accentOnDark, darkBg, 4.5),
    paper: tinted(color, 0.975, 0.008),
  }

  const foto = { bg: darkBg, accent: vector.accent }

  // Chequeo final de los pares que realmente se leen en una placa.
  const pares = [
    ['título sobre fondo claro', flat.ink, flat.bg, 7],
    ['cuerpo sobre fondo claro', flat.muted, flat.bg, 4.5],
    ['acento sobre fondo oscuro', flat.accentOnDark, flat.darkBg, 4.5],
    ['headline sobre fondo vector', vector.paper, vector.bg, 7],
  ]
  for (const [que, a, b, min] of pares) {
    const r = contrast(a, b)
    if (r < min) warnings.push(`Contraste bajo en ${que} (${etiqueta}): ${r.toFixed(1)}:1 (mínimo ${min}:1).`)
  }

  return { flat, vector, foto }
}

/** Distancia de tono en grados, por el lado corto de la rueda. */
const distanciaDeTono = (a, b) => {
  const d = Math.abs(hexToOklch(a).H - hexToOklch(b).H) % 360
  return d > 180 ? 360 - d : d
}

const ETIQUETAS = ['principal', 'secundario', 'terciario']

/**
 * @param {object}  o
 * @param {string}  o.accent      color principal de la marca (#RRGGBB)
 * @param {string} [o.secundario] segundo color de marca; opcional
 * @param {string} [o.terciario]  tercero; opcional
 * @param {string} [o.etiqueta]   cómo llamar al principal en los avisos. Lo usa
 *                                el selector de la web, que deriva un color por
 *                                vez: sin esto, al revisar el terciario el
 *                                aviso decía "el color principal".
 * @returns {{flat:object, vector:object, foto:object, paletas:object[], warnings:string[], hue:number}}
 */
export function derivePalette({ accent, secundario, terciario, etiqueta } = {}) {
  if (!accent) throw new Error('falta el color principal (accent)')
  const warnings = []
  const { H } = hexToOklch(accent)

  const colores = [accent, secundario, terciario].filter(Boolean)
  const neutros = neutrosDe(accent)
  const nombres = etiqueta ? [etiqueta, ...ETIQUETAS.slice(1)] : ETIQUETAS
  const paletas = colores.map((c, i) => unaPaleta(c, neutros, warnings, nombres[i]))

  /* Dos colores casi iguales no se turnan: se repiten.
   *
   * Turnar entre un bordó y otro bordó cuatro grados más allá no se ve, y el
   * dueño queda esperando un cambio que nunca llega. Vale más decírselo en el
   * alta que dejar que lo descubra mirando un carrusel que parece de un color
   * solo. No se bloquea: es su marca, y puede tener dos bordós. */
  for (let i = 1; i < colores.length; i++) {
    for (let j = 0; j < i; j++) {
      if (distanciaDeTono(colores[i], colores[j]) < 14) {
        warnings.push(
          `El ${nombres[i]} (${colores[i]}) es casi el mismo tono que el ${nombres[j]} ` +
          `(${colores[j]}). Las placas que los usen van a verse iguales.`
        )
      }
    }
  }

  // `flat`, `vector` y `foto` sueltos siguen siendo los del principal: es lo que
  // esperan las marcas que ya están guardadas y todo lo que lee `colors.flat`.
  return { ...paletas[0], paletas, warnings, hue: Math.round(H) }
}

/**
 * Qué paleta le toca a una placa.
 *
 * La regla es el orden: la placa 0 va con el principal, la 1 con el secundario,
 * la 2 con el terciario, y desde ahí vuelve a empezar. Una placa puede pedir
 * otra con `slide.paleta`, que es lo que usa el editor cuando alguien cambia el
 * color de una pieza a mano.
 */
export function paletaDeLaPlaca(brand, indice = 0, slide = {}) {
  const paletas = brand?.colors?.paletas
  if (!Array.isArray(paletas) || paletas.length < 2) return brand?.colors || null
  const pedida = Number(slide?.paleta)
  const i = Number.isInteger(pedida) ? pedida : indice
  return paletas[((i % paletas.length) + paletas.length) % paletas.length]
}
