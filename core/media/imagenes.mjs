// Imágenes: bancos de fotos y subida propia.
//
// No generamos imágenes. Una foto inventada de una panadería que no es esta
// panadería no es un atajo: es una mentira chiquita que el vecino que pasa por
// la puerta todos los días detecta enseguida. Hay dos caminos honestos — la foto
// que sacó el negocio, o una de banco con su crédito.
//
// Los bancos viven en proveedores/ detrás de una interfaz común. Este archivo
// los consulta en paralelo y mezcla los resultados. Ver proveedores/README.md
// para por qué "open source" no es el criterio correcto acá.

import { writeFileSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { createHash } from 'crypto'
import { carpetaPiezas } from '../store/store.mjs'
import { UA } from './proveedores/comun.mjs'

import pexels from './proveedores/pexels.mjs'
import unsplash from './proveedores/unsplash.mjs'
import pixabay from './proveedores/pixabay.mjs'
import openverse from './proveedores/openverse.mjs'

// El orden importa: es el orden en que se intercalan los resultados, así que la
// primera fila de la galería sale del mejor banco disponible. Openverse va
// último a propósito — ver su archivo.
const PROVEEDORES = [pexels, unsplash, pixabay, openverse]
const porId = Object.fromEntries(PROVEEDORES.map(p => [p.id, p]))

const MAX_BYTES = 15 * 1024 * 1024

/** Qué bancos están configurados. La interfaz lo usa para orientar al usuario. */
export function estadoBanco() {
  return {
    activos: PROVEEDORES.filter(p => p.disponible()).map(p => ({
      id: p.id, nombre: p.nombre, atribucion: p.atribucion, shareAlike: p.shareAlike,
    })),
    faltantes: PROVEEDORES.filter(p => !p.disponible()).map(p => ({
      id: p.id, nombre: p.nombre, clave: p.clave, alta: p.alta,
    })),
  }
}

/**
 * Intercala listas: uno de cada banco por vuelta.
 *
 * Concatenarlas daría veinte fotos de Pexels y después veinte de Pixabay, y el
 * usuario nunca llegaría a las segundas. Intercaladas, la primera pantalla ya
 * muestra la variedad de todos.
 */
export function intercalar(listas) {
  const salida = []
  const largo = Math.max(0, ...listas.map(l => l.length))
  for (let i = 0; i < largo; i++) {
    for (const lista of listas) if (lista[i]) salida.push(lista[i])
  }
  return salida
}

/**
 * Busca en todos los bancos configurados a la vez.
 *
 * Si un banco falla —se quedó sin cupo, la clave venció— los demás siguen
 * andando y el usuario ni se entera. Solo se lanza error si fallan todos.
 */
export async function buscarImagenes({ q, pagina = 1, orientacion = '' }) {
  const consulta = String(q || '').trim()
  if (consulta.length < 2) throw new Error('escribí al menos dos letras para buscar')

  const activos = PROVEEDORES.filter(p => p.disponible())
  const pag = Math.max(1, Math.min(20, Number(pagina) || 1))

  const resultados = await Promise.allSettled(
    activos.map(p => p.buscar({ q: consulta, pagina: pag, orientacion, cantidad: 20 }))
  )

  const listas = []
  const fallas = []
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') listas.push(r.value)
    else fallas.push(`${activos[i].nombre}: ${r.reason.message}`)
  })

  if (!listas.length) {
    throw new Error(`ningún banco de imágenes respondió. ${fallas.join(' · ')}`)
  }

  const mezcladas = intercalar(listas)
  return {
    total: mezcladas.length,
    resultados: mezcladas,
    // Solo los que efectivamente pusieron fotos en la grilla. Un banco puede
    // responder 200 con la lista vacía —le pasaba a Unsplash con consultas en
    // español— y nombrarlo igual le dice al usuario que miró un banco que no
    // aportó nada.
    bancos: activos
      .filter((_, i) => resultados[i].status === 'fulfilled' && resultados[i].value.length > 0)
      .map(p => p.nombre),
    fallas,
  }
}

/* ── descarga ────────────────────────────────────────────── */

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

// Firmas de archivo. Se comprueba el contenido real, no el content-type que
// declara el servidor de enfrente ni la extensión del nombre.
function tipoReal(buf) {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  return null
}

async function bajar(url) {
  if (!/^https:\/\//.test(url || '')) throw new Error('el banco devolvió una dirección que no es https')

  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`no se pudo bajar la imagen (${res.status})`)
  if (Number(res.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('la imagen pesa más de 15 MB')

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_BYTES) throw new Error('la imagen pesa más de 15 MB')

  const tipo = tipoReal(buf)
  if (!tipo) throw new Error('el archivo no es una imagen JPG, PNG ni WEBP')
  return { buf, tipo }
}

/**
 * Guarda en la cuenta una imagen del banco.
 *
 * Recibe el id compuesto ("pexels:12345"), no una URL: la dirección de descarga
 * la resuelve el servidor contra la API del banco. Aceptar una URL arbitraria
 * del cliente convertiría este endpoint en un explorador de la red interna.
 */
export async function guardarDelBanco(cuentaId, idCompuesto) {
  const [prefijo, ...resto] = String(idCompuesto || '').split(':')
  const idLocal = resto.join(':')
  const prov = porId[prefijo]

  if (!prov) throw new Error(`no conozco el banco "${prefijo}"`)
  if (!prov.disponible()) throw new Error(`${prov.nombre} no está configurado`)
  if (!/^[\w-]{1,64}$/.test(idLocal)) throw new Error('id de imagen inválido')

  const { url, meta } = await prov.resolver(idLocal)
  const { buf, tipo } = await bajar(url)

  const dir = carpetaPiezas(cuentaId, 'imagenes')
  const archivo = join(dir, `${prefijo}-${idLocal}${EXT[tipo]}`)
  if (!existsSync(archivo)) writeFileSync(archivo, buf)

  // Unsplash exige avisar el uso en sus términos de API. Va después de guardar
  // y falla en silencio: el aviso no puede costarle la placa al usuario.
  await prov.avisarUso?.(meta)

  const { _avisoUrl, ...limpio } = meta
  return { ...limpio, ruta: archivo, bytes: buf.length }
}

/** Guarda una imagen que subió el usuario (llega en base64 desde el navegador). */
export function guardarSubida(cuentaId, { datos, nombre = 'foto' }) {
  const b64 = String(datos || '').replace(/^data:image\/[a-z+]+;base64,/, '')
  if (!b64) throw new Error('no llegó ninguna imagen')

  let buf
  try { buf = Buffer.from(b64, 'base64') } catch { throw new Error('la imagen llegó mal codificada') }
  if (buf.length > MAX_BYTES) throw new Error('la imagen pesa más de 15 MB')

  const tipo = tipoReal(buf)
  if (!tipo) throw new Error('el archivo no es una imagen JPG, PNG ni WEBP')

  const dir = carpetaPiezas(cuentaId, 'imagenes')
  const base = String(nombre).replace(extname(nombre), '').replace(/[^\w-]/g, '-').slice(0, 40) || 'foto'
  const hash = createHash('sha1').update(buf).digest('hex').slice(0, 8)
  const archivo = join(dir, `propia-${base}-${hash}${EXT[tipo]}`)
  if (!existsSync(archivo)) writeFileSync(archivo, buf)

  return { ruta: archivo, bytes: buf.length, tipo, credito: '' }
}
