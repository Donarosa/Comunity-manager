// Cliente HTTP. Todos los errores del servidor llegan acá como Error con
// mensaje en castellano listo para mostrar — la API los escribe pensando en que
// los va a leer el dueño del negocio, no un programador.

async function pedir(ruta, { metodo = 'GET', cuerpo, texto = false } = {}) {
  const res = await fetch(ruta, {
    method: metodo,
    headers: cuerpo ? { 'content-type': 'application/json' } : {},
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })

  if (texto && res.ok) return res.text()

  let datos = null
  try { datos = await res.json() } catch { /* respuesta sin cuerpo */ }

  if (!res.ok) {
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

  crearCuenta: datos => pedir('/cuentas', { metodo: 'POST', cuerpo: datos }),
  cuenta: id => pedir(`/cuentas/${id}`),

  guardarMarca: (id, datos) => pedir(`/cuentas/${id}/marca`, { metodo: 'POST', cuerpo: datos }),
  sugerirIdentidad: (id, negocio) => pedir(`/cuentas/${id}/identidad/sugerir`, { metodo: 'POST', cuerpo: negocio }),
  adoptarIdentidad: (id, sel) => pedir(`/cuentas/${id}/identidad/adoptar`, { metodo: 'POST', cuerpo: sel }),
  subirLogo: (id, logo) => pedir(`/cuentas/${id}/logo/subir`, { metodo: 'POST', cuerpo: logo }),

  previsualizar: (id, datos) => pedir(`/cuentas/${id}/previsualizar`, { metodo: 'POST', cuerpo: datos, texto: true }),
  renderizar: (id, datos) => pedir(`/cuentas/${id}/placa`, { metodo: 'POST', cuerpo: datos }),
  contenido: (id, datos) => pedir(`/cuentas/${id}/contenido`, { metodo: 'POST', cuerpo: datos }),

  buscarImagenes: (q, pagina = 1, orientacion = '') =>
    pedir(`/imagenes/buscar?q=${encodeURIComponent(q)}&pagina=${pagina}&orientacion=${orientacion}`),
  traerDelBanco: (id, imagenId) => pedir(`/cuentas/${id}/imagenes/banco`, { metodo: 'POST', cuerpo: { id: imagenId } }),
  subirImagen: (id, datos) => pedir(`/cuentas/${id}/imagenes/subir`, { metodo: 'POST', cuerpo: datos }),
}
