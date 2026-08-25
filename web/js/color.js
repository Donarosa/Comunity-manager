// Selector de color.
//
// El problema real: alguien dice "mi color es lila" y hay doscientos lilas. Una
// rueda de color con un cuadrado de saturación tampoco lo resuelve, porque le
// pide que encuentre una coordenada exacta en un espacio continuo.
//
// Acá se resuelve en dos pasos, que es como funciona la cabeza: primero elegís
// la familia —lila, y no violeta ni rosa— y recién ahí ves los lilas que
// existen, ordenados de oscuro a claro y de apagado a vivo. Veinticuatro
// opciones concretas en vez de un millón de coordenadas.
//
// Los tonos se generan en OKLCH con el mismo módulo que usa el render, así que
// el paso de una fila a otra se ve parejo: en HSL, bajar la luminosidad diez
// puntos oscurece muchísimo un amarillo y casi nada un azul.

import { oklchToHex, hexToOklch, parseHex } from '/nucleo/brand/color.mjs'
import { derivePalette } from '/nucleo/brand/palette.mjs'
import { el, $$, vaciar, elegirEnGrupo } from './ui.js'

// El tono en grados OKLCH de cada familia. Los nombres son los que usaría el
// dueño del negocio, no los de un catálogo de pinturería.
const FAMILIAS = [
  { nombre: 'bordó', H: 18, L: 0.42, C: 0.13 },
  { nombre: 'ladrillo', H: 42, L: 0.52, C: 0.14 },
  { nombre: 'naranja', H: 62, L: 0.62, C: 0.15 },
  { nombre: 'mostaza', H: 88, L: 0.68, C: 0.13 },
  { nombre: 'oliva', H: 118, L: 0.52, C: 0.09 },
  { nombre: 'verde', H: 148, L: 0.52, C: 0.12 },
  { nombre: 'petróleo', H: 192, L: 0.48, C: 0.09 },
  { nombre: 'celeste', H: 228, L: 0.62, C: 0.11 },
  { nombre: 'azul', H: 262, L: 0.48, C: 0.15 },
  { nombre: 'violeta', H: 296, L: 0.46, C: 0.16 },
  { nombre: 'lila', H: 322, L: 0.58, C: 0.12 },
  { nombre: 'rosa', H: 352, L: 0.58, C: 0.14 },
]

const LUCES = [0.32, 0.40, 0.48, 0.56, 0.64, 0.72]
const CROMAS = [0.05, 0.09, 0.13, 0.17]

// Se genera como matriz, no como lista: cada fila es un nivel de saturación y
// cada columna un nivel de luz. Así el ojo puede moverse en una dirección
// pensando "más oscuro" y en la otra "más apagado", que es como se busca un
// color. Una grilla de colores en orden arbitrario obliga a mirarlos de a uno.
// Las columnas son LUCES.length — el CSS tiene que coincidir.
function tonosDe(H) {
  const filas = []
  for (const C of CROMAS) filas.push(LUCES.map(L => oklchToHex({ L, C, H })))
  return filas.flat()
}

/** La familia cuyo tono está más cerca de un color dado. */
function familiaDe(hex) {
  try {
    const { H } = hexToOklch(hex)
    let mejor = FAMILIAS[0], dist = 999
    for (const f of FAMILIAS) {
      const d = Math.min(Math.abs(f.H - H), 360 - Math.abs(f.H - H))
      if (d < dist) { dist = d; mejor = f }
    }
    return mejor
  } catch { return FAMILIAS[0] }
}

/** Los colores que trae un SVG en sus atributos fill y stroke. */
export function coloresDeSVG(svg) {
  const encontrados = new Set()
  for (const m of String(svg).matchAll(/(?:fill|stroke)\s*[:=]\s*["']?(#[0-9a-fA-F]{3,6})/g)) {
    try {
      const hex = m[1].length === 4
        ? '#' + m[1].slice(1).split('').map(c => c + c).join('')
        : m[1]
      parseHex(hex)
      const { L, C } = hexToOklch(hex)
      // Se descartan blancos, negros y grises: no son "el color de la marca".
      if (L > 0.93 || L < 0.08 || C < 0.02) continue
      encontrados.add(hex.toUpperCase())
    } catch { /* no era un color */ }
  }
  return [...encontrados].slice(0, 6)
}

/**
 * @param {object}   o
 * @param {string}   o.inicial       color de arranque
 * @param {string[]} o.delLogo       colores extraídos del logo del usuario
 * @param {function} o.onCambio      recibe el hex elegido
 */
export function selectorDeColor({ inicial = '#A83A1C', delLogo = [], onCambio } = {}) {
  let elegido = inicial
  let familia = familiaDe(inicial)

  const raiz = el('div')
  const pestanas = el('div.pestanas')
  const cuerpo = el('div')
  const tira = el('div.tira')
  const avisos = el('div', { style: 'margin-top:12px' })

  function emitir(hex) {
    elegido = hex
    pintarTira()
    onCambio?.(hex)
  }

  function pintarTira() {
    vaciar(tira); vaciar(avisos)
    let p
    try { p = derivePalette({ accent: elegido }) } catch { return }
    const muestras = [
      [p.flat.darkBg, 'oscuro'], [p.flat.accent, 'acento'], [p.flat.accentDeep, 'profundo'],
      [p.flat.tint, 'tinte'], [p.flat.bg, 'fondo'], [p.flat.ink, 'texto'],
    ]
    for (const [hex, nom] of muestras) {
      const claro = hex === p.flat.bg || hex === p.flat.tint
      tira.append(el('div', { style: `background:${hex};color:${claro ? '#555' : 'rgba(255,255,255,.75)'}` }, nom))
    }
    for (const a of p.warnings) avisos.append(el('div.aviso', {}, a))
  }

  /* — pestaña: catálogo de familias — */
  function vistaCatalogo() {
    const cont = el('div')
    const grilla = el('div.familias')
    const tonos = el('div.tonos')

    function pintarTonos() {
      vaciar(tonos)
      for (const hex of tonosDe(familia.H)) {
        const b = el('button.tono-btn', {
          style: `background:${hex}`,
          title: hex,
          'aria-label': `${familia.nombre} ${hex}`,
          onclick: () => { elegirEnGrupo(tonos, b, 'elegido'); emitir(hex) },
        })
        if (hex === elegido.toUpperCase()) b.classList.add('elegido')
        tonos.append(b)
      }
    }

    for (const f of FAMILIAS) {
      const b = el('button.familia', {
        onclick: () => { familia = f; elegirEnGrupo(grilla, b); pintarTonos() },
      },
        el('span.tono', { style: `background:${oklchToHex(f)}` }),
        el('span.nom', {}, f.nombre)
      )
      if (f.nombre === familia.nombre) b.classList.add('elegida')
      grilla.append(b)
    }

    cont.append(
      el('p.apunte.chico', { style: 'margin-bottom:12px' },
        'Primero la familia. Después el tono: hacia la derecha más claro, hacia abajo más vivo.'),
      grilla, tonos
    )
    pintarTonos()
    return cont
  }

  /* — pestaña: código exacto — */
  function vistaCodigo() {
    const entrada = el('input', {
      type: 'text', value: elegido, placeholder: '#8C1D2F', maxLength: 7,
      style: 'font-family:var(--mono);max-width:190px',
    })
    const error = el('div.chico', { style: 'color:var(--acento);margin-top:8px' })

    entrada.addEventListener('input', () => {
      const v = entrada.value.trim()
      error.textContent = ''
      if (!/^#?[0-9a-fA-F]{6}$/.test(v)) return
      const hex = (v.startsWith('#') ? v : '#' + v).toUpperCase()
      try { parseHex(hex); familia = familiaDe(hex); emitir(hex) }
      catch { error.textContent = 'Ese código no es un color válido.' }
    })

    return el('div', {},
      el('p.apunte.chico', { style: 'margin-bottom:12px' },
        'Si tu diseñador te pasó el código exacto, pegalo acá. Va en hexadecimal, con numeral.'),
      entrada, error
    )
  }

  /* — pestaña: colores del logo — */
  function vistaLogo() {
    const cont = el('div')
    cont.append(el('p.apunte.chico', { style: 'margin-bottom:12px' },
      'Estos son los colores que trae el archivo que subiste. Si tu marca ya tiene color, casi siempre está acá.'))
    const grilla = el('div.tonos')
    for (const hex of delLogo) {
      const b = el('button.tono-btn', {
        style: `background:${hex}`, title: hex,
        onclick: () => { elegirEnGrupo(grilla, b, 'elegido'); familia = familiaDe(hex); emitir(hex) },
      })
      grilla.append(b)
    }
    cont.append(grilla)
    return cont
  }

  const vistas = [
    ['Del catálogo', vistaCatalogo],
    ['Tengo el código', vistaCodigo],
    ...(delLogo.length ? [['Del logo que subiste', vistaLogo]] : []),
  ]

  vistas.forEach(([nombre, fn], i) => {
    const b = el('button.pestana', {
      onclick: () => { elegirEnGrupo(pestanas, b, 'activa'); vaciar(cuerpo).append(fn()) },
    }, nombre)
    if (i === 0) b.classList.add('activa')
    pestanas.append(b)
  })

  cuerpo.append(vistas[0][1]())
  pintarTira()
  raiz.append(pestanas, cuerpo, el('div', { style: 'margin-top:20px' }, el('span.rotulo', {}, 'Así queda tu paleta')), tira, avisos)

  return { nodo: raiz, valor: () => elegido }
}
