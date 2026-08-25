// Elegir la foto de una placa: la del negocio, o una del banco abierto.
//
// No hay opción de generar una imagen, y es a propósito. Una foto inventada de
// una panadería que no es esta panadería no es un atajo: es una mentira chiquita
// que el vecino que pasa por la puerta todos los días detecta enseguida.
//
// El banco es Openverse, filtrado a licencias que permiten uso comercial y
// modificación. Lo segundo importa tanto como lo primero: ponerle un título
// encima a una foto la convierte en obra derivada, así que una licencia "sin
// derivadas" no sirve por más gratis que sea. El crédito se arma solo y se
// puede pegar en el pie de la placa o en el texto del posteo.

import { api } from './api.js'
import { el, vaciar, aviso, elegirEnGrupo } from './ui.js'

export function selectorDeImagen({ cuentaId, orientacion = '', inicial = null, onElegir }) {
  let elegida = inicial

  const raiz = el('div')
  const pestanas = el('div.pestanas')
  const cuerpo = el('div')
  const resumen = el('div', { style: 'margin-top:14px' })

  function mostrarElegida() {
    vaciar(resumen)
    if (!elegida) return
    resumen.append(
      el('div', { style: 'display:flex;gap:12px;align-items:flex-start' },
        el('img', { src: elegida.url, style: 'width:76px;height:76px;object-fit:cover;border:1px solid var(--linea-fuerte);border-radius:2px' }),
        el('div', {},
          el('div.chico', { style: 'font-weight:600;margin-bottom:2px' }, 'Imagen elegida'),
          elegida.credito
            ? el('div.credito', {}, elegida.credito, el('br'), 'Se agrega al pie de la placa. Dejalo: es la condición de la licencia.')
            : el('div.credito', {}, 'Foto propia, sin crédito necesario.'),
          // ShareAlike es una obligación que le queda al negocio, no a nosotros:
          // callarla sería dejarle un problema legal escondido en una placa.
          elegida.shareAlike
            ? el('div.aviso', { style: 'margin-top:8px' },
                'Esta foto es CC BY-SA. Obliga a compartir la placa resultante bajo la misma licencia, ' +
                'que para un posteo comercial es incómodo. Si podés, elegí otra.')
            : null
        )
      )
    )
  }

  function elegir(datos) {
    elegida = datos
    mostrarElegida()
    onElegir?.(datos)
  }

  /* — subir la propia — */
  function vistaPropia() {
    const estado = el('div', { style: 'margin-top:10px' })
    const entrada = el('input', {
      type: 'file', accept: 'image/jpeg,image/png,image/webp',
      onchange: async ev => {
        const archivo = ev.target.files?.[0]
        if (!archivo) return
        vaciar(estado).append(el('span.cargando-txt', {}, 'Subiendo'))
        try {
          const datos = await new Promise((ok, mal) => {
            const fr = new FileReader()
            fr.onload = () => ok(fr.result)
            fr.onerror = () => mal(new Error('no se pudo leer el archivo'))
            fr.readAsDataURL(archivo)
          })
          const r = await api.subirImagen(cuentaId, { datos, nombre: archivo.name })
          vaciar(estado)
          elegir({ url: r.url, ruta: r.ruta, credito: '' })
        } catch (e) {
          vaciar(estado).append(aviso(e.message, 'malo'))
        }
      },
    })
    return el('div', {},
      el('p.apunte.chico', { style: 'margin-bottom:12px' },
        'JPG, PNG o WEBP, hasta 15 MB. Cuanto más grande, mejor: la placa final sale a 2160 píxeles de ancho.'),
      entrada, estado
    )
  }

  /* — buscar en el banco — */
  function vistaBanco() {
    const cont = el('div')
    const entrada = el('input', { type: 'text', placeholder: 'pan artesanal, mostrador, herramientas…', style: 'max-width:330px' })
    const boton = el('button.btn.chico', { style: 'margin-left:8px' }, 'Buscar')
    const estado = el('div', { style: 'margin-top:12px' })
    const galeria = el('div.galeria')

    async function buscar() {
      const q = entrada.value.trim()
      if (q.length < 2) return
      vaciar(estado).append(el('span.cargando-txt', {}, 'Buscando'))
      vaciar(galeria)
      try {
        const r = await api.buscarImagenes(q, 1, orientacion)
        vaciar(estado)
        if (!r.resultados.length) {
          estado.append(el('p.apunte.chico', {}, 'No encontramos nada con esas palabras. Probá en inglés: el banco tiene mucho más material.'))
          return
        }
        estado.append(el('span.apunte.chico', {},
          `${r.total} fotos con licencia para uso comercial · ${r.bancos.join(', ')}`))
        for (const img of r.resultados) {
          const b = el('button', {
            title: `${img.titulo || 'sin título'}\n${img.autor} · ${img.fuente}${img.shareAlike ? ' · CC BY-SA' : ''}`,
            onclick: async () => {
              elegirEnGrupo(galeria, b)
              b.style.opacity = '.5'
              try {
                const g = await api.traerDelBanco(cuentaId, img.id)
                elegir({ url: g.url, ruta: g.ruta, credito: g.credito, shareAlike: g.shareAlike })
              } catch (e) {
                vaciar(estado).append(aviso(e.message, 'malo'))
              } finally { b.style.opacity = '' }
            },
          }, el('img', { src: img.miniatura, loading: 'lazy', alt: img.titulo }))
          galeria.append(b)
        }
      } catch (e) {
        vaciar(estado).append(aviso(e.message, 'malo'))
      }
    }

    boton.addEventListener('click', buscar)
    entrada.addEventListener('keydown', e => { if (e.key === 'Enter') buscar() })

    cont.append(
      // Sin nombrar los bancos: cuáles están conectados depende de la
      // configuración, y la lista real sale abajo con los resultados.
      el('p.apunte.chico', { style: 'margin-bottom:12px' },
        'Buscamos en varios bancos a la vez, solo entre fotos con licencia para uso comercial y con permiso de modificación. El crédito lo armamos nosotros.'),
      el('div', { style: 'display:flex;align-items:center' }, entrada, boton),
      estado, galeria
    )
    return cont
  }

  const vistas = [['Subir mi foto', vistaPropia], ['Buscar en el banco', vistaBanco]]
  vistas.forEach(([nombre, fn], i) => {
    const b = el('button.pestana', {
      onclick: () => { elegirEnGrupo(pestanas, b, 'activa'); vaciar(cuerpo).append(fn()) },
    }, nombre)
    if (i === 0) b.classList.add('activa')
    pestanas.append(b)
  })
  cuerpo.append(vistas[0][1]())
  mostrarElegida()

  raiz.append(pestanas, cuerpo, resumen)
  return { nodo: raiz, valor: () => elegida }
}
