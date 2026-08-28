// Estilo foto: foto de fondo con scrim oscuro, frase en dos líneas.
// La foto la pone el usuario: `photo` (ruta en disco) o `photoData` (data URI).

import { readFileSync, existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'
import { tune, rgba } from '../../brand/color.mjs'
import { resolverDisposicion } from '../disposiciones.mjs'

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
  const { B, F, LOGO, mark, markCss, fontsLink, wordmarkHTML } = ctx
  const P = B.colors.foto
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
:root{--bg:${P.bg};--accent:${P.accent};--font:'${F.sans}',sans-serif;--font-logo:'${F.logo.family}',sans-serif;--font-mono-marca:'${F.logo.monogramaFamily}',sans-serif;--track-logo:${F.logo.tracking};--mono:'${F.mono}',monospace}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--font);-webkit-font-smoothing:antialiased}
.post{width:${fmt.w}px;height:${fmt.h}px;position:relative;overflow:hidden;background:var(--bg)}
.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${pos};transform:scale(${scale});transform-origin:${pos}}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,${rgba(deep, 0.66)} 0%,${rgba(deep, 0.3)} 30%,${rgba(deep, 0.36)} 55%,${rgba(deep, 0.86)} 100%),radial-gradient(120% 80% at 50% 120%,${rgba(glow, 0.6)},transparent 60%)}
${markCss('.mark', LOGO.strokeWidthSmall ?? LOGO.strokeWidth)}
.lockup{display:flex;align-items:center;gap:18px;color:#fff}
.lockup .wm{font-size:38px;font-weight:600;letter-spacing:-.04em;line-height:1;text-transform:lowercase}.lockup .wm .run{color:var(--accent)}
.top{position:absolute;top:${fmt.id === 'story' ? 200 : 64}px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between;color:#fff;z-index:5}
.top .kick{font-family:var(--mono);font-size:19px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.62)}
.headline{position:absolute;left:72px;right:72px;bottom:${fmt.fotoHeadlineBottom}px;color:#fff;z-index:5}
.headline .ey{font-family:var(--mono);font-size:23px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin-bottom:26px}
.headline h1{font-size:${Math.round(fmt.fotoHeadline * disp.titulo)}px;font-weight:800;line-height:1.0;letter-spacing:-.035em}
.headline h1 .l1{color:#fff}.headline h1 .l2{color:var(--accent)}
${extra}
.footer{position:absolute;left:72px;right:72px;bottom:${fmt.fotoFooterBottom}px;display:flex;align-items:center;justify-content:space-between;color:#fff;z-index:5}
.footer .src{font-family:var(--mono);font-size:19px;font-weight:500;letter-spacing:.08em;color:rgba(255,255,255,.62)}.footer .src b{color:#fff;font-weight:600}
</style></head><body>
<div class="post">
  <img class="photo" src="${bg}" alt="">
  <div class="scrim"></div>
  <div class="top"><div class="lockup">${mark(48)}<span class="wm">${wordmarkHTML('run')}</span></div>${s.kick ? '<span class="kick">' + s.kick + '</span>' : ''}</div>
  <div class="headline">${s.eyebrow ? '<div class="ey">' + s.eyebrow + '</div>' : ''}<h1><span class="l1">${s.line1 || ''}</span>${s.line2 ? '<br><span class="l2">' + s.line2 + '</span>' : ''}</h1></div>
  <div class="footer"><span class="src">${s.src || ''}</span><div class="lockup">${mark(34)}</div></div>
</div></body></html>`
}
