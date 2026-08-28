// Cómo se firma la marca: el logotipo.
//
// Un logo de identidad no es un icono. Un icono de librería está dibujado para
// leerse a 20px dentro de un botón, junto a otros cuarenta del mismo sistema;
// un logotipo tiene que ser único y funcionar solo. Además, un icono público no
// es registrable como marca —le falta distintividad—, así que darle uno al
// cliente es darle algo que no puede defender como propio.
//
// Por eso acá el logotipo se construye con la tipografía y el nombre del
// negocio, que son suyos por definición. Tres formas:
//
//   palabra          el nombre tipografiado. Lo que usa la mayoría de las
//                    pymes reales, y lo que menos puede salir mal.
//   palabra-simbolo  el nombre más una marca al lado.
//   simbolo          solo la marca. El más difícil de sostener: sin el nombre,
//                    una marca joven no se reconoce.
//
// Nada de esto llama a un modelo: es tipografía y reglas. Sale igual todas las
// veces y no cuesta nada por cliente.

export const TIPOS = [
  {
    id: 'palabra',
    label: 'Solo el nombre',
    descripcion: 'Tu nombre bien tipografiado. Es lo que usan casi todos los negocios de barrio, y lo que mejor se lee chico.',
  },
  {
    id: 'palabra-simbolo',
    label: 'Nombre y símbolo',
    descripcion: 'El nombre con una marca al lado. Da más presencia, y el símbolo sirve solo para la foto de perfil.',
  },
  {
    id: 'sello',
    label: 'Sello circular',
    descripcion: 'El nombre arqueado dentro de un emblema redondo, con el rubro abajo. Es el más elaborado; funciona bien en la foto de perfil.',
  },
  {
    id: 'simbolo',
    label: 'Solo el símbolo',
    descripcion: 'Solo la marca, sin el nombre. Funciona cuando ya te conocen; si estás empezando, conviene una de las otras dos.',
  },
]

// Cada tratamiento es una manera de resolver el nombre. Son recursos de
// identidad, no adornos: apilar con tracking negativo, contrastar pesos,
// anteponer un filete, encajar una palabra en color.
export const TRATAMIENTOS = [
  {
    id: 'apilado',
    label: 'Apilado',
    descripcion: 'Dos renglones bien juntos. Compacto y con peso.',
    // Sirve para negocios de dos o más palabras; con una sola no hay qué apilar.
    requiereDosPalabras: true,
  },
  {
    id: 'linea',
    label: 'En una línea',
    descripcion: 'Todo seguido, con la segunda palabra más gruesa.',
  },
  {
    id: 'filete',
    label: 'Con filete',
    descripcion: 'Una línea de color arriba del nombre. Sobrio, de estudio.',
  },
  {
    id: 'caja',
    label: 'Con caja',
    descripcion: 'La última palabra sobre un rectángulo de color.',
  },
  {
    id: 'pastilla',
    label: 'En pastilla',
    descripcion: 'Todo el nombre dentro de un bloque de color. Se lee de lejos; sirve para cartel y packaging.',
  },
]

export const TIPO_POR_DEFECTO = 'palabra-simbolo'
export const TRATAMIENTO_POR_DEFECTO = 'linea'

const ALIASES_TIPO = {
  monograma: 'palabra-simbolo',
}

export function resolverTipo(id) {
  if (!id) return TIPOS.find(x => x.id === TIPO_POR_DEFECTO)
  const normId = ALIASES_TIPO[id] || id
  const t = TIPOS.find(x => x.id === normId)
  if (!t) throw new Error(`tipo de logotipo desconocido: "${id}". Disponibles: ${TIPOS.map(x => x.id).join(', ')}`)
  return t
}

export function resolverEscudo(id) {
  if (!id) return { id: 'circulo', ...ESCUDOS['circulo'] }
  const e = ESCUDOS[id]
  if (!e) throw new Error(`símbolo desconocido: "${id}". Disponibles: ${Object.keys(ESCUDOS).join(', ')}`)
  return { id, ...e }
}

export function resolverTratamiento(id) {
  if (!id) return TRATAMIENTOS.find(x => x.id === TRATAMIENTO_POR_DEFECTO)
  const t = TRATAMIENTOS.find(x => x.id === id)
  if (!t) throw new Error(`tratamiento desconocido: "${id}". Disponibles: ${TRATAMIENTOS.map(x => x.id).join(', ')}`)
  return t
}

/**
 * Qué tratamientos puede usar este nombre.
 * "Apilado" necesita dos palabras: con una sola no hay nada que apilar y
 * quedaría un renglón suelto, que se ve como un error.
 */
export function tratamientosPara(wordmark) {
  const dosPalabras = Boolean(wordmark?.accent?.trim())
  return TRATAMIENTOS.filter(t => !t.requiereDosPalabras || dosPalabras)
}

/* ── monograma ───────────────────────────────────────────────
 *
 * El símbolo cuando no hay uno propio. En vez de tomar un icono de catálogo
 * —que comparten miles de negocios— se arma con las iniciales del propio
 * nombre: es único, se puede registrar, y hereda la tipografía de la marca.
 */

// Cómo se resuelve el símbolo. Que existan varias formas no es capricho: con
// una sola, tres clientes que elijan "nombre y símbolo" terminan con el mismo
// círculo y dos letras, y la identidad deja de distinguirlos.
const ESCUDOS = {
  circulo: {
    label: 'Círculo',
    descripcion: 'Iniciales sobre un círculo pleno.',
    css: 'border-radius:50%;background:var(--accent);color:#fff',
    cssOscuro: 'background:var(--accent-dark);color:var(--dark-bg)',
    escala: 1,
  },
  cuadrado: {
    label: 'Cuadrado',
    descripcion: 'Sobre un cuadrado de esquinas suaves. Más firme.',
    css: 'border-radius:16%;background:var(--accent);color:#fff',
    cssOscuro: 'background:var(--accent-dark);color:var(--dark-bg)',
    escala: 1,
  },
  contorno: {
    label: 'Contorno',
    descripcion: 'Solo el borde, con las letras en color. Más liviano.',
    css: 'border-radius:50%;border:2.5px solid var(--accent);color:var(--accent);background:none',
    cssOscuro: 'border-color:var(--accent-dark);color:var(--accent-dark)',
    escala: 0.92,
  },
  letra: {
    label: 'Solo la inicial',
    descripcion: 'Una letra grande, sin fondo. Lo más tipográfico.',
    css: 'background:none;color:var(--accent)',
    cssOscuro: 'color:var(--accent-dark)',
    // Sin fondo que la contenga, la letra necesita cuerpo propio para pesar
    // lo mismo que un círculo pleno al lado del nombre.
    escala: 1.6,
    unaLetra: true,
  },
  marco: {
    label: 'Marco',
    descripcion: 'Las iniciales en un cuadrado con doble borde. El más "de estudio".',
    css: 'border-radius:14%;border:2px solid var(--accent);outline:1px solid var(--accent);outline-offset:3px;color:var(--accent);background:none',
    cssOscuro: 'border-color:var(--accent-dark);outline-color:var(--accent-dark);color:var(--accent-dark)',
    escala: 0.86,
  },
  barra: {
    label: 'Barra',
    descripcion: 'Un bloque vertical de color, sin letras. Sobrio.',
    css: 'background:var(--accent);border-radius:2px;color:transparent',
    cssOscuro: 'background:var(--accent-dark)',
    escala: 1,
    sinLetras: true,
  },
}

/** Las iniciales que van en el monograma: una o dos, nunca más. */
export function iniciales(nombre) {
  const palabras = String(nombre || '')
    .trim()
    .split(/\s+/)
    // Los conectores no aportan: "Vivero de las Acacias" es VA, no VDLA.
    .filter(p => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p))
    .filter(p => !/^(de|del|la|las|el|los|y|e|en)$/i.test(p))
  if (!palabras.length) return '?'
  if (palabras.length === 1) return palabras[0].slice(0, 1).toUpperCase()
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase()
}

/**
 * CSS y HTML del monograma. Se dibuja con la tipografía de la marca, así que
 * cambia con ella y no se despega del resto de la identidad.
 */
export function monogramaHTML({ nombre, escudo = 'circulo', px = 40, ajuste }) {
  const forma = ESCUDOS[escudo] || ESCUDOS.circulo
  const todas = iniciales(nombre)
  const letras = forma.sinLetras ? '' : forma.unaLetra ? todas.slice(0, 1) : todas
  // Con dos letras hay que achicar para que entren sin apretarse.
  // La escala se resuelve acá y no en el CSS del escudo: el font-size va
  // inline, así que una regla de hoja de estilo perdería contra él en silencio.
  const cuerpo = (letras.length > 1 ? px * 0.4 : px * 0.52) * (forma.escala || 1) * (ajuste?.escala || 1)
  // La barra es un bloque vertical, no un cuadrado: de ahí el ancho reducido.
  const ancho = forma.sinLetras ? Math.round(px * 0.26) : px
  const track = ajuste?.tracking ? `;letter-spacing:${ajuste.tracking}` : ''
  return `<span class="mono mono-${escudo}" style="width:${ancho}px;height:${px}px;font-size:${cuerpo}px${track}">${letras}</span>`
}

export const monogramaCSS = () => `
.mono{
  display:inline-flex;align-items:center;justify-content:center;flex:none;
  font-weight:700;letter-spacing:-.04em;line-height:1;font-family:var(--font-mono-marca,var(--font));
}
` + Object.entries(ESCUDOS).map(([id, e]) =>
  `.mono-${id}{${e.css}}\nbody.dark .mono-${id}{${e.cssOscuro}}`
).join('\n')

export const catalogoLogotipos = () => ({
  tipos: TIPOS.map(({ id, label, descripcion }) => ({ id, label, descripcion })),
  tratamientos: TRATAMIENTOS.map(({ id, label, descripcion, requiereDosPalabras }) =>
    ({ id, label, descripcion, requiereDosPalabras: Boolean(requiereDosPalabras) })),
  escudos: Object.entries(ESCUDOS).map(([id, e]) => ({ id, label: e.label, descripcion: e.descripcion })),
})

/* ── el descriptor ───────────────────────────────────────────
 *
 * La línea chica en mayúsculas espaciadas debajo del nombre: "CAFETERÍA DE
 * ESPECIALIDAD · BUENOS AIRES". Es lo que separa un nombre en una tipografía
 * linda de algo que se lee como un logo: dice a qué se dedica el negocio y
 * dónde, que es exactamente lo que un cliente nuevo necesita saber.
 *
 * Sale del rubro y la ciudad que el negocio ya cargó en el alta. No se
 * inventa: sin rubro no hay descriptor, porque una bajada genérica tipo
 * "CALIDAD Y SERVICIO" es peor que ninguna.
 */
export function descriptor(brand) {
  const propio = String(brand?.logotipo?.bajada || '').trim()
  if (propio) return propio.toUpperCase()
  const n = brand?.negocio || {}
  const partes = [n.rubro, n.ciudad].map(x => String(x || '').trim()).filter(Boolean)
  return partes.length ? partes.join(' · ').toUpperCase() : ''
}

export function descriptorHTML(brand) {
  const t = descriptor(brand)
  return t ? `<span class="bajada">${t}</span>` : ''
}

/* ── el sello ────────────────────────────────────────────────
 *
 * El emblema circular con el nombre arqueado arriba y el rubro abajo: el
 * registro de Starbucks y Shell. Es el único tipo que no se compone con flex,
 * porque el texto que sigue una curva no existe en CSS — va en SVG con
 * <textPath>, que sí escala a cualquier tamaño sin perder nitidez.
 *
 * Los ids del <defs> llevan el slug de la marca: si dos sellos caen en la
 * misma página (el visor, por ejemplo) con ids iguales, el segundo referencia
 * el arco del primero y sale torcido.
 */
export function selloHTML({ nombre, rubro = '', px = 108, slug = 's' }) {
  const arriba = String(nombre || '').trim().toUpperCase()
  const abajo = String(rubro || '').trim().toUpperCase()
  const ini = iniciales(nombre)
  const idA = `arco-${slug}`, idB = `arco-b-${slug}`
  // Radios sobre una caja de 100. Las banderas del arco de abajo son
  // `0,0` (large-arc 0, sweep 0) y no son negociables: con large-arc 1 el
  // semicírculo elige el camino de vuelta y la leyenda sale cabeza abajo.
  // Verificado renderizando las cuatro combinaciones — no se deduce leyendo.
  return `<svg class="sello" width="${px}" height="${px}" viewBox="0 0 100 100" role="img" aria-label="${arriba}">
  <defs>
    <path id="${idA}" d="M 50,50 m -37,0 a 37,37 0 1,1 74,0" fill="none"/>
    <path id="${idB}" d="M 50,50 m -31,0 a 31,31 0 0,0 62,0" fill="none"/>
  </defs>
  <circle cx="50" cy="50" r="47.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="0.7"/>
  <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" stroke-width="0.7"/>
  <text font-size="7.6" font-weight="700" letter-spacing="1.7" fill="currentColor">
    <textPath href="#${idA}" startOffset="50%" text-anchor="middle">${arriba}</textPath>
  </text>${abajo ? `
  <text font-size="5.4" font-weight="600" letter-spacing="1.5" fill="currentColor">
    <textPath href="#${idB}" startOffset="50%" text-anchor="middle">${abajo}</textPath>
  </text>` : ''}
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
    font-size="${ini.length > 1 ? 17 : 23}" font-weight="700" letter-spacing="-0.5"
    fill="currentColor">${ini}</text>
</svg>`
}

export const selloCSS = () => `
.sello{display:block;color:var(--accent);font-family:var(--font-logo,var(--font))}
body.dark .sello{color:var(--accent-dark)}
`

/* ── el lockup en la placa ───────────────────────────────────
 *
 * La firma que va en la esquina de cada placa. Recibe las piezas del contexto
 * de marca —el símbolo y el nombre ya partido— y las compone según el tipo y
 * el tratamiento que eligió el cliente.
 */

/** CSS de todos los tratamientos. Se inyecta siempre; la clase del body elige. */
export function lockupCSS() {
  return selloCSS() + `
.brand{display:flex;align-items:center;gap:13px}
/* El nombre y su bajada son una unidad: van en columna, y el símbolo al lado
   de las dos. De ahí el wrapper .nom en vez de colgar la bajada del .brand. */
.brand .nom{display:flex;flex-direction:column;gap:4px;min-width:0}
.brand .bajada{font-family:var(--mono,var(--font));font-size:11px;font-weight:600;
  letter-spacing:.19em;text-transform:uppercase;color:var(--muted,#6B7176);white-space:nowrap}
body.dark .brand .bajada{color:rgba(255,255,255,.62)}
/* La firma va con la tipografía de logotipo; el resto de la placa con la del
   cuerpo. Si el cliente eligió "la misma", las dos variables valen lo mismo. */
.brand .wm{font-family:var(--font-logo,var(--font));font-size:31px;font-weight:700;
  letter-spacing:var(--track-logo,-.03em);color:var(--ink)}
body.lg-caps .brand .wm{text-transform:uppercase}
.brand .wm .acc{color:var(--accent)}
body.dark .brand .wm{color:#fff} body.dark .brand .wm .acc{color:var(--accent-dark)}

/* Apilado: dos renglones pegados. El interlineado corto es lo que lo hace
   leer como una unidad y no como dos palabras sueltas. */
body.lg-apilado .brand .wm{display:flex;flex-direction:column;line-height:.92;letter-spacing:-.045em;font-size:26px}
body.lg-apilado .brand .wm .acc{font-weight:800}

/* Una línea con pesos contrastados: la primera palabra liviana, la segunda
   sólida. Separa sin necesitar color. */
body.lg-linea .brand .wm{font-weight:400}
body.lg-linea .brand .wm .acc{font-weight:800}

/* Filete: una regla de color encima. Gesto editorial, de estudio profesional. */
/* Grid en vez de columna: el filete ocupa la primera fila completa y el
   símbolo y el nombre fluyen juntos en la segunda. Con columna, cada uno caía
   en su propio renglón y el lockup quedaba de tres pisos. Sin símbolo, el
   nombre ocupa la primera celda solo — sin hueco. */
body.lg-filete .brand{display:grid;grid-template-columns:auto auto;justify-content:start;align-items:center;gap:6px 11px}
body.lg-filete .brand::before{content:'';grid-column:1/-1;width:38px;height:3px;background:var(--accent);border-radius:2px}
body.lg-filete.dark .brand::before{background:var(--accent-dark)}
body.lg-filete .brand .wm{font-size:27px;font-weight:500;letter-spacing:0}
body.lg-filete .brand .wm .acc{font-weight:700}

/* Pastilla: el nombre entero dentro de un bloque de color, con la bajada
   adentro. Es el registro de OXO y LEGO — máxima legibilidad a distancia,
   porque el contraste lo da el bloque y no la letra. */
body.lg-pastilla .brand .nom{
  background:var(--accent);border-radius:999px;padding:11px 26px 12px;gap:2px;align-items:center;
}
body.lg-pastilla .brand .nom .wm{color:#fff;font-size:27px;font-weight:800;letter-spacing:.01em;text-transform:uppercase}
body.lg-pastilla .brand .nom .wm .acc{color:#fff}
body.lg-pastilla .brand .bajada{color:rgba(255,255,255,.82);font-size:10px;letter-spacing:.22em}
body.lg-pastilla.dark .brand .nom{background:var(--accent-dark)}
body.lg-pastilla.dark .brand .nom .wm,body.lg-pastilla.dark .brand .nom .wm .acc{color:var(--dark-bg)}
body.lg-pastilla.dark .brand .bajada{color:rgba(0,0,0,.55)}

/* Caja: la última palabra sobre un rectángulo pleno. Industrial, de taller. */
body.lg-caja .brand .wm .acc{
  background:var(--accent);color:#fff;padding:2px 10px;border-radius:3px;margin-left:6px;
}
body.lg-caja.dark .brand .wm .acc{background:var(--accent-dark);color:var(--dark-bg)}

/* Solo símbolo: el nombre no se dibuja. */
body.lg-solo-simbolo .brand .wm{display:none}
/* Solo palabra: no hay símbolo que dibujar. */
body.lg-solo-palabra .brand .marca{display:none}
${monogramaCSS()}`
}

/**
 * Las clases que van en el <body> para que el CSS de arriba aplique.
 * @param {object} brand
 */
export function clasesDeLogotipo(brand) {
  const lg = brand.logotipo || {}
  const tipo = resolverTipo(lg.tipo).id
  const trat = resolverTratamiento(lg.tratamiento).id
  const clases = [`lg-${trat}`]
  if (tipo === 'sello') clases.push('lg-sello')
  if (tipo === 'simbolo') clases.push('lg-solo-simbolo')
  if (tipo === 'palabra') clases.push('lg-solo-palabra')
  // Anton y Bebas están dibujadas para caja alta: en minúsculas pierden.
  if (brand.fonts?.logo?.caps) clases.push('lg-caps')
  return clases.join(' ')
}

/**
 * El HTML del lockup.
 * @param {object} ctx  contexto de marca (mark, wordmarkHTML)
 * @param {number} px   tamaño del símbolo
 */
export function lockupHTML(ctx, px = 40) {
  const { B, mark, wordmarkHTML } = ctx
  const lg = B.logotipo || {}
  const tipo = resolverTipo(lg.tipo).id

  // El sello reemplaza el lockup entero: no lleva nombre al lado porque el
  // nombre ya está adentro, arqueado.
  if (tipo === 'sello') {
    return `<div class="brand">${selloHTML({
      nombre: B.nombre, rubro: B.negocio?.rubro, px: Math.round(px * 2.7), slug: B.meta?.slug || 's',
    })}</div>`
  }

  // Con "solo palabra" no se dibuja símbolo. En los otros dos casos, el
  // símbolo es el logo propio si lo hay, y si no el monograma: nunca un icono
  // de catálogo que le pueda tocar igual a otro negocio.
  const simbolo = tipo === 'palabra'
    ? ''
    : B.logo?.origen && B.logo.origen !== 'default'
      ? `<span class="marca sw">${mark(px, 'sw-svg')}</span>`
      : `<span class="marca">${monogramaHTML({ nombre: B.nombre, escudo: lg.escudo, px, ajuste: B.fonts?.logo?.mono })}</span>`

  const bajada = tipo === 'simbolo' ? '' : descriptorHTML(B)
  const nombre = tipo === 'simbolo'
    ? ''
    : `<span class="nom"><span class="wm">${wordmarkHTML('acc')}</span>${bajada}</span>`

  return `<div class="brand">${simbolo}${nombre}</div>`
}
