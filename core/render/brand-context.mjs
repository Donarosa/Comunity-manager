// Piezas de marca compartidas por los tres estilos.
//
// El logo se dibuja siempre con class="mark" y el CSS le pone fill/stroke con
// currentColor, así sirve cualquier SVG hecho de <path> y <circle> y toma el
// color correcto en fondo claro y oscuro.

export function brandContext(B) {
  const F = B.fonts
  const LOGO = B.logo
  const WM = B.wordmark

  const mark = (px, cls = 'mark') =>
    `<svg class="${cls}" width="${px}" height="${px}" viewBox="${LOGO.viewBox}">${LOGO.inner}</svg>`

  const markCss = (sel, sw) =>
    `${sel} path{fill:none;stroke:currentColor;stroke-width:${sw};stroke-linecap:round;stroke-linejoin:round}` +
    `${sel} circle{fill:currentColor}`

  const fontsLink = `<link href="${F.importUrl}" rel="stylesheet">`

  const wordmarkHTML = accentClass =>
    WM.accent ? `${WM.base}<span class="${accentClass}">${WM.accent}</span>` : WM.base

  return { B, F, LOGO, WM, mark, markCss, fontsLink, wordmarkHTML }
}
