// Normalización de la marca de un cliente.
//
// Entra lo poco que una pyme sabe de sí misma (nombre, un color, un @) y sale
// el objeto `brand` completo que el motor espera. Nada de esto vive en el
// código del motor: es todo dato del cliente.

import { derivePalette } from './palette.mjs'
import { resolveFonts, DEFAULT_FONT } from './fonts.mjs'
import { resolverDisposicion, DISPOSICION_POR_DEFECTO } from '../render/disposiciones.mjs'

/* ── logo ───────────────────────────────────────────────── */

// Un logo puede venir de tres lados: subido por el usuario, generado por IA, o
// el default. En los tres casos pasa por acá antes de entrar en un render.
// Solo sobreviven <path> y <circle> con sus atributos geométricos: sin `fill`
// ni `stroke` (los pone el CSS con currentColor, para que el logo funcione en
// fondo claro y oscuro), y sin <script>, <image> ni <foreignObject>.
const ALLOWED = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
}

export function sanitizeLogoInner(inner) {
  if (!inner || typeof inner !== 'string') return ''
  const out = []
  const tagRe = /<(path|circle)\b([^>]*?)\/?>/gi
  let m
  while ((m = tagRe.exec(inner))) {
    const tag = m[1].toLowerCase()
    const attrs = []
    const attrRe = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g
    let a
    while ((a = attrRe.exec(m[2]))) {
      const name = a[1].toLowerCase()
      if (!ALLOWED[tag].includes(name)) continue
      const value = a[2]
      // Solo números, letras de comando de path, comas, puntos, signos y espacios.
      if (!/^[-0-9.,\sA-Za-z]*$/.test(value)) continue
      attrs.push(`${name}="${value}"`)
    }
    if (attrs.length) out.push(`<${tag} ${attrs.join(' ')}/>`)
  }
  return out.join('')
}

export const DEFAULT_LOGO = {
  viewBox: '0 0 100 100',
  inner: '<path d="M 22 22 L 78 22 L 78 62 C 78 74 68 78 56 78 L 22 78 Z"/><circle cx="34" cy="50" r="7"/>',
  strokeWidth: 8,
  strokeWidthSmall: 7,
}

export function normalizeLogo(logo) {
  if (!logo) return { ...DEFAULT_LOGO, origen: 'default' }
  const inner = sanitizeLogoInner(logo.inner)
  if (!inner) return { ...DEFAULT_LOGO, origen: 'default' }
  const vb = String(logo.viewBox || '0 0 100 100')
  if (!/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/.test(vb)) {
    throw new Error(`viewBox inválido: "${vb}"`)
  }
  const sw = Number(logo.strokeWidth)
  return {
    viewBox: vb,
    inner,
    strokeWidth: Number.isFinite(sw) && sw > 0 && sw <= 24 ? sw : 8,
    strokeWidthSmall: Number(logo.strokeWidthSmall) || Math.max(1, Math.round((sw || 8) * 0.85)),
    origen: logo.origen || 'usuario',
  }
}

/* ── wordmark ───────────────────────────────────────────── */

// Dos tonos: la última palabra en color de acento. "Panadería Mendieta" sale
// como Panadería + Mendieta en bordó. De una sola palabra, va entera plana.
export function deriveWordmark(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) throw new Error('falta el nombre del negocio')
  if (partes.length === 1) return { base: partes[0], accent: '' }
  return { base: partes.slice(0, -1).join(' ') + ' ', accent: partes[partes.length - 1] }
}

const slugify = s =>
  String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '').slice(0, 24)

/* ── marca completa ─────────────────────────────────────── */

/**
 * @param {object} input datos crudos del onboarding
 * @returns {{brand:object, warnings:string[]}}
 */
export function normalizeBrand(input = {}) {
  const nombre = String(input.nombre || '').trim()
  if (!nombre) throw new Error('falta el nombre del negocio')

  const color = input.color || '#4F46E5'
  const { flat, vector, foto, warnings, hue } = derivePalette({
    accent: color,
    deep: input.colorSecundario,
  })

  const fonts = resolveFonts(input.tipografia || DEFAULT_FONT)
  // Falla fuerte si el id no existe, igual que con la tipografía.
  const disposicion = resolverDisposicion(input.disposicion || DISPOSICION_POR_DEFECTO).id
  const logo = normalizeLogo(input.logo)
  if (logo.origen === 'default') {
    warnings.push('Todavía no hay logo propio: se usa el símbolo genérico. Se puede generar uno.')
  }

  const slug = slugify(nombre)
  const handle = input.handle
    ? '@' + String(input.handle).replace(/^@/, '')
    : '@' + slug
  const site = String(input.sitio || `instagram.com/${handle.slice(1)}`).replace(/^https?:\/\//, '')

  const brand = {
    nombre,
    wordmark: input.wordmark?.base ? input.wordmark : deriveWordmark(nombre),
    handle,
    site,
    altSite: input.altSitio ? String(input.altSitio).replace(/^https?:\/\//, '') : site,
    logo,
    fonts,
    disposicion,
    colors: { flat, vector, foto },
    scene: input.scene || null,
    hints: {
      cover: input.hints?.cover || 'Deslizá →',
      trial: input.hints?.trial || 'Escribinos →',
    },
    // Contexto de negocio: no lo usa el motor, lo usa el generador de contenido.
    negocio: {
      rubro: input.rubro || null,
      ciudad: input.ciudad || null,
      publico: input.publico || null,
      queVende: input.queVende || null,
      diferencial: input.diferencial || null,
      tono: input.tono || null,
      voz: input.voz || null,
      noDecir: input.noDecir || [],
    },
    meta: { slug, hue, colorOriginal: color, creada: input.creada || new Date().toISOString() },
  }

  return { brand, warnings }
}
