// Utilidades de color en OKLCH.
//
// Por qué OKLCH y no HSL: en HSL, dos colores con la misma "lightness" se ven
// con brillos muy distintos (un amarillo al 50% se ve clarísimo, un azul al 50%
// se ve oscuro). Eso arruina una paleta derivada automáticamente. OKLCH es
// perceptualmente uniforme: bajar L 10 puntos oscurece lo mismo en cualquier
// tono. Es lo que permite que el usuario cargue UN color y salgan doce
// coherentes.

/* ── sRGB ↔ OKLCH ───────────────────────────────────────── */

export function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`color inválido: "${hex}" (esperaba #RRGGBB)`)
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x)
const toLinear = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const toGamma = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)

export function hexToOklch(hex) {
  const { r, g, b } = parseHex(hex)
  const R = toLinear(r), G = toLinear(g), B = toLinear(b)

  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  const C = Math.sqrt(a * a + bb * bb)
  let H = (Math.atan2(bb, a) * 180) / Math.PI
  if (H < 0) H += 360
  return { L, C, H }
}

export function oklchToHex({ L, C, H }) {
  const hr = (H * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3

  const R = toGamma(clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s))
  const G = toGamma(clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s))
  const B = toGamma(clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s))

  const hx = v => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')
  return `#${hx(R)}${hx(G)}${hx(B)}`.toUpperCase()
}

/* ── derivaciones ───────────────────────────────────────── */

/** Devuelve el color con L y C ajustados. `L` y `C` absolutos si se pasan. */
export function tune(hex, { L, C, H, dL = 0, dC = 0 } = {}) {
  const c = hexToOklch(hex)
  return oklchToHex({
    L: clamp01(L ?? c.L + dL),
    C: Math.max(0, C ?? c.C + dC),
    H: H ?? c.H,
  })
}

/** Un gris tintado con el tono del acento — evita el gris "sucio" neutro. */
export function tinted(hex, L, C = 0.012) {
  const { H } = hexToOklch(hex)
  return oklchToHex({ L, C, H })
}

export function relLuminance(hex) {
  const { r, g, b } = parseHex(hex)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function contrast(a, b) {
  const la = relLuminance(a), lb = relLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Sube o baja L hasta alcanzar el contraste pedido contra `bg`. */
export function ensureContrast(hex, bg, ratio = 4.5) {
  const bgLum = relLuminance(bg)
  const dir = bgLum > 0.4 ? -1 : 1 // fondo claro → oscurecer; fondo oscuro → aclarar
  let c = hexToOklch(hex)
  let out = oklchToHex(c)
  for (let i = 0; i < 40 && contrast(out, bg) < ratio; i++) {
    c = { ...c, L: clamp01(c.L + dir * 0.025) }
    out = oklchToHex(c)
    if (c.L <= 0 || c.L >= 1) break
  }
  return out
}

export function rgbTuple(hex) {
  const { r, g, b } = parseHex(hex)
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

export function rgba(hex, alpha) {
  const [r, g, b] = rgbTuple(hex)
  return `rgba(${r},${g},${b},${alpha})`
}
