// Estilo foto: foto de fondo con scrim oscuro, frase en dos líneas.
// La foto la pone el usuario: `photo` (ruta en disco) o `photoData` (data URI).

import { readFileSync, existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'
import { tune, rgba } from '../../brand/color.mjs'
import { resolverDisposicion } from '../disposiciones.mjs'
import { lockupCSS, lockupHTML, clasesDeLogotipo } from '../../brand/logotipo.mjs'

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }

export function photoSource(s) {
  if (s.photoData) return s.photoData
  if (!s.photo) throw new Error(`la placa "${s.name}" es style:"foto" y no tiene campo photo`)
  if (/^(https?:|data:)/.test(s.photo)) return s.photo

  const p = isAbsolute(s.photo) ? s.photo : resolve(process.cwd(), s.photo)
  if (!existsSync(p)) throw new Error(`no encuentro la foto: ${p}`)
  const ext = p.toLowerCase().split('.').pop()
  const mime = MIME[ext] || 'image/jpeg'
  return `data:${mime};base64,${readFileSync(p).toString('base64')}`
}

export function fotoHTML(s, ctx, fmt) {
  const { B, F, LOGO, markCss, fontsLink } = ctx
  const P = B.colors.foto
  const C = B.colors.flat
  const bg = photoSource(s)
  const pos = s.objectPos || '50% 40%'
  const scale = s.scale || 1.0
  // El scrim se tiñe con el color de marca, no con un verde fijo en el motor:
  // una foto de una panadería y una de un estudio contable no pueden salir
  // con el mismo velo de color.
  const deep = tune(P.bg, { L: 0.13 })
  const glow = tune(P.bg, { L: 0.26 })

  // En foto el texto va sobre la imagen, así que la disposición controla dónde
  // se apoya el bloque y su escala. Lo que no se toca es el scrim: es lo que
  // garantiza que el texto se lea sobre cualquier foto.
  const disp = resolverDisposicion(s.disposicion || B.disposicion)
  const extra = {
    centrada: '.headline{text-align:center;bottom:auto;top:50%;transform:translateY(-50%)}',
    titular: '.headline h1{letter-spacing:-.05em;line-height:.95}',
    bloque: '.headline .ey{background:var(--accent);color:#111;display:inline-block;padding:8px 14px;border-radius:2px}',
    ficha: '.headline h1{font-weight:600}',
    clasica: '',
  }[disp.id]

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
${fontsLink}
<style>
:root{--bg:${P.bg};--accent:${P.accent};--accent-dark:${P.accent};--accent-deep:${C.accentDeep};--dark-bg:${C.darkBg};--tint:${C.tint};--ink:${C.ink};--muted:${C.muted};--font:'${F.sans}',sans-serif;--font-logo:'${F.logo.family}',sans-serif;--font-mono-marca:'${F.logo.monogramaFamily}',sans-serif;--track-logo:${F.logo.tracking};--mono:'${F.mono}',monospace}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--font);-webkit-font-smoothing:antialiased}
.post{width:${fmt.w}px;height:${fmt.h}px;position:relative;overflow:hidden;background:var(--bg)}
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${pos};transform:scale(${scale});transform-origin:${pos}}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,${rgba(deep, 0.66)} 0%,${rgba(deep, 0.3)} 30%,${rgba(deep, 0.36)} 55%,${rgba(deep, 0.86)} 100%),radial-gradient(120% 80% at 50% 120%,${rgba(glow, 0.6)},transparent 60%)}
${markCss('.mark', LOGO.strokeWidthSmall ?? LOGO.strokeWidth)}
${markCss('.brand .sw', LOGO.strokeWidth)}
/* La firma es la misma que en flat: sale de lockupHTML(), así que respeta el
   tipo, el tratamiento y el símbolo que el cliente eligió en el alta. Antes
   este template la dibujaba a mano y le pasaba por encima a esa elección. */
${lockupCSS()}
.top{position:absolute;top:${fmt.id === 'story' ? 200 : 64}px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between;color:#fff;z-index:5}
.top .kick{font-family:var(--mono);font-size:19px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.62)}
/* Sobre la foto el texto lleva sombra para separarse de cualquier imagen. */
.top .brand .wm,.top .brand .bajada{text-shadow:0 2px 10px rgba(0,0,0,.55)}
.headline{position:absolute;left:72px;right:72px;bottom:${fmt.fotoHeadlineBottom}px;color:#fff;z-index:5}
.headline .ey{font-family:var(--mono);font-size:22px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:24px}
.headline .badge-flotante{display:inline-block;background:var(--accent);color:#111;font-family:var(--mono);font-size:20px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:8px 20px;border-radius:999px;margin-bottom:24px;box-shadow:0 8px 20px rgba(0,0,0,.35)}
.headline h1{font-size:${Math.round(fmt.fotoHeadline * disp.titulo)}px;font-weight:800;line-height:1.02;letter-spacing:-.035em;text-shadow:0 4px 16px rgba(0,0,0,.45)}
.headline h1 .l1{color:#fff}.headline h1 .l2{color:var(--accent)}
.headline p{font-size:26px;line-height:1.4;color:rgba(255,255,255,.9);margin-top:18px;max-width:840px;text-shadow:0 2px 8px rgba(0,0,0,.5)}
.headline .btn-cta{display:inline-flex;align-items:center;gap:12px;background:var(--accent);color:#111;font-weight:750;font-size:24px;padding:16px 32px;border-radius:999px;box-shadow:0 6px 0 rgba(0,0,0,.35);margin-top:24px;text-decoration:none}
${extra}
.footer{position:absolute;left:72px;right:72px;bottom:${fmt.fotoFooterBottom}px;display:flex;align-items:center;justify-content:space-between;color:#fff;z-index:5}
.footer .src{font-family:var(--mono);font-size:19px;font-weight:500;letter-spacing:.08em;color:rgba(255,255,255,.7)}.footer .src b{color:#fff;font-weight:600}
</style></head><body class="dark ${clasesDeLogotipo(B)}">
<div class="post">
  <img class="photo" src="${bg}" alt="">
  <div class="scrim"></div>
  <div class="top">${lockupHTML(ctx, 44)}${s.kick ? '<span class="kick">' + s.kick + '</span>' : ''}</div>
  <div class="headline">
    ${s.badge ? `<div class="badge-flotante">${s.badge}</div>` : (s.eyebrow ? `<div class="ey">${s.eyebrow}</div>` : '')}
    <h1><span class="l1">${s.line1 || s.title || ''}</span>${s.line2 ? '<br><span class="l2">' + s.line2 + '</span>' : ''}</h1>
    ${s.body ? `<p>${s.body}</p>` : ''}
    ${s.cta ? `<div class="btn-cta">${s.cta}</div>` : ''}
  </div>
  <div class="footer"><span class="src">${s.src || ''}</span></div>
</div></body></html>`
}
