// Pexels. Clave gratuita e instantánea en pexels.com/api.
//
// Licencia Pexels: uso comercial, modificación permitida, sin atribución
// obligatoria y sin ShareAlike. Sus lineamientos piden mostrar que las fotos
// vienen de Pexels y acreditar al fotógrafo cuando se pueda, así que el crédito
// se arma igual.
//
// Es el que tiene mejor soporte de consultas en castellano: acepta `locale`.

import { traerJSON, ORIENTACION, credito } from './comun.mjs'

const API = 'https://api.pexels.com/v1'
const clave = () => process.env.PEXELS_API_KEY || ''

const normalizar = f => ({
  id: `pexels:${f.id}`,
  proveedor: 'pexels',
  titulo: f.alt || '',
  autor: f.photographer || '',
  autorUrl: f.photographer_url || '',
  licencia: 'pexels',
  licenciaUrl: 'https://www.pexels.com/license/',
  fuente: 'Pexels',
  origen: f.url || '',
  miniatura: f.src?.medium || f.src?.small || '',
  urlDescarga: f.src?.large2x || f.src?.large || f.src?.original || '',
  ancho: f.width || null,
  alto: f.height || null,
  credito: credito({ autor: f.photographer, fuente: 'Pexels', atribucion: 'opcional' }),
})

export default {
  id: 'pexels',
  nombre: 'Pexels',
  clave: 'PEXELS_API_KEY',
  atribucion: 'opcional',
  shareAlike: false,
  alta: 'https://www.pexels.com/api/',

  disponible: () => Boolean(clave()),

  async buscar({ q, pagina = 1, orientacion = '', cantidad = 20 }) {
    const p = new URLSearchParams({
      query: q,
      page: String(pagina),
      per_page: String(Math.min(80, cantidad)),
      locale: 'es-ES',
    })
    const o = ORIENTACION.pexels[orientacion]
    if (o) p.set('orientation', o)

    const j = await traerJSON(`${API}/search?${p}`, { headers: { Authorization: clave() } })
    return (j.photos || []).map(normalizar)
  },

  async resolver(idLocal) {
    const j = await traerJSON(`${API}/photos/${encodeURIComponent(idLocal)}`, {
      headers: { Authorization: clave() },
    })
    const meta = normalizar(j)
    return { url: meta.urlDescarga, meta }
  },
}
