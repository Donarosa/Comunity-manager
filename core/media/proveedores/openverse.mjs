// Openverse. No precisa clave: es la red de contención para que el banco de
// imágenes funcione sin configurar nada.
//
// Es el único con licencias verdaderamente abiertas y, paradójicamente, el más
// problemático para este producto: cerca del 90% de lo que devuelve es CC BY-SA,
// que es ShareAlike — la obra derivada tiene que llevar la misma licencia. Una
// placa promocional con el logo de un negocio encima ES una obra derivada.
//
// Por eso queda al final del orden de mezcla y sus resultados se marcan. Además
// no es una fototeca curada sino un archivo agregado de Flickr y Wikimedia, así
// que la calidad es despareja.
//
// Sin clave: 20 pedidos por minuto y 200 por día, y page_size tope 20.

import { traerJSON, ORIENTACION, credito } from './comun.mjs'

const API = 'https://api.openverse.org/v1/images'
const clave = () => process.env.OPENVERSE_TOKEN || ''

// Solo licencias que permiten uso comercial Y modificación. Lo segundo no es un
// detalle: poner un título encima crea una obra derivada, así que una licencia
// "sin derivadas" (by-nd) no sirve por más gratis que sea.
const LICENCIAS = 'commercial,modification'

const NOMBRE = { cc0: 'CC0', pdm: 'dominio público', by: 'CC BY', 'by-sa': 'CC BY-SA' }

const normalizar = r => ({
  id: `openverse:${r.id}`,
  proveedor: 'openverse',
  titulo: r.title || '',
  autor: r.creator || '',
  autorUrl: r.creator_url || '',
  licencia: r.license,
  licenciaUrl: r.license_url || '',
  fuente: r.source || r.provider || 'Openverse',
  origen: r.foreign_landing_url || '',
  miniatura: r.thumbnail || `${API}/${r.id}/thumb/`,
  urlDescarga: r.url || '',
  ancho: r.width || null,
  alto: r.height || null,
  shareAlike: r.license === 'by-sa',
  credito: r.license === 'cc0' || r.license === 'pdm'
    ? `Foto: ${r.creator || 'autor desconocido'} · ${NOMBRE[r.license]}`
    : `Foto: ${r.creator || 'autor desconocido'} (${NOMBRE[r.license] || r.license.toUpperCase()}) vía ${r.source || r.provider}`,
})

export default {
  id: 'openverse',
  nombre: 'Openverse',
  clave: 'OPENVERSE_TOKEN',
  atribucion: 'obligatoria',
  shareAlike: true,
  alta: 'https://api.openverse.org/v1/auth_tokens/register/',
  opcionalLaClave: true, // funciona sin ella, con menos cupo

  disponible: () => true,

  async buscar({ q, pagina = 1, orientacion = '', cantidad = 20 }) {
    const conToken = Boolean(clave())
    const p = new URLSearchParams({
      q,
      page: String(Math.max(1, Math.min(20, pagina))),
      // Sin clave rechaza con 401 cualquier page_size mayor a 20.
      page_size: String(conToken ? Math.min(40, cantidad) : Math.min(20, cantidad)),
      license_type: LICENCIAS,
      mature: 'false',
    })
    const o = ORIENTACION.openverse[orientacion]
    if (o) p.set('aspect_ratio', o)

    const headers = conToken ? { Authorization: `Bearer ${clave()}` } : {}
    const j = await traerJSON(`${API}/?${p}`, { headers })
    return (j.results || []).map(normalizar)
  },

  async resolver(idLocal) {
    const j = await traerJSON(`${API}/${encodeURIComponent(idLocal)}/`)
    const meta = normalizar(j)
    return { url: meta.urlDescarga, meta }
  },
}
