// Pixabay. Clave gratuita e instantánea en pixabay.com/api/docs.
//
// Licencia de contenido Pixabay: uso comercial, modificación permitida, sin
// atribución obligatoria y sin ShareAlike. La calidad es un escalón por debajo
// de Pexels y Unsplash —hay más material de banco genérico— pero el volumen es
// enorme y acepta consultas en castellano con `lang=es`, así que para rubros
// locales suele traer cosas que los otros no tienen.

import { traerJSON, ORIENTACION, credito } from './comun.mjs'

const API = 'https://pixabay.com/api/'
const clave = () => process.env.PIXABAY_API_KEY || ''

const normalizar = f => ({
  id: `pixabay:${f.id}`,
  proveedor: 'pixabay',
  titulo: (f.tags || '').split(',').slice(0, 3).join(', '),
  autor: f.user || '',
  autorUrl: f.user ? `https://pixabay.com/users/${f.user}-${f.user_id}/` : '',
  licencia: 'pixabay',
  licenciaUrl: 'https://pixabay.com/service/license-summary/',
  fuente: 'Pixabay',
  origen: f.pageURL || '',
  miniatura: f.webformatURL || f.previewURL || '',
  urlDescarga: f.largeImageURL || f.webformatURL || '',
  ancho: f.imageWidth || null,
  alto: f.imageHeight || null,
  credito: credito({ autor: f.user, fuente: 'Pixabay', atribucion: 'no' }),
})

export default {
  id: 'pixabay',
  nombre: 'Pixabay',
  clave: 'PIXABAY_API_KEY',
  atribucion: 'no',
  shareAlike: false,
  alta: 'https://pixabay.com/api/docs/',

  disponible: () => Boolean(clave()),

  async buscar({ q, pagina = 1, orientacion = '', cantidad = 20 }) {
    const p = new URLSearchParams({
      key: clave(),
      q,
      page: String(pagina),
      // Pixabay exige per_page entre 3 y 200.
      per_page: String(Math.max(3, Math.min(200, cantidad))),
      image_type: 'photo',
      safesearch: 'true',
      lang: 'es',
    })
    const o = ORIENTACION.pixabay[orientacion]
    if (o) p.set('orientation', o)

    const j = await traerJSON(`${API}?${p}`)
    return (j.hits || []).map(normalizar)
  },

  async resolver(idLocal) {
    const p = new URLSearchParams({ key: clave(), id: String(idLocal) })
    const j = await traerJSON(`${API}?${p}`)
    const hit = (j.hits || [])[0]
    if (!hit) throw new Error('no encuentro esa imagen en Pixabay')
    const meta = normalizar(hit)
    return { url: meta.urlDescarga, meta }
  },
}
