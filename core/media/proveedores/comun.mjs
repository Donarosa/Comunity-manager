// Piezas compartidas por los adaptadores de bancos de imágenes.

export const UA = 'cm-pymes/1.0 (generador de placas para pymes)'

/** Las orientaciones nuestras, traducidas a las de cada banco. */
export const ORIENTACION = {
  pexels: { vertical: 'portrait', horizontal: 'landscape' },
  unsplash: { vertical: 'portrait', horizontal: 'landscape' },
  pixabay: { vertical: 'vertical', horizontal: 'horizontal' },
  openverse: { vertical: 'tall', horizontal: 'wide' },
}

export async function traerJSON(url, { headers = {}, timeout = 15000 } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(timeout),
  })

  if (!res.ok) {
    // El motivo suele venir en el cuerpo. Tragárselo y mostrar solo el número
    // convierte un problema de una línea en una tarde de depuración.
    let motivo = ''
    try {
      const j = await res.json()
      motivo = j?.detail || j?.error || j?.errors?.[0] || ''
    } catch { /* sin cuerpo útil */ }
    const e = new Error(`respondió ${res.status}${motivo ? `: ${motivo}` : ''}`)
    e.estado = res.status
    throw e
  }
  return res.json()
}

/** Arma el texto de crédito que se imprime al pie de la placa. */
export function credito({ autor, fuente, licencia, atribucion }) {
  if (atribucion === 'no' && !autor) return ''
  const quien = autor || 'autor desconocido'
  if (licencia === 'cc0' || licencia === 'pdm') return `Foto: ${quien} · dominio público`
  return `Foto: ${quien} / ${fuente}`
}
