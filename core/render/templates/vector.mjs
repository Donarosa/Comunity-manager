// Estilo vector: fondo sólido, headline serif con itálicas de acento,
// ilustración de fondo opcional (brand.scene). Para frases aspiracionales.

import { resolverDisposicion } from '../disposiciones.mjs'

export function vectorHTML(s, ctx, fmt) {
  const { B, F, LOGO, WM, mark, markCss, fontsLink } = ctx
  const V = B.colors.vector

  // Vector es un estilo de una sola pieza —una frase sobre color pleno— así que
  // recibe una versión reducida de la disposición: escala del titular y
  // alineación. No tendría sentido meterle un kicker en bloque o una ficha.
  const disp = resolverDisposicion(s.disposicion || B.disposicion)
  const centrado = disp.id === 'centrada'
  const extra = centrado
    ? '.content{text-align:center}.headline{margin:0 auto}.eyebrow{letter-spacing:.16em}'
    : disp.id === 'bloque'
      ? `.eyebrow{background:var(--accent);color:var(--bg);display:inline-block;padding:9px 16px;border-radius:2px}`
      : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
${fontsLink}
<style>:root{--bg:${V.bg};--accent:${V.accent};--paper:${V.paper}}*{box-sizing:border-box;margin:0;padding:0}
.slide{width:${fmt.w}px;height:${fmt.h}px;position:relative;overflow:hidden;background:var(--bg);color:var(--paper);font-family:'${F.sans}',sans-serif}
.topo{position:absolute;inset:0;background-image:radial-gradient(ellipse 1500px 500px at 50% -8%,rgba(245,242,237,.10) 0%,transparent 60%),radial-gradient(ellipse 900px 320px at 18% 8%,rgba(245,242,237,.06) 0%,transparent 60%);z-index:1}
.wm{position:absolute;top:64px;left:72px;display:flex;align-items:center;gap:16px;z-index:6}
.wm .sym{width:56px;height:56px;border-radius:15px;background:rgba(245,242,237,.16);color:var(--paper);display:flex;align-items:center;justify-content:center}
${markCss('.wm .sym', LOGO.strokeWidth)}
.wm .sym svg{width:30px;height:30px}.wm .txt{font-size:27px;font-weight:700;color:var(--paper);letter-spacing:-.01em}
.content{position:relative;z-index:5;padding:${fmt.vectorPadTop}px 80px 0}
.eyebrow{font-family:'${F.mono}',monospace;font-size:23px;font-weight:600;color:var(--accent);letter-spacing:.10em;text-transform:uppercase;margin-bottom:34px}
.headline{font-family:'${F.serif}',serif;font-weight:400;font-size:${Math.round(fmt.vectorHeadline * disp.titulo)}px;line-height:1.0;letter-spacing:-.035em;color:var(--paper);max-width:920px}
.headline em{font-style:italic;color:var(--accent);font-weight:500}
${extra}
.scene{position:absolute;left:0;right:0;bottom:0;width:${fmt.w}px;height:${fmt.sceneH}px;z-index:2}
.handle{position:absolute;bottom:${fmt.vectorFootBottom}px;left:72px;z-index:6;font-family:'${F.mono}',monospace;font-size:26px;font-weight:600;color:rgba(245,242,237,.78)}
.badge{position:absolute;bottom:${fmt.vectorFootBottom - 2}px;right:72px;z-index:6;font-family:'${F.mono}',monospace;font-size:19px;font-weight:600;color:var(--paper);letter-spacing:.06em;background:rgba(245,242,237,.14);padding:12px 22px;border-radius:100px}
</style></head><body><div class="slide"><div class="topo"></div>
<div class="wm"><div class="sym">${mark(30)}</div><div class="txt">${WM.base}${WM.accent || ''}</div></div>
<div class="content"><div class="eyebrow">${s.eyebrow}</div><h1 class="headline">${s.headline}</h1></div>
${B.scene || ''}<div class="handle">${s.handle || B.handle}</div><div class="badge">${s.site || B.site}</div></div></body></html>`
}
