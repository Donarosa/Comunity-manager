// Catálogo de tipografías.
//
// El usuario elige un preset por nombre, no escribe una URL de Google Fonts.
// Ese detalle importa: si la familia y la importUrl no coinciden, el render
// sale con fuentes de sistema y no es obvio por qué. Acá van juntas siempre.
//
// Los pesos de cada familia están declarados a mano porque Google devuelve un
// 404 —y se cae toda la hoja de estilos, no solo esa familia— si pedís un peso
// que la fuente no tiene.

const enc = name => name.replace(/ /g, '+')

function importUrl({ sans, sansW, serif, serifW, mono, monoW }) {
  return (
    'https://fonts.googleapis.com/css2' +
    `?family=${enc(sans)}:wght@${sansW}` +
    `&family=${enc(serif)}:${serifW}` +
    `&family=${enc(mono)}:wght@${monoW}` +
    '&display=swap'
  )
}

const PRESETS = [
  {
    id: 'moderno',
    label: 'Moderno',
    vibe: 'Neutro y prolijo. Sirve para casi cualquier rubro; es la opción segura.',
    sans: 'Inter', sansW: '400;500;600;700;800;900',
    serif: 'Fraunces', serifW: 'ital,wght@0,400;0,500;1,400;1,500',
    mono: 'JetBrains Mono', monoW: '400;500;600;700',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    vibe: 'Con aire de revista. Estudios, consultoras, servicios profesionales.',
    sans: 'Libre Franklin', sansW: '400;500;600;700;800;900',
    serif: 'Playfair Display', serifW: 'ital,wght@0,400;0,500;1,400;1,500',
    mono: 'IBM Plex Mono', monoW: '400;500;600;700',
  },
  {
    id: 'calido',
    label: 'Cálido',
    vibe: 'Redondeado y cercano. Gastronomía, bienestar, comercios de barrio.',
    sans: 'Nunito Sans', sansW: '400;500;600;700;800;900',
    serif: 'Bitter', serifW: 'ital,wght@0,400;0,500;1,400;1,500',
    mono: 'Space Mono', monoW: '400;700',
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    vibe: 'Seco y actual. Software, oficios técnicos, servicios B2B.',
    sans: 'Chivo', sansW: '400;500;600;700;800;900',
    serif: 'Instrument Serif', serifW: 'ital,wght@0,400;1,400',
    mono: 'IBM Plex Mono', monoW: '400;500;600;700',
  },
  {
    id: 'clasico',
    label: 'Clásico',
    vibe: 'Sobrio y legible. Salud, educación, estudios contables o legales.',
    sans: 'Source Sans 3', sansW: '400;500;600;700;800;900',
    serif: 'Lora', serifW: 'ital,wght@0,400;0,500;1,400;1,500',
    mono: 'IBM Plex Mono', monoW: '400;500;600;700',
  },
  {
    id: 'geometrico',
    label: 'Geométrico',
    vibe: 'Marcado y comercial. Retail, indumentaria, promociones.',
    sans: 'Poppins', sansW: '400;500;600;700;800;900',
    serif: 'DM Serif Display', serifW: 'ital,wght@0,400;1,400',
    mono: 'DM Mono', monoW: '400;500',
  },
]

export const FONT_PRESETS = PRESETS.map(p => ({
  id: p.id,
  label: p.label,
  vibe: p.vibe,
  sans: p.sans,
  serif: p.serif,
  mono: p.mono,
  importUrl: importUrl(p),
}))

export const DEFAULT_FONT = 'moderno'

/* ── tipografías de logotipo ─────────────────────────────────
 *
 * El logotipo NO se dibuja con la tipografía del cuerpo. Coca-Cola no escribe
 * sus avisos en su propia script, y Harrods tampoco: la firma de la marca vive
 * en otro registro que el texto que la acompaña. Con un solo palo seco para las
 * dos cosas, todas las marcas terminan en el mismo tono por más que cambien el
 * tratamiento.
 *
 * Las nueve son OFL (verificado en google/fonts). Eso importa acá más que en el
 * cuerpo del texto: la OFL permite uso comercial *y* no reclama derechos sobre
 * lo que compongas con ella, así que el logotipo resultante es registrable como
 * marca. Con una fuente de licencia restrictiva, el cliente no podría.
 *
 * `caps` marca las que están dibujadas para ir en mayúsculas: Anton y Bebas
 * tienen minúsculas, pero su proporción está pensada para caja alta.
 */
const LOGO_PRESETS = [
  {
    id: 'mismo',
    label: 'La misma del texto',
    vibe: 'Sin contraste. Sobrio y coherente; es lo que hacen la mayoría de los negocios de barrio.',
    family: null,
  },
  {
    id: 'script',
    label: 'Manuscrita con cuerpo',
    vibe: 'Pincel, con peso. Panaderías, cafés, gastronomía, productos artesanales.',
    family: 'Kaushan Script', weights: '400', tracking: '0',
      // Dos letras enlazadas en 40px no se leen: el monograma va con el palo
    // seco del texto. La firma queda script; solo la sigla no.
    monograma: false,
  },
  {
    id: 'caligrafica',
    label: 'Caligráfica fina',
    vibe: 'Trazo delgado y elegante. Estética, joyería, indumentaria, eventos.',
    family: 'Parisienne', weights: '400', tracking: '.01em',
      // Dos letras enlazadas en 40px no se leen: el monograma va con el palo
    // seco del texto. La firma queda script; solo la sigla no.
    monograma: false,
  },
  {
    id: 'serif-alto',
    label: 'Serif de contraste',
    vibe: 'Remates finos, mucho contraste de trazo. Estudios, inmobiliarias, vinos.',
    family: 'Playfair Display', weights: '500;600;700;800;900', tracking: '-.01em',
      monoEscala: 0.94, monoTracking: '0',
  },
  {
    id: 'serif-moderna',
    label: 'Serif moderna',
    vibe: 'Didona, de revista de moda. Belleza, diseño, marcas de autor.',
    family: 'Bodoni Moda', weights: '400;500;600;700;800;900', tracking: '0',
      monoEscala: 0.94, monoTracking: '0',
  },
  {
    id: 'serif-seca',
    label: 'Serif seca',
    vibe: 'Remates rectos, aire de imprenta vieja. Librerías, bares, oficios.',
    family: 'Instrument Serif', weights: '400', tracking: '-.005em',
      monoEscala: 1, monoTracking: '0',
  },
  {
    id: 'condensada',
    label: 'Condensada alta',
    vibe: 'Angosta y en mayúsculas. Talleres, gimnasios, deportivo, construcción.',
    family: 'Bebas Neue', weights: '400', tracking: '.04em', caps: true,
      monoEscala: 1, monoTracking: '.02em',
  },
  {
    id: 'compacta',
    label: 'Compacta pesada',
    vibe: 'Gruesa y apretada, de cartel. Retail, ferreterías, verdulerías.',
    family: 'Anton', weights: '400', tracking: '-.01em', caps: true,
      monoEscala: 0.86, monoTracking: '.02em',
  },
  {
    id: 'bloque',
    label: 'Palo seco negro',
    vibe: 'El palo seco más pesado que hay. Contundente sin ser ruidoso.',
    family: 'Archivo Black', weights: '400', tracking: '-.02em',
      monoEscala: 0.92, monoTracking: '-.01em',
  },
  {
    id: 'egipcia',
    label: 'Egipcia',
    vibe: 'Remates cuadrados y macizos. Cervecerías, parrillas, marcas con oficio.',
    family: 'Alfa Slab One', weights: '400', tracking: '-.01em',
      monoEscala: 0.76, monoTracking: '.01em',
  },
]

export const LOGO_FONTS = LOGO_PRESETS.map(p => ({
  id: p.id, label: p.label, vibe: p.vibe,
  family: p.family, caps: Boolean(p.caps), tracking: p.tracking || '0',
  monograma: p.monograma !== false,
  // Las display anchas se apretujan en 40px: el tracking negativo que le va a
  // un palo seco les pega las letras y las saca del escudo. Se afina por
  // familia, igual que los pesos — no hay forma de medirlo sin un navegador.
  monoEscala: p.monoEscala || 1,
  monoTracking: p.monoTracking || '-.04em',
  // La URL de esta familia sola: se suma a la del preset de texto, no la pisa.
  importUrl: p.family ? `https://fonts.googleapis.com/css2?family=${enc(p.family)}:wght@${p.weights}&display=swap` : null,
}))

export const DEFAULT_LOGO_FONT = 'mismo'

/** Falla fuerte igual que `resolveFonts`: un id inventado no se ignora. */
export function resolveLogoFont(id) {
  const f = LOGO_FONTS.find(p => p.id === (id || DEFAULT_LOGO_FONT))
  if (!f) {
    throw new Error(
      `tipografía de logotipo desconocida: "${id}". Disponibles: ${LOGO_FONTS.map(p => p.id).join(', ')}`
    )
  }
  return f
}

export function resolveFonts(id, logoId) {
  const f = FONT_PRESETS.find(p => p.id === (id || DEFAULT_FONT))
  if (!f) {
    throw new Error(
      `tipografía desconocida: "${id}". Disponibles: ${FONT_PRESETS.map(p => p.id).join(', ')}`
    )
  }
  const lg = resolveLogoFont(logoId)
  return {
    sans: f.sans, serif: f.serif, mono: f.mono, importUrl: f.importUrl, preset: f.id,
    // "mismo" cae al palo seco del preset: el logotipo sin contraste tipográfico.
    logo: {
      preset: lg.id, family: lg.family || f.sans, caps: lg.caps, tracking: lg.tracking,
      // Con qué familia se dibuja la sigla del monograma.
      monogramaFamily: lg.monograma ? (lg.family || f.sans) : f.sans,
      // Si el monograma cae al palo seco, también vuelve al ajuste neutro.
      mono: lg.monograma
        ? { escala: lg.monoEscala, tracking: lg.monoTracking }
        : { escala: 1, tracking: '-.04em' },
    },
    // Las dos URLs, para que el render pida ambas familias.
    importUrls: [f.importUrl, lg.importUrl].filter(Boolean),
  }
}
