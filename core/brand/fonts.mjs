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

export function resolveFonts(id) {
  const f = FONT_PRESETS.find(p => p.id === (id || DEFAULT_FONT))
  if (!f) {
    throw new Error(
      `tipografía desconocida: "${id}". Disponibles: ${FONT_PRESETS.map(p => p.id).join(', ')}`
    )
  }
  return { sans: f.sans, serif: f.serif, mono: f.mono, importUrl: f.importUrl, preset: f.id }
}
