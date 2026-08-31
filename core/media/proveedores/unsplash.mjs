// Unsplash. Clave gratuita e instantánea en unsplash.com/developers.
// En modo demo son 50 pedidos por hora; pidiendo aprobación sube a 5.000.
//
// Licencia Unsplash: uso comercial, modificación permitida, sin ShareAlike.
// Pero sus términos de API sí exigen dos cosas, y las dos están implementadas:
//
//   1. Crédito al fotógrafo y a Unsplash. Por eso `atribucion: 'obligatoria'`.
//   2. Avisar el uso llamando a `links.download_location` cuando la foto se usa
//      de verdad — no al mostrarla en resultados. Está en `avisarUso()`, que el
//      orquestador llama al guardar la imagen en la cuenta, no al buscar.
//      Saltearse esto es incumplir sus términos, no un detalle de cortesía.

import { traerJSON, ORIENTACION, credito } from './comun.mjs'

const API = 'https://api.unsplash.com'
const clave = () => process.env.UNSPLASH_ACCESS_KEY || ''
const auth = () => ({ Authorization: `Client-ID ${clave()}`, 'Accept-Version': 'v1' })

const normalizar = f => ({
  id: `unsplash:${f.id}`,
  proveedor: 'unsplash',
  titulo: f.description || f.alt_description || '',
  autor: f.user?.name || '',
  autorUrl: f.user?.links?.html || '',
  licencia: 'unsplash',
  licenciaUrl: 'https://unsplash.com/license',
  fuente: 'Unsplash',
  origen: f.links?.html || '',
  miniatura: f.urls?.small || f.urls?.thumb || '',
  urlDescarga: f.urls?.regular || f.urls?.full || '',
  ancho: f.width || null,
  alto: f.height || null,
  // Guardado para avisarUso(). No se muestra nunca.
  _avisoUrl: f.links?.download_location || '',
  credito: credito({ autor: f.user?.name, fuente: 'Unsplash', atribucion: 'obligatoria' }),
})

export default {
  id: 'unsplash',
  nombre: 'Unsplash',
  clave: 'UNSPLASH_ACCESS_KEY',
  atribucion: 'obligatoria',
  shareAlike: false,
  alta: 'https://unsplash.com/developers',

  disponible: () => Boolean(clave()),

  async buscar({ q, pagina = 1, orientacion = '', cantidad = 20 }) {
    const p = new URLSearchParams({
      query: q,
      page: String(pagina),
      per_page: String(Math.min(30, cantidad)),
      content_filter: 'high',
      // Sin esto Unsplash busca el texto tal cual contra un índice en inglés y
      // una consulta en español devuelve cero. No fallaba: respondía 200 con la
      // lista vacía, así que el banco figuraba como activo y no aportaba nada.
      // "taller de bicicletas" pasa de 0 a 3.400 resultados con lang=es.
      lang: 'es',
    })
    const o = ORIENTACION.unsplash[orientacion]
    if (o) p.set('orientation', o)

    const j = await traerJSON(`${API}/search/photos?${p}`, { headers: auth() })
    return (j.results || []).map(normalizar)
  },

  async resolver(idLocal) {
    const j = await traerJSON(`${API}/photos/${encodeURIComponent(idLocal)}`, { headers: auth() })
    const meta = normalizar(j)
    return { url: meta.urlDescarga, meta }
  },

  /** Requisito de los términos de Unsplash. Falla en silencio: no romper el
   *  guardado de la imagen porque el aviso no salió. */
  async avisarUso(meta) {
    if (!meta?._avisoUrl) return
    try {
      await fetch(meta._avisoUrl, { headers: auth(), signal: AbortSignal.timeout(8000) })
    } catch { /* no es motivo para cortarle la placa al usuario */ }
  },
}
