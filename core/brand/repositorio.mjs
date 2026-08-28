// Repositorio de isotipos vectoriales profesionales para marcas.
// Conecta con Iconify (Phosphor, Solar, Lucide, Tabler, etc.) y provee catálogo curado.

import { sanitizeLogoInner } from './schema.mjs'

const COLECCIONES_PREFERIDAS = [
  'solar',        // Iconos con masa, duotone y curvas muy modernas
  'ph',           // Phosphor Icons (diseño tipográfico de alta calidad)
  'lucide',       // Trazo limpio y consistente
  'tabler',       // Muy completo y balanceado
  'mynaui',       // Minimalismo nórdico
  'material-symbols', // Geometría pura
  'boxicons',
]

const DICCIONARIO_RUBROS = {
  cafe: ['coffee', 'cup', 'coffee-beans', 'mug', 'tea'],
  cafeteria: ['coffee', 'cup', 'coffee-beans', 'croissant', 'cafe'],
  panaderia: ['bread', 'bakery', 'wheat', 'croissant', 'cake', 'doughnut'],
  pasteleria: ['cake', 'cupcake', 'sweet', 'bakery', 'cookie'],
  vivero: ['plant', 'leaf', 'flower', 'sprout', 'tree', 'cactus', 'garden'],
  botanica: ['leaf', 'plant', 'flower', 'nature', 'flora', 'sprout'],
  abogado: ['law', 'scale', 'balance', 'justice', 'gavel', 'court'],
  estudio: ['balance', 'document', 'chart', 'shield', 'briefcase'],
  contable: ['chart', 'calculator', 'graph', 'coins', 'receipt', 'wallet'],
  mecanica: ['wrench', 'gear', 'car', 'engine', 'tool', 'nut'],
  taller: ['wrench', 'hammer', 'tool', 'gear', 'screwdriver', 'pliers'],
  gimnasio: ['dumbbell', 'barbell', 'fitness', 'muscle', 'kettlebell', 'run'],
  fitness: ['dumbbell', 'heartbeat', 'running', 'flame', 'energy', 'sport'],
  medico: ['stethoscope', 'heartbeat', 'medical', 'hospital', 'cross', 'doctor'],
  salud: ['heart', 'leaf', 'pulse', 'lotus', 'health', 'shield-plus'],
  estetica: ['sparkles', 'lotus', 'scissors', 'face', 'gem', 'flower'],
  peluqueria: ['scissors', 'comb', 'razor', 'hair', 'sparkles'],
  inmobiliaria: ['home', 'building', 'house', 'key', 'door', 'roof'],
  arquitectura: ['ruler', 'compass', 'building', 'cube', 'pyramid', 'blueprint'],
  restaurante: ['fork-knife', 'chef', 'restaurant', 'plate', 'wine', 'burger'],
  gastronomia: ['chef', 'kitchen', 'pan', 'fire', 'pot', 'fork-knife'],
  ropa: ['t-shirt', 'hanger', 'needle', 'tag', 'shopping-bag', 'dress'],
  indumentaria: ['hanger', 'shirt', 'scissors', 'tag', 'crown', 'sparkles'],
  diseno: ['palette', 'brush', 'pen', 'vector', 'layers', 'crop', 'bezier'],
  tecnologia: ['code', 'chip', 'cpu', 'device', 'laptop', 'wifi', 'robot'],
  veterinaria: ['paw', 'dog', 'cat', 'bone', 'heart-paw', 'stethoscope'],
  mascotas: ['paw', 'dog', 'cat', 'pet', 'fish', 'bone'],
}

export function normalizarSVGIcono(svgRaw, origen = 'iconify') {
  if (!svgRaw || typeof svgRaw !== 'string') return null

  const vbMatch = svgRaw.match(/viewBox=["']([^"']+)["']/i)
  const viewBox = vbMatch ? vbMatch[1] : '0 0 24 24'

  let inner = svgRaw.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>$/i, '').trim()

  inner = inner.replace(/fill=["']#(000|000000|111|111111|222|222222|333|333333)["']/gi, 'fill="currentColor"')
  inner = inner.replace(/stroke=["']#(000|000000|111|111111|222|222222|333|333333)["']/gi, 'stroke="currentColor"')

  const innerLimpio = sanitizeLogoInner(inner)
  if (!innerLimpio) return null

  return {
    viewBox,
    inner: innerLimpio,
    strokeWidth: 2,
    strokeWidthSmall: 2,
    origen,
  }
}

export function mapearTerminosBusqueda(texto) {
  if (!texto) return ['star', 'sparkles', 'crown', 'gem']
  const limpio = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const palabras = limpio.split(/[\s,.-]+/).filter(Boolean)

  const terminos = new Set()
  for (const p of palabras) {
    for (const [clave, sinonimos] of Object.entries(DICCIONARIO_RUBROS)) {
      if (p.includes(clave) || clave.includes(p)) {
        sinonimos.forEach(s => terminos.add(s))
      }
    }
  }

  if (!terminos.size) {
    palabras.slice(0, 3).forEach(p => terminos.add(p))
  }

  return Array.from(terminos)
}

export async function buscarIsotipos(query, limite = 24) {
  const q = String(query || '').trim()
  if (!q) return []

  const terminos = mapearTerminosBusqueda(q)
  const terminoPrincipal = terminos[0] || q

  try {
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(terminoPrincipal)}&limit=48`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const iconos = data.icons || []

    const ordenados = iconos.sort((a, b) => {
      const colA = a.split(':')[0]
      const colB = b.split(':')[0]
      const idxA = COLECCIONES_PREFERIDAS.indexOf(colA)
      const idxB = COLECCIONES_PREFERIDAS.indexOf(colB)
      const scoreA = idxA === -1 ? 99 : idxA
      const scoreB = idxB === -1 ? 99 : idxB
      return scoreA - scoreB
    }).slice(0, limite)

    const promesas = ordenados.map(async id => {
      try {
        const svgRes = await fetch(`https://api.iconify.design/${id}.svg`)
        if (!svgRes.ok) return null
        const svgText = await svgRes.text()
        const logo = normalizarSVGIcono(svgText, `iconify:${id}`)
        if (!logo) return null

        const [col, nombre] = id.split(':')
        return {
          id,
          nombre: nombre.replace(/[-_]/g, ' '),
          coleccion: col,
          logo,
        }
      } catch {
        return null
      }
    })

    const resultados = (await Promise.all(promesas)).filter(Boolean)
    return resultados
  } catch (e) {
    console.error('Error buscando isotipos en Iconify:', e.message)
    return obtenerLogosCuradosFallback(q)
  }
}

export async function proponerIsotiposParaNegocio(negocio = {}) {
  const query = [negocio.rubro, negocio.queVende, negocio.diferencial, negocio.nombre]
    .filter(Boolean)
    .join(' ')

  const resultados = await buscarIsotipos(query, 8)
  if (resultados.length >= 4) {
    return resultados.slice(0, 4).map((r, i) => ({
      id: `propuesta-${i + 1}`,
      concepto: `Isotipo ${r.coleccion.toUpperCase()} · ${r.nombre}`,
      logo: r.logo,
    }))
  }

  const fallbacks = obtenerLogosCuradosFallback(query)
  const combinados = [...resultados, ...fallbacks]
  return combinados.slice(0, 4).map((r, i) => ({
    id: `propuesta-${i + 1}`,
    concepto: r.concepto || `Isotipo de catálogo · ${r.nombre || 'Diseño moderno'}`,
    logo: r.logo,
  }))
}

export function obtenerLogosCuradosFallback(rubro = '') {
  return [
    {
      id: 'curado-cafe-1',
      nombre: 'Taza & Vapor Dinámico',
      concepto: 'Taza minimalista con curva de vapor continua y masa sólida.',
      logo: {
        viewBox: '0 0 24 24',
        inner: '<path fill="currentColor" d="M2 21h18a1 1 0 0 0 1-1v-1H2v1a1 1 0 0 0 1 1M20 8h-2V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a4 4 0 0 0 4 4h7a4 4 0 0 0 4-4v-2h2a3 3 0 0 0 3-3V9a1 1 0 0 0-1-1m-4 7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h11Zm4-4a1 1 0 0 1-1 1h-1v-2h1a1 1 0 0 1 1 1"/>',
        strokeWidth: 2,
        strokeWidthSmall: 2,
        origen: 'curado',
      },
    },
    {
      id: 'curado-pan-1',
      nombre: 'Espiga & Masa Madre',
      concepto: 'Espiga estructurada con granos llenos y geometría de horno.',
      logo: {
        viewBox: '0 0 24 24',
        inner: '<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93m6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39"/>',
        strokeWidth: 2,
        strokeWidthSmall: 2,
        origen: 'curado',
      },
    },
    {
      id: 'curado-botanica-1',
      nombre: 'Hoja Orgánica & Brote',
      concepto: 'Hoja de curvas fluidas con espacio negativo central.',
      logo: {
        viewBox: '0 0 24 24',
        inner: '<path fill="currentColor" d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8"/>',
        strokeWidth: 2,
        strokeWidthSmall: 2,
        origen: 'curado',
      },
    },
    {
      id: 'curado-emblema-1',
      nombre: 'Insignia & Estrella',
      concepto: 'Emblema geométrico versátil con estrella central.',
      logo: {
        viewBox: '0 0 24 24',
        inner: '<path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4a3 3 0 0 1 3 3c0 2-3 5-3 5s-3-3-3-5a3 3 0 0 1 3-3z"/>',
        strokeWidth: 2,
        strokeWidthSmall: 2,
        origen: 'curado',
      },
    },
  ]
}
