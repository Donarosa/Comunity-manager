// Estilo vector: fondo sólido, headline serif con itálicas de acento,
// ilustración de fondo opcional (brand.scene). Para frases aspiracionales.

import { resolverDisposicion } from '../disposiciones.mjs'
import { lockupCSS, lockupHTML, clasesDeLogotipo } from '../../brand/logotipo.mjs'

export function vectorHTML(s, ctx, fmt) {
  if (!s.headline) throw new Error(`la placa "${s.name || 'vector'}" no tiene titular`)
  const { B, F, LOGO, markCss, fontsLink } = ctx
  const V = B.colors.vector
  const C = B.colors.flat

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
<style>:root{--bg:${V.bg};--accent:${V.accent};--accent-dark:${V.accent};--accent-deep:${C.accentDeep};--dark-bg:${V.bg};--tint:${C.tint};--ink:${C.ink};--muted:${C.muted};--paper:${V.paper};--font:'${F.sans}',sans-serif;--mono:'${F.mono}',monospace;--font-logo:'${F.logo.family}',sans-serif;--font-mono-marca:'${F.logo.monogramaFamily}',sans-serif;--track-logo:${F.logo.tracking}}*{box-sizing:border-box;margin:0;padding:0}
.slide{width:${fmt.w}px;height:${fmt.h}px;position:relative;overflow:hidden;background:var(--bg);color:var(--paper);font-family:'${F.sans}',sans-serif}
.topo{position:absolute;inset:0;background-image:radial-gradient(ellipse 1500px 500px at 50% -8%,rgba(245,242,237,.10) 0%,transparent 60%),radial-gradient(ellipse 900px 320px at 18% 8%,rgba(245,242,237,.06) 0%,transparent 60%);z-index:1}
${markCss('.brand .sw', LOGO.strokeWidth)}
/* Misma firma que flat y foto. El contenedor se llama .firma y no .wm porque
   lockupCSS() ya usa .wm para el nombre: con las dos cosas llamadas igual, el
   posicionamiento absoluto del contenedor caía también sobre el nombre. */
${lockupCSS()}
.firma{position:absolute;top:64px;left:72px;z-index:6}
.content{position:relative;z-index:5;padding:${fmt.vectorPadTop}px 80px 0}
.eyebrow{font-family:'${F.mono}',monospace;font-size:23px;font-weight:600;color:var(--accent);letter-spacing:.10em;text-transform:uppercase;margin-bottom:34px}
.headline{font-family:'${F.serif}',serif;font-weight:400;font-size:${Math.round(fmt.vectorHeadline * disp.titulo)}px;line-height:1.0;letter-spacing:-.035em;color:var(--paper);max-width:920px}
.headline em{font-style:italic;color:var(--accent);font-weight:500}
${extra}
.scene{position:absolute;left:0;right:0;bottom:0;width:${fmt.w}px;height:${fmt.sceneH}px;z-index:2}
.handle{position:absolute;bottom:${fmt.vectorFootBottom}px;left:72px;z-index:6;font-family:'${F.mono}',monospace;font-size:26px;font-weight:600;color:rgba(245,242,237,.78)}
.badge{position:absolute;bottom:${fmt.vectorFootBottom - 2}px;right:72px;z-index:6;font-family:'${F.mono}',monospace;font-size:19px;font-weight:600;color:var(--paper);letter-spacing:.06em;background:rgba(245,242,237,.14);padding:12px 22px;border-radius:100px}
</style></head><body class="dark ${clasesDeLogotipo(B)}"><div class="slide"><div class="topo"></div>
<div class="firma">${lockupHTML(ctx, 38)}</div>
<div class="content">${s.eyebrow ? `<div class="eyebrow">${s.eyebrow}</div>` : ''}<h1 class="headline">${s.headline || ''}</h1></div>
${B.scene || ''}<div class="handle">${s.handle || B.handle || B.nombre}</div><div class="badge">${s.site || B.site}</div></div></body></html>`
}
