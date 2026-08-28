// Generador y Compositor de Logos de Diseñador.
// Genera las 4 grandes familias de identidad de marca:
// 1. Firma / Caligráfico (tipo Harrods, Coca-Cola)
// 2. Pastilla / Caja de Marca (tipo LEGO, OXO)
// 3. Sello / Medallón Circular (tipo Starbucks, Shell)
// 4. Monograma de Autor (tipo Marcas de Diseñador, Estudios)

import { sanitizeLogoInner } from './schema.mjs'
import { proponerIsotiposParaNegocio, buscarIsotipos } from './repositorio.mjs'

export const FAMILIAS_LOGO = [
  { id: 'firma', nombre: 'Firma / Caligráfico', desc: 'Tipografía de autor continua. La palabra es el logo (tipo Harrods / Coca-Cola).' },
  { id: 'pastilla', nombre: 'Pastilla / Caja de Marca', desc: 'Bloque sólido de alto impacto con contraste pleno (tipo LEGO / OXO).' },
  { id: 'sello', nombre: 'Sello / Medallón Circular', desc: 'Insignia tradicional con texto en arco y símbolo central (tipo Starbucks / Shell).' },
  { id: 'monograma', nombre: 'Monograma de Diseñador', desc: 'Iniciales entrelazadas en marco geométrico + Serif editorial.' },
]

export const REGLAS_LOGO = `Sos un director de arte e identidad visual de primer nivel internacional.
Diseñás composiciones de marca completas: firmas tipográficas de autor, pastillas de alto contraste, sellos circulares y monogramas geométricos con peso y elegancia.`

/** Extrae las iniciales del nombre (ej: "Café Botánico" -> "CB", "Mendieta" -> "M") */
function extraerIniciales(nombre = '') {
  const palabras = String(nombre).trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase()
  }
  return (palabras[0][0] + (palabras[1] ? palabras[1][0] : '')).toUpperCase()
}

/** Limpia y escapa texto para SVG */
function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 1. Genera un logo estilo Firma / Caligráfico de Autor.
 */
export function generarLogoFirma(negocio = {}) {
  const nombre = esc(negocio.nombre || 'Mi Marca')
  const subtitulo = esc((negocio.rubro || negocio.ciudad || 'OFICIO & CALIDAD').toUpperCase())

  const inner = `
    <g text-anchor="middle" fill="currentColor">
      <text x="150" y="58" font-family="'Alex Brush', 'Dancing Script', cursive" font-size="44" transform="rotate(-2 150 58)">${nombre}</text>
      <line x1="40" y1="72" x2="260" y2="72" stroke="currentColor" stroke-width="1.2" opacity="0.75" />
      <text x="150" y="85" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="700" letter-spacing="3" opacity="0.85">${subtitulo}</text>
    </g>
  `

  return {
    id: 'logo-firma',
    familia: 'firma',
    nombre: 'Firma Caligráfica de Autor',
    concepto: `Tipografía fluida de autor con subtítulo artesanal para "${nombre}".`,
    logo: {
      viewBox: '0 0 300 100',
      inner: sanitizeLogoInner(inner),
      strokeWidth: 2,
      strokeWidthSmall: 2,
      origen: 'generador:firma',
    },
  }
}

/**
 * 2. Genera un logo estilo Pastilla / Caja Sólida de Alto Impacto.
 */
export function generarLogoPastilla(negocio = {}) {
  const nombre = esc((negocio.nombre || 'MARCA').toUpperCase())
  const subtitulo = esc((negocio.rubro || 'AUTÉNTICO').toUpperCase())

  const inner = `
    <g fill="currentColor">
      <rect x="10" y="10" width="280" height="80" rx="40" fill="currentColor" />
      <rect x="14" y="14" width="272" height="72" rx="36" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity="0.4" />
      <text x="150" y="54" text-anchor="middle" font-family="'Syne', 'Inter', sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" letter-spacing="1.5">${nombre}</text>
      <text x="150" y="72" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8" font-weight="700" fill="#FFFFFF" letter-spacing="2.5" opacity="0.9">${subtitulo}</text>
    </g>
  `

  return {
    id: 'logo-pastilla',
    familia: 'pastilla',
    nombre: 'Pastilla / Caja de Marca',
    concepto: `Bloque sólido ovalado con tipografía bold de alto contraste para "${nombre}".`,
    logo: {
      viewBox: '0 0 300 100',
      inner: sanitizeLogoInner(inner),
      strokeWidth: 2,
      strokeWidthSmall: 2,
      origen: 'generador:pastilla',
    },
  }
}

/**
 * 3. Genera un logo estilo Sello / Medallón Circular.
 */
export function generarLogoSello(negocio = {}) {
  const nombre = esc((negocio.nombre || 'MI NEGOCIO').toUpperCase())
  const subtitulo = esc((negocio.rubro || negocio.ciudad || 'CALIDAD ARTESANAL').toUpperCase())

  const inner = `
    <defs>
      <path id="sello-arco-sup" d="M 28,100 A 72,72 0 1,1 172,100" fill="none" />
      <path id="sello-arco-inf" d="M 172,100 A 72,72 0 0,0 28,100" fill="none" />
    </defs>
    <g fill="currentColor" stroke="currentColor">
      <circle cx="100" cy="100" r="94" fill="none" stroke-width="3.5" />
      <circle cx="100" cy="100" r="86" fill="none" stroke-width="1.2" stroke-dasharray="3 3" />
      <circle cx="100" cy="100" r="54" fill="none" stroke-width="2" />
      
      <text font-family="'Cinzel', serif" font-size="12" font-weight="700" fill="currentColor" letter-spacing="2.5" stroke="none">
        <textPath href="#sello-arco-sup" startOffset="50%" text-anchor="middle">${nombre}</textPath>
      </text>
      <text font-family="'Inter', sans-serif" font-size="9" font-weight="700" fill="currentColor" letter-spacing="2" stroke="none">
        <textPath href="#sello-arco-inf" startOffset="50%" text-anchor="middle">${subtitulo}</textPath>
      </text>
      
      <!-- Símbolo central de espacio negativo -->
      <path d="M 100 66 C 110 78 114 92 100 110 C 86 92 90 78 100 66 Z" fill="currentColor" stroke="none" />
      <circle cx="100" cy="122" r="3" fill="currentColor" stroke="none" />
      <circle cx="44" cy="100" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="156" cy="100" r="2.5" fill="currentColor" stroke="none" />
    </g>
  `

  return {
    id: 'logo-sello',
    familia: 'sello',
    nombre: 'Sello / Medallón Circular',
    concepto: `Insignia concéntrica con texto en arco y símbolo central para "${nombre}".`,
    logo: {
      viewBox: '0 0 200 200',
      inner: sanitizeLogoInner(inner),
      strokeWidth: 2,
      strokeWidthSmall: 2,
      origen: 'generador:sello',
    },
  }
}

/**
 * 4. Genera un logo estilo Monograma Geométrico de Diseñador.
 */
export function generarLogoMonograma(negocio = {}) {
  const nombre = esc(negocio.nombre || 'Mi Negocio')
  const subtitulo = esc(negocio.rubro || 'Estudio & Consultoría')
  const iniciales = extraerIniciales(negocio.nombre)

  const inner = `
    <g fill="currentColor">
      <!-- Badge cuadrado de iniciales -->
      <rect x="10" y="15" width="70" height="70" rx="14" fill="none" stroke="currentColor" stroke-width="2.5" />
      <rect x="15" y="20" width="60" height="60" rx="10" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.6" />
      <text x="45" y="58" text-anchor="middle" font-family="'Cinzel', serif" font-size="30" font-weight="800" fill="currentColor" letter-spacing="1">${iniciales}</text>
      
      <!-- Bloque tipográfico con Serif -->
      <text x="100" y="50" font-family="'Fraunces', 'Playfair Display', serif" font-size="24" font-weight="700" fill="currentColor" letter-spacing="-0.02em">${nombre}</text>
      <text x="101" y="68" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="600" fill="currentColor" letter-spacing="2" opacity="0.75">${subtitulo}</text>
    </g>
  `

  return {
    id: 'logo-monograma',
    familia: 'monograma',
    nombre: 'Monograma de Diseñador',
    concepto: `Iniciales "${iniciales}" en marco geométrico con tipografía Serif de autor.`,
    logo: {
      viewBox: '0 0 320 100',
      inner: sanitizeLogoInner(inner),
      strokeWidth: 2,
      strokeWidthSmall: 2,
      origen: 'generador:monograma',
    },
  }
}

/**
 * Genera propuestas de las 4 familias de diseño para un negocio concreto.
 */
export async function generarPropuestasCompletas(negocio = {}) {
  const firma = generarLogoFirma(negocio)
  const pastilla = generarLogoPastilla(negocio)
  const sello = generarLogoSello(negocio)
  const monograma = generarLogoMonograma(negocio)

  return [firma, pastilla, sello, monograma]
}

/**
 * Función principal para sugerir logos al negocio en el alta o desde el servicio.
 */
export async function generarLogo(negocio = {}) {
  const { nombre } = negocio
  if (!nombre) throw new Error('falta el nombre del negocio')

  const propuestas = await generarPropuestasCompletas(negocio)
  return { propuestas, usage: {}, costo: 0 }
}
