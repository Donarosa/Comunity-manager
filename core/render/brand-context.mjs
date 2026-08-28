// Piezas de marca compartidas por los tres estilos.
//
// El logo se dibuja siempre con class="mark" y el CSS le pone fill/stroke con
// currentColor, así sirve cualquier SVG hecho de <path> y <circle> y toma el
// color correcto en fondo claro y oscuro.

export function brandContext(B = {}) {
  const F = B.fonts || {}
  const LOGO = B.logo || { viewBox: '0 0 100 100', inner: '', strokeWidth: 8, strokeWidthSmall: 7 }
  const WM = B.wordmark || { base: B.nombre || '', accent: '' }

  // Fallbacks seguros para marcas existentes sin migrar
  if (!F.sans) F.sans = 'Plus Jakarta Sans'
  if (!F.serif) F.serif = 'Bitter'
  if (!F.mono) F.mono = 'Space Mono'
  if (!F.logo) {
    F.logo = {
      preset: 'mismo',
      family: F.sans,
      caps: false,
      tracking: '-.02em',
      monogramaFamily: F.sans,
      mono: { escala: 1, tracking: '-.04em' },
    }
  } else {
    F.logo.family = F.logo.family || F.sans
    F.logo.monogramaFamily = F.logo.monogramaFamily || F.logo.family || F.sans
    F.logo.tracking = F.logo.tracking || '-.02em'
    F.logo.mono = F.logo.mono || { escala: 1, tracking: '-.04em' }
  }
  if (!B.disposicion) B.disposicion = 'clasica'
  if (!B.logotipo) {
    B.logotipo = { tipo: 'monograma', tratamiento: 'linea', escudo: 'cuadrado' }
  }

  const mark = (px, cls = 'mark') => {
    const esRaster = Boolean(LOGO.esRaster || /<image\b/i.test(LOGO.inner || ''))
    const extraClass = esRaster ? ' mark-raster' : ''
    return `<svg class="${cls}${extraClass}" width="${px}" height="${px}" viewBox="${LOGO.viewBox || '0 0 100 100'}">${LOGO.inner || ''}</svg>`
  }

  const markCss = (sel, sw) =>
    `${sel} path:not([fill]), ${sel} path[fill="none"]{stroke:currentColor;stroke-width:${sw || 8};stroke-linecap:round;stroke-linejoin:round}` +
    `${sel} circle:not([stroke]):not([fill]){fill:currentColor}` +
    `${sel}.mark-raster, .mark-raster{background:rgba(255,255,255,0.94);border-radius:14%;padding:2px;box-shadow:0 2px 6px rgba(0,0,0,0.12);}`

  // Fuentes de marca + fuentes display para firmas, sellos y monogramas
  const urlFuentesLogo = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@600;800&family=Syne:wght@700;800&family=Playfair+Display:wght@700&family=Bebas+Neue&display=swap'
  const listaUrls = [...(F.importUrls || [F.importUrl].filter(Boolean)), urlFuentesLogo]
  const fontsLink = listaUrls.map(u => `<link href="${u}" rel="stylesheet">`).join('')

  const wordmarkHTML = accentClass =>
    WM.accent ? `${WM.base}<span class="${accentClass}">${WM.accent}</span>` : WM.base

  return { B, F, LOGO, WM, mark, markCss, fontsLink, wordmarkHTML }
}
