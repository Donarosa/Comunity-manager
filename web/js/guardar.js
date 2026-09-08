// Guardar las placas ya hechas.
//
// Lo usan el editor y la pantalla de "Sugerime": las dos terminan con placas
// renderizadas y la misma pregunta, así que el bloque es uno solo. Estaba
// escrito en el editor y en el plan no estaba: las placas del carrusel sugerido
// se veían y no había forma de bajarlas.

import { el } from './ui.js'

/**
 * Qué se le ofrece a la persona una vez que las placas ya existen.
 *
 * En el teléfono "descargar" no es lo que quiere: quiere la placa en su galería
 * o directo en Instagram, y una página web no puede escribir en el carrete por
 * su cuenta. La hoja de compartir del sistema sí — "Guardar en Fotos" y la
 * lista de apps salen ahí — así que en pantallas táctiles ese es el camino, y
 * la descarga clásica queda de respaldo.
 *
 * Los archivos se traen apenas termina el render y no al apretar el botón: iOS
 * cancela el permiso de compartir si entre el toque y la llamada hay una espera
 * de red. Cuando la persona toca, los datos ya están en memoria.
 */

export function bloqueDeGuardado(archivos, marca = '', fecha) {
  const n = archivos.length
  const nombre = (i) => nombreDeArchivo(marca, i, n, fecha)
  const caja = el('div', { style: 'display:flex;flex-direction:column;gap:10px;margin-top:14px' })

  const listos = Promise.all(archivos.map(async (a, i) => {
    const res = await fetch(a.url)
    if (!res.ok) throw new Error(`no se pudo leer ${a.name}`)
    const blob = await res.blob()
    return new File([blob], nombre(i), { type: blob.type || 'image/png' })
  })).catch(() => null)

  // Un clic por archivo, espaciados: varios `download` simultáneos los bloquea
  // el navegador y solo baja el primero.
  const descargarTodo = () => archivos.forEach((a, i) => setTimeout(() => {
    const link = el('a', { href: a.url, download: nombre(i) })
    document.body.append(link)
    link.click()
    link.remove()
  }, i * 250))

  const esTactil = window.matchMedia?.('(pointer: coarse)').matches
  const puedeCompartir = esTactil && typeof navigator.canShare === 'function' && typeof navigator.share === 'function'

  const principal = el('button.btn', {
    onclick: async () => {
      if (puedeCompartir) {
        const files = await listos
        if (files && navigator.canShare({ files })) {
          try {
            await navigator.share({ files, title: n > 1 ? 'Mis placas' : 'Mi placa' })
            return
          } catch (e) {
            // Cerrar la hoja de compartir no es un error: no hay que insistir
            // bajando el archivo por atrás.
            if (e?.name === 'AbortError') return
          }
        }
      }
      descargarTodo()
    },
  }, puedeCompartir
    ? (n > 1 ? 'Guardar las placas en el teléfono' : 'Guardar la placa en el teléfono')
    : (n > 1 ? `Descargar las ${n} placas` : 'Descargar la placa'))

  caja.append(principal)

  if (puedeCompartir) {
    // Ningún sitio web puede escribir en la galería: iOS y Android no exponen
    // ninguna forma de hacerlo, y la hoja de compartir es lo más cerca que se
    // llega. Nombrar el botón exacto ahorra el momento de mirar una pantalla
    // llena de iconos sin saber cuál es el que guarda.
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    caja.append(el('p.apunte.chico', { style: 'margin:0' },
      esIOS
        ? `Se abre el menú del teléfono. Tocá “Guardar ${n > 1 ? 'imágenes' : 'imagen'}” y ${n > 1 ? 'quedan' : 'queda'} en tu galería, o elegí Instagram para publicar de una.`
        : `Se abre el menú del teléfono. Elegí “Guardar en Fotos” y ${n > 1 ? 'quedan' : 'queda'} en tu galería, o mandalas directo a Instagram.`))
  }

  // Con un carrusel conviene poder bajar una sola, para rehacer nada más que esa.
  if (n > 1) {
    caja.append(el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
      archivos.map((a, i) => el('a.btn.fantasma.chico', {
        href: a.url, download: nombre(i),
      }, `Placa ${i + 1}`))))
  }

  return caja
}

/**
 * Cómo se llama el archivo que ve la persona.
 *
 * El nombre interno —`feed-mtk6bc67`— aparece en letra grande en la hoja de
 * compartir de iOS y en la carpeta de descargas, y no dice nada: ni de qué
 * negocio es, ni de cuándo. Con varias placas guardadas es imposible
 * distinguirlas. Va el nombre de la marca y la fecha, que es como uno las
 * busca después.
 */
export function nombreDeArchivo(marca, i, total, cuando) {
  // La fecha es la de la placa, no la de hoy: bajando algo de agosto desde el
  // panel, el archivo salía fechado el día en que se lo bajó.
  const dia = cuando ? new Date(cuando) : new Date()
  const fecha = `${String(dia.getDate()).padStart(2, '0')}-${String(dia.getMonth() + 1).padStart(2, '0')}`
  const base = [marca, fecha].filter(Boolean).join(' ')
  return total > 1 ? `${base} (${i + 1} de ${total}).png` : `${base}.png`
}
