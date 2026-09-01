// Cliente HTTP. Agrega autenticación Bearer automática y endpoints del dashboard.

import { obtenerToken } from './auth.js'

const API_BASE = (typeof window !== 'undefined' && window.location && (
  window.location.protocol === 'file:' ||
  (window.location.port && window.location.port !== '8787' && !['80', '443', '3000'].includes(window.location.port) && !window.location.hostname.includes('vercel.app'))
)) ? 'http://127.0.0.1:8787' : ''

async function pedir(ruta, { metodo = 'GET', cuerpo, texto = false } = {}) {
  const headers = {}
  if (cuerpo) headers['content-type'] = 'application/json'

  const token = obtenerToken()
  if (token) {
    headers['authorization'] = `Bearer ${token}`
  }

  const urlCompleta = ruta.startsWith('http') ? ruta : `${API_BASE}${ruta}`
  const res = await fetch(urlCompleta, {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })

  if (texto && res.ok) return res.text()

  let datos = null
  try { datos = await res.json() } catch { /* respuesta sin cuerpo */ }

  if (!res.ok) {
    // La sesión guardada ya no sirve: una cuenta de invitado de una versión
    // anterior, o un token vencido. Dejarla puesta hace que todo falle con
    // mensajes que no dicen lo único que hay que hacer, que es volver a entrar.
    // Se limpia y se recarga: la app arranca sin sesión y muestra el ingreso.
    if (res.status === 401 && obtenerToken()) {
      localStorage.removeItem('cm.auth.usuario')
      localStorage.removeItem('cm.auth.token')
      localStorage.removeItem('cm.invitado.id')
      location.reload()
    }
    const e = new Error(datos?.error || `El servidor respondió ${res.status}`)
    e.codigo = datos?.codigo
    e.detalle = datos?.detalle
    e.estado = res.status
    throw e
  }
  return datos
}

export const api = {
  catalogo: () => pedir('/catalogo'),

  // Cuentas y Auth
  crearCuenta: datos => pedir('/cuentas', { metodo: 'POST', cuerpo: datos }),
  cuenta: id => pedir(`/cuentas/${id}`),
  loginFirebase: datos => pedir('/auth/firebase-login', { metodo: 'POST', cuerpo: datos }),

  // Dashboard y métricas personales
  dashboard: id => pedir(`/cuentas/${id}/dashboard`),
  publicaciones: id => pedir(`/cuentas/${id}/publicaciones`),
  planes: id => pedir(`/cuentas/${id}/planes`),
  estadisticas: id => pedir(`/cuentas/${id}/estadisticas`),
  registrarEvento: (id, evento, metadata) => pedir(`/cuentas/${id}/estadisticas/evento`, { metodo: 'POST', cuerpo: { evento, metadata } }),

  // Marca e Identidad
  guardarMarca: (id, datos) => pedir(`/cuentas/${id}/marca`, { metodo: 'POST', cuerpo: datos }),
  sugerirIdentidad: (id, negocio) => pedir(`/cuentas/${id}/identidad/sugerir`, { metodo: 'POST', cuerpo: negocio }),
  adoptarIdentidad: (id, sel) => pedir(`/cuentas/${id}/identidad/adoptar`, { metodo: 'POST', cuerpo: sel }),
  subirLogo: (id, logo) => pedir(`/cuentas/${id}/logo/subir`, { metodo: 'POST', cuerpo: logo }),

  // Contenido y Placas
  previsualizar: (id, datos) => pedir(`/cuentas/${id}/previsualizar`, { metodo: 'POST', cuerpo: datos, texto: true }),
  renderizar: (id, datos) => pedir(`/cuentas/${id}/placa`, { metodo: 'POST', cuerpo: datos }),
  contenido: (id, datos) => pedir(`/cuentas/${id}/contenido`, { metodo: 'POST', cuerpo: datos }),

  // De qué publicar. Vienen guardados de la cuenta salvo que se pidan otros.
  temas: (id, refrescar = false) => pedir(`/cuentas/${id}/temas${refrescar ? '?refrescar=1' : ''}`),

  // Imágenes
  buscarImagenes: (q, pagina = 1, orientacion = '') =>
    pedir(`/imagenes/buscar?q=${encodeURIComponent(q)}&pagina=${pagina}&orientacion=${orientacion}`),
  traerDelBanco: (id, imagenId) => pedir(`/cuentas/${id}/imagenes/banco`, { metodo: 'POST', cuerpo: { id: imagenId } }),
  subirImagen: (id, datos) => pedir(`/cuentas/${id}/imagenes/subir`, { metodo: 'POST', cuerpo: datos }),
}
