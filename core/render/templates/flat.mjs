// Estilo flat: fondo claro, sans, logo arriba. Para contenido informativo.
// Types: cover · body · steps · pista · trial · biblio
//
// El orden de las reglas importa y no es casual: base → disposición → formato.
// La disposición puede mover el contenido, pero las reglas del formato van
// últimas porque el anclado abajo en historia no es una preferencia estética:
// es la zona segura que tapa Instagram.

import { resolverDisposicion, cssDeDisposiciones } from '../disposiciones.mjs'
import { lockupCSS, lockupHTML, clasesDeLogotipo } from '../../brand/logotipo.mjs'

export function flatCSS(ctx, fmt, disp) {
  const { B, F, LOGO, markCss } = ctx
  const C = B.colors.flat
  const base = `
:root{--accent:${C.accent};--accent-deep:${C.accentDeep};--accent-dark:${C.accentOnDark};--dark-bg:${C.darkBg};--bg:${C.bg};--tint:${C.tint};--paper:${C.paper};--ink:${C.ink};--fg:${C.fg};--muted:${C.muted};--soft:${C.soft};--hair:${C.hair};--font:'${F.sans}',sans-serif;--font-serif:'Fraunces','Playfair Display',serif;--font-logo:'${F.logo.family}',sans-serif;--font-mono-marca:'${F.logo.monogramaFamily}',sans-serif;--track-logo:${F.logo.tracking};--mono:'${F.mono}',monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);-webkit-font-smoothing:antialiased}
.frame{width:${fmt.w}px;height:${fmt.h}px;position:relative;padding:${fmt.pad};display:flex;flex-direction:column;overflow:hidden}
body.light .frame{background:var(--bg);color:var(--fg)}
body.trial .frame{background:var(--tint);color:var(--fg)}
body.dark .frame{background:linear-gradient(155deg,var(--dark-bg) 0%,var(--accent-deep) 100%);color:#fff}
body.dark .frame::after{content:'';position:absolute;top:-140px;right:-140px;width:520px;height:520px;background:radial-gradient(circle,rgba(255,255,255,.06) 0%,transparent 70%);border-radius:50%}
.top{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:2}
${markCss('.brand .sw', LOGO.strokeWidth)}
.brand .sw{width:40px;height:40px;color:var(--accent);display:block}
body.dark .brand .sw{color:#fff}
${lockupCSS()}
.idx{font-family:var(--mono);font-size:20px;font-weight:600;letter-spacing:.1em;color:var(--soft)}
body.dark .idx{color:rgba(255,255,255,.55)}
.content{flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2}
.content.top{justify-content:flex-start;padding-top:56px}
.kick{font-family:var(--mono);font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700;display:inline-flex;align-items:center;gap:14px;margin-bottom:34px}
.kick::before{content:'';width:34px;height:3px;background:var(--accent);border-radius:2px}
body.dark .kick{color:var(--accent-dark)} body.dark .kick::before{background:var(--accent-dark)}
.title{font-size:${Math.round(fmt.title * disp.titulo)}px;font-weight:800;letter-spacing:-.035em;line-height:1.02;color:var(--ink);margin-bottom:30px;text-wrap:balance}
body.dark .title{color:#fff}
.title .acc{color:var(--accent)} body.dark .title .acc{color:var(--accent-dark)}
.title.big{font-size:${Math.round(fmt.titleBig * disp.titulo)}px;line-height:1.16}
.title--serif{font-family:var(--font-serif);font-style:italic;font-weight:600;letter-spacing:-.02em}
.quote-mark{font-family:var(--font-serif);font-size:120px;line-height:.8;color:var(--accent);margin-bottom:10px}
body.dark .quote-mark{color:var(--accent-dark)}
.body{font-size:${Math.round(fmt.body * disp.cuerpo)}px;line-height:1.46;color:var(--muted);font-weight:450;max-width:880px}
body.dark .body{color:rgba(255,255,255,.82)}
.body b{color:var(--ink);font-weight:700} body.dark .body b{color:#fff}
.cover-src{margin-top:32px;font-family:var(--mono);font-size:18px;letter-spacing:.04em;color:var(--soft)}
body.dark .cover-src{color:rgba(255,255,255,.42)}
.fuente{position:relative;z-index:2;margin-top:30px;padding-top:24px;border-top:1px solid var(--hair);font-family:var(--mono);font-size:19px;color:var(--muted)}
.fuente b{color:var(--accent);font-weight:600}
body.dark .fuente{border-color:rgba(255,255,255,.15);color:rgba(255,255,255,.6)}
.foot{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:2;font-family:var(--mono);font-size:19px;letter-spacing:.08em;color:var(--soft);text-transform:uppercase}
body.dark .foot{color:rgba(255,255,255,.5)}
.foot .hint{color:var(--accent);font-weight:600} body.dark .foot .hint{color:var(--accent-dark)}
.steps{display:flex;flex-direction:column;gap:18px;margin-top:16px}
.step{display:flex;gap:24px;align-items:center;background:#fff;border:2px solid var(--hair);padding:24px 28px;border-radius:24px;box-shadow:0 8px 24px -6px rgba(0,0,0,.06)}
.step .n{flex:none;width:52px;height:52px;border-radius:14px;background:var(--tint);color:var(--accent-deep);border:1.5px solid var(--accent);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:22px;font-weight:800}
.step .st{font-size:32px;font-weight:750;color:var(--ink);letter-spacing:-.02em}
.step .sk{font-family:var(--mono);font-size:16px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:4px}
.step .sd{font-size:22px;line-height:1.4;color:var(--muted);margin-top:4px}
.promo-box-3d{background:#fff;border:3px solid var(--ink);border-radius:26px;padding:36px 32px;box-shadow:0 8px 0 var(--ink);margin:24px 0;text-align:center}
.promo-badge{background:var(--accent);color:#fff;font-family:var(--mono);font-size:18px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:8px 22px;border-radius:999px;border:2px solid var(--ink);display:inline-block;margin-bottom:14px}
.promo-cifra{font-family:var(--font);font-size:64px;font-weight:900;letter-spacing:-.04em;color:var(--ink);line-height:1}
.btn-cta{display:inline-flex;align-items:center;gap:12px;background:var(--accent);color:var(--ink);font-weight:700;font-size:24px;padding:18px 36px;border-radius:999px;box-shadow:0 6px 0 var(--accent-deep);text-decoration:none;width:fit-content;margin-top:24px}
.emoji{font-size:104px;line-height:1;margin-bottom:30px}
.chips{display:flex;gap:13px;flex-wrap:wrap;margin-top:38px}
.chip{font-family:var(--mono);font-size:19px;font-weight:600;letter-spacing:.03em;padding:12px 20px;border-radius:999px;background:var(--tint);color:var(--accent-deep)}
.pill{display:inline-flex;align-items:center;gap:10px;background:var(--paper);border-radius:999px;padding:15px 26px;font-family:var(--mono);font-size:18px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:34px;box-shadow:0 10px 30px -14px rgba(20,40,20,.4)}
.pill .dot{width:9px;height:9px;border-radius:50%;background:var(--accent)}
.refs{list-style:none;counter-reset:r;margin-top:10px}
.refs li{counter-increment:r;position:relative;padding:17px 0 17px 48px;border-bottom:1px solid rgba(255,255,255,.13);font-family:var(--mono);font-size:19.5px;line-height:1.4;color:rgba(255,255,255,.78)}
.refs li:last-child{border-bottom:none}
.refs li::before{content:counter(r,decimal-leading-zero);position:absolute;left:0;top:19px;font-family:var(--mono);font-size:16px;color:var(--accent-dark);font-weight:700}
.refs li em{color:#fff;font-style:italic;font-weight:500}
`

  // El anclado en historia va al final: la zona segura de Instagram manda sobre
  // cualquier disposición.
  const formato = `
body.fmt-story .content{justify-content:flex-end;padding-bottom:20px}
body.fmt-story .content.top{justify-content:flex-start;padding-top:0}
body.fmt-story .foot{margin-top:44px}
`

  return base + cssDeDisposiciones() + formato
}

export function flatHTML(s, ctx, fmt) {
  const { B, mark, fontsLink, wordmarkHTML } = ctx
  // La disposición sale de la marca; una placa puntual puede pisarla.
  const disp = resolverDisposicion(s.disposicion || B.disposicion)
  const css = flatCSS(ctx, fmt, disp)

  const page = (theme, inner) =>
    `<!DOCTYPE html><html><head><meta charset="utf-8">${fontsLink}<style>${css}</style></head>` +
    `<body class="${theme} fmt-${fmt.id} disp-${disp.id} ${clasesDeLogotipo(B)}"><div class="frame">${inner}</div></body></html>`

  const brandLockup = lockupHTML(ctx, 40)
  const top = idx => `<div class="top">${brandLockup}${idx ? `<span class="idx">${idx}</span>` : ''}</div>`
  const foot = (l, h) => `<div class="foot"><span>${l || B.site}</span>${h ? `<span class="hint">${h}</span>` : ''}</div>`

  const opt = (clase, valor) => (valor == null || valor === '' ? '' : `<div class="${clase}">${valor}</div>`)
  const req = (clase, valor, campo) => {
    if (valor == null || valor === '') throw new Error(`la placa "${s.name || s.type}" no tiene ${campo}`)
    return `<div class="${clase}">${valor}</div>`
  }

  switch (s.type) {
    case 'cover':
      return page('dark', top(s.idx) +
        `<div class="content">${opt('kick', s.kick)}${req('title big', s.title, 'título')}${opt('body', s.body)}${s.src ? `<div class="cover-src">${s.src}</div>` : ''}</div>` +
        foot(B.site, s.hint || B.hints?.cover || 'Deslizá →'))

    case 'body':
      return page(s.theme || 'light', top(s.idx) +
        `<div class="content">${opt('kick', s.kick)}${req('title', s.title, 'título')}${opt('body', s.body)}</div>` +
        (s.fuente ? `<div class="fuente">Fuente — <b>${s.fuente}</b></div>` : '') +
        foot(B.site, s.hint))

    case 'quote':
      return page(s.theme || 'dark', top(s.idx) +
        `<div class="content"><div class="quote-mark">“</div><div class="title title--serif">${s.title}</div>${opt('body', s.body)}</div>` +
        foot(B.site, s.hint || 'FILOSOFÍA DE MARCA'))

    case 'promo':
      return page('light', top(s.idx) +
        `<div class="content">${opt('kick', s.kick)}<div class="title">${s.title}</div><div class="promo-box-3d">${s.badge ? `<div class="promo-badge">${s.badge}</div>` : ''}<div class="promo-cifra">${s.cifra || ''}</div>${opt('body', s.body)}</div>${s.cta ? `<div class="btn-cta">${s.cta}</div>` : ''}</div>` +
        foot(B.site, s.hint || 'BENEFICIO EXCLUSIVO'))

    case 'steps':
      return page('light', top(s.idx) +
        `<div class="content">${opt('kick', s.kick)}${req('title', s.title, 'título')}<div class="steps">${s.steps.map(x => `<div class="step"><div class="n">${x.n}</div><div>${x.k ? `<div class="sk">${x.k}</div>` : ''}<div class="st">${x.t}</div>${x.d ? `<div class="sd">${x.d}</div>` : ''}</div></div>`).join('')}</div></div>` +
        foot(B.site, s.hint))

    case 'pista':
      return page('light', top(s.idx) +
        `<div class="content">${opt('emoji', s.emoji)}${opt('kick', s.kick)}${req('title', s.title, 'título')}${opt('body', s.body)}<div class="chips">${(s.chips || []).map(c => `<span class="chip">${c}</span>`).join('')}</div></div>` +
        foot(B.site, s.hint || B.altSite || ''))

    case 'trial':
      return page('trial', top('') +
        `<div class="content">${s.pill ? `<div class="pill"><span class="dot"></span>${s.pill}</div>` : ''}${req('title', s.title, 'título')}${opt('body', s.body)}</div>` +
        foot(B.site, s.hint || B.hints?.trial || ''))

    case 'biblio':
      return page('dark', top(s.idx) +
        `<div class="content top"><div class="kick">${s.kick || 'Fuentes'}</div><div class="title">${s.title || 'Bibliografía'}</div><ol class="refs">${s.refs.map(r => `<li>${r}</li>`).join('')}</ol></div>` +
        foot(B.site, ''))

    default:
      throw new Error('tipo flat desconocido: ' + s.type)
  }
}
