// Editor de placas.
//
// La vista previa es un iframe con el HTML que devuelve el motor, achicado por
// CSS. No es una reconstrucción: es la misma hoja de estilos y las mismas
// fuentes que el PNG final. Una previsualización dibujada aparte se
// desincroniza del render en la primera semana y el usuario descubre la
// diferencia recién cuando ya publicó.
//
// Escribir no consume nada del plan. Solo se descuenta al bajar el PNG.

import { api } from './api.js'
import { el, $$, vaciar, aviso, elegirEnGrupo, demorar } from './ui.js'
import { selectorDeImagen } from './imagenes.js'

/* ── plantillas ──────────────────────────────────────────── */

const PLANTILLAS = {
  portada: { label: 'Portada', para: 'La primera del carrusel. Su único trabajo es que la persona deslice.', campos: ['kicker', 'titulo', 'cuerpo'] },
  texto: { label: 'Texto', para: 'Volanta, título y párrafo. La que más se usa.', campos: ['kicker', 'titulo', 'cuerpo', 'fuente'] },
  pasos: { label: 'Pasos', para: 'Un proceso en 3 o 4 pasos.', campos: ['kicker', 'titulo', 'pasos'] },
  oferta: { label: 'Oferta', para: 'Un producto o servicio, con sus datos duros.', campos: ['emoji', 'kicker', 'titulo', 'cuerpo', 'chips'] },
  cierre: { label: 'Cierre', para: 'La última del carrusel: la que pide la acción.', campos: ['kicker', 'titulo', 'cuerpo'] },
  frase: { label: 'Frase', para: 'Una sola frase con peso, en serif sobre color pleno.', campos: ['kicker', 'titulo'] },
  foto: { label: 'Sobre una foto', para: 'Dos líneas cortas encima de una imagen.', campos: ['kicker', 'titulo', 'linea2', 'imagen', 'fuente'] },
}

const CAMPOS = {
  kicker: { label: 'Volanta', ayuda: 'Una etiqueta de 1 a 3 palabras, va en mayúsculas chicas.', ej: 'Masa madre', max: 26 },
  titulo: { label: 'Título', ayuda: 'Lo único que se lee seguro. Hasta 55 caracteres.', ej: 'Por qué tardamos tres días en hacer un pan', max: 55, largo: true, resalta: true },
  cuerpo: { label: 'Cuerpo', ayuda: 'Entre 90 y 200 caracteres. Más largo no se lee y desborda.', ej: 'La masa madre no se apura. Te contamos qué pasa en cada uno de esos días.', max: 200, largo: true, negrita: true },
  linea2: { label: 'Segunda línea', ayuda: 'Va en el color de tu marca, debajo de la primera.', ej: 'todos los días a las 7', max: 40, largo: true },
  fuente: { label: 'Fuente del dato', ayuda: 'Si afirmás un dato duro, de dónde sale. En una placa con foto, acá va el crédito.', ej: '', max: 90 },
  emoji: { label: 'Emoji', ayuda: 'Uno solo, va grande arriba del título.', ej: '🥖', max: 4 },
  chips: { label: 'Datos', ayuda: 'De 2 a 3, cortitos. Uno por línea.', ej: 'Desde $4.500\nRetiro en el local' },
  pasos: { label: 'Los pasos', ayuda: 'Tres o cuatro. Con más, la placa se aprieta y deja de leerse.' },
  imagen: { label: 'La foto' },
}

const vacia = plantilla => ({
  plantilla,
  kicker: '', titulo: '', cuerpo: '', linea2: '', fuente: '', emoji: '',
  chips: [], pasos: [], foto: null, credito: '',
})

/* ── pantalla ────────────────────────────────────────────── */

export function iniciarEditor({ contenedor, cuenta, catalogo, alVolver, alCambiarCuota }) {
  const st = { canal: null, tipo: null, placas: [], activa: 0 }

  const pintar = () => {
    vaciar(contenedor)
    if (!st.canal || (st.canal === 'feed' && !st.tipo)) elegirFormato()
    else editar()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  /* ── 1. qué vas a publicar ─────────────────────────────── */

  function elegirFormato() {
    const cont = el('div', { style: 'padding:40px 0 80px;max-width:760px' })

    const opcion = (titulo, detalle, medidas, onClick) =>
      el('button.opcion', { onclick: onClick, style: 'display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center' },
        el('span', {}, el('b', {}, titulo), el('span', {}, detalle)),
        el('span.rotulo', {}, medidas))

    if (!st.canal) {
      cont.append(
        el('span.rotulo', {}, 'Nueva publicación'),
        el('h2', { style: 'margin:6px 0 8px' }, '¿Dónde va?'),
        el('p.intro', {}, 'La diferencia es el tamaño del lienzo, y cambia cómo se arma la placa: una historia se ve a pantalla completa y con la mano tapando la parte de abajo.'),
        el('div.opciones', {},
          opcion('Feed', 'El posteo que queda en tu perfil.', '1080×1350',
            () => { st.canal = 'feed'; pintar() }),
          opcion('Historia', 'Se ve 24 horas, a pantalla completa. También sirve de portada de reel.', '1080×1920',
            () => { st.canal = 'historia'; st.placas = [vacia('texto')]; pintar() })
        ),
        el('div.aviso', { style: 'margin-top:24px' },
          'Instagram te deja recortar el formato justo antes de publicar. Si bajás una placa de feed y la querés como historia, te la va a recortar por los costados y podés perder texto: conviene armarla en el formato en el que la vas a subir.')
      )
      contenedor.append(cont)
      return
    }

    cont.append(
      el('span.rotulo', {}, 'Publicación de feed'),
      el('h2', { style: 'margin:6px 0 8px' }, '¿Una placa o varias?'),
      el('p.intro', {}, 'Un carrusel se desliza: sirve cuando tenés algo que contar en partes. Un posteo suelto es una idea sola.'),
      el('div.opciones', {},
        opcion('Post', 'Una sola placa.', '1 imagen',
          () => { st.tipo = 'post'; st.placas = [vacia('texto')]; pintar() }),
        opcion('Carrusel', 'Empieza con una portada y termina pidiendo la acción.', 'hasta 6',
          () => { st.tipo = 'carrusel'; st.placas = [vacia('portada'), vacia('texto'), vacia('cierre')]; pintar() })
      ),
      el('div.acciones-paso', {}, el('button.btn.texto', { onclick: () => { st.canal = null; pintar() } }, '← Volver'))
    )
    contenedor.append(cont)
  }

  /* ── 2. el editor ──────────────────────────────────────── */

  function editar() {
    const esCarrusel = st.tipo === 'carrusel'
    const esHistoria = st.canal === 'historia'
    const placa = () => st.placas[st.activa]

    const form = el('div.editor-form')
    const vista = el('div.editor-vista')
    contenedor.append(el('div.editor', {}, form, vista))

    /* — vista previa — */
    const lienzo = el('div.lienzo', { style: esHistoria ? 'width:360px;height:640px' : 'width:400px;height:500px' })
    const marco = el('iframe', {
      width: esHistoria ? 1080 : 1080,
      height: esHistoria ? 1920 : 1350,
      scrolling: 'no',
      style: `transform:scale(${esHistoria ? 360 / 1080 : 400 / 1080})`,
    })
    lienzo.append(marco)

    const errorVista = el('div', { style: 'margin-top:12px' })
    const medidor = el('div.medidor', { style: 'margin-top:10px' })

    async function refrescar() {
      lienzo.classList.add('cargando')
      vaciar(errorVista)
      try {
        const p = placa()
        const html = await api.previsualizar(cuenta.id, {
          canal: st.canal,
          placa: {
            ...p,
            fuente: p.credito && !p.fuente ? p.credito : p.fuente,
            idx: esCarrusel ? `${String(st.activa + 1).padStart(2, '0')}/${String(st.placas.length).padStart(2, '0')}` : '',
            foto: p.foto?.ruta || null,
          },
        })
        marco.srcdoc = html
      } catch (e) {
        errorVista.append(aviso(e.message, 'malo'))
      } finally {
        lienzo.classList.remove('cargando')
      }
    }
    const refrescarDemorado = demorar(refrescar, 400)

    /* — descarga — */
    const errorBajar = el('div', { style: 'margin-top:12px' })
    const salida = el('div', { style: 'margin-top:12px' })
    const bajar = el('button.btn', {
      onclick: async () => {
        vaciar(errorBajar); vaciar(salida)
        bajar.disabled = true
        bajar.textContent = 'Renderizando…'
        try {
          const r = await api.renderizar(cuenta.id, {
            canal: st.canal,
            nombre: `${st.canal}-${Date.now().toString(36)}`,
            placas: st.placas.map(p => ({
              ...p,
              fuente: p.credito && !p.fuente ? p.credito : p.fuente,
              foto: p.foto?.ruta || null,
            })),
          })
          alCambiarCuota?.(r.estado)
          const ref = r.estado?.valor?.referencia
          const n = r.archivos.length
          salida.append(
            el('div.aviso.bien', {}, `Listo: ${n} placa${n > 1 ? 's' : ''} en 2160 píxeles de ancho.`),
            // El incremento, en el momento en que se produjo. Es cuando más
            // significa: recién vio el trabajo salir.
            ref ? el('p.medidor', { style: 'margin-top:8px' },
              `+${n} ${n > 1 ? 'placas' : 'placa'} · `,
              el('b', {}, ref.simbolo + Math.round(n * ref.precioPorPlaca).toLocaleString('es-AR')),
              ` ${ref.modo === 'ahorro' ? 'ahorrados' : 'a precio de diseñador'}`) : null,
            el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px' },
              r.archivos.map(a =>
                el('a.btn.fantasma.chico', { href: a.url, download: `${a.name}.png`, target: '_blank' }, `Bajar ${a.name}.png`)))
          )
        } catch (e) {
          errorBajar.append(aviso(
            e.codigo === 'cuota_excedida' ? e.message : `No se pudo generar: ${e.message}`, 'malo'))
        } finally {
          bajar.disabled = false
          bajar.textContent = 'Bajar el PNG'
        }
      },
    }, 'Bajar el PNG')

    vista.append(
      el('span.rotulo', { style: 'display:block;margin-bottom:10px' }, 'Vista previa'),
      lienzo, errorVista,
      el('p.apunte.chico', { style: 'margin-top:12px' },
        'Es el render de verdad, achicado. Escribir no descuenta nada del plan: solo se descuenta al bajar.'),
      el('div', { style: 'margin-top:16px' }, bajar),
      errorBajar, salida, medidor
    )

    /* — barra de placas del carrusel — */
    if (esCarrusel) {
      const tira = el('div.tira-placas')
      const repintarTira = () => {
        vaciar(tira)
        st.placas.forEach((p, i) => {
          const b = el(`button.mini${esHistoria ? '.historia' : ''}`, {
            title: PLANTILLAS[p.plantilla].label,
            onclick: () => { st.activa = i; editarDeNuevo() },
          }, String(i + 1).padStart(2, '0'))
          if (i === st.activa) b.classList.add('activa')
          tira.append(b)
        })
        if (st.placas.length < 6) {
          tira.append(el('button.btn.fantasma.chico', {
            onclick: () => {
              // La de cierre se queda última: es la que pide la acción.
              const iCierre = st.placas.findIndex(p => p.plantilla === 'cierre')
              const nueva = vacia('texto')
              if (iCierre >= 0) st.placas.splice(iCierre, 0, nueva)
              else st.placas.push(nueva)
              st.activa = iCierre >= 0 ? iCierre : st.placas.length - 1
              editarDeNuevo()
            },
          }, '+ Placa'))
        }
        if (st.placas.length > 1) {
          tira.append(el('button.btn.texto.chico', {
            onclick: () => {
              st.placas.splice(st.activa, 1)
              st.activa = Math.max(0, st.activa - 1)
              editarDeNuevo()
            },
          }, 'Quitar esta'))
        }
      }
      repintarTira()
      form.append(tira)
    }

    /* — cabecera — */
    form.append(
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--color-rule);' },
        el('div', {},
          el('span.rotulo', {}, esHistoria ? 'Historia (1080×1920)' : esCarrusel ? `Carrusel · placa ${st.activa + 1} de ${st.placas.length}` : 'Post de feed (1080×1350)'),
          el('h2', { style: 'margin:2px 0 0;' }, 'Escribí tu placa')
        ),
        el('div', { style: 'display:flex;gap:8px;align-items:center;' },
          el('button.btn.btn--outline.btn--mint.chico', { onclick: () => { st.canal = null; st.tipo = null; st.placas = []; st.activa = 0; pintar() } }, '📐 Cambiar formato'),
          alVolver ? el('button.btn.fantasma.chico', { onclick: alVolver }, '← Volver al Dashboard') : null
        )
      )
    )

    /* — selector de plantilla visual con chips — */
    const p = placa()
    const disponibles = Object.entries(PLANTILLAS).filter(([id]) => {
      if (!esCarrusel) return id !== 'portada' && id !== 'cierre'
      if (st.activa === 0) return true
      return true
    })

    const ICONOS_PLANTILLA = {
      portada: '🎯',
      texto: '📝',
      pasos: '🔢',
      oferta: '🏷️',
      cierre: '🚀',
      frase: '💬',
      foto: '📸',
    }

    const grillaPlantillas = el('div.pestanas', { style: 'margin-top:6px;gap:8px;' })
    disponibles.forEach(([id, def]) => {
      const btn = el('button.pestana' + (id === p.plantilla ? '.activa' : ''), {
        onclick: () => {
          const conservar = { kicker: p.kicker, titulo: p.titulo, cuerpo: p.cuerpo, foto: p.foto, credito: p.credito, disposicion: p.disposicion }
          st.placas[st.activa] = { ...vacia(id), ...conservar }
          editarDeNuevo()
        }
      }, `${ICONOS_PLANTILLA[id] || '📄'} ${def.label}`)
      grillaPlantillas.append(btn)
    })

    form.append(el('div.campo', {},
      el('label', {}, 'Tipo de plantilla'),
      el('span.ayuda', {}, PLANTILLAS[p.plantilla].para),
      grillaPlantillas
    ))

    // Disposición con selector estilizado
    if (catalogo?.disposiciones?.length) {
      const selDisp = el('select', {
        onchange: () => { p.disposicion = selDisp.value || null; refrescarDemorado() },
      },
        el('option', { value: '', selected: !p.disposicion }, 'La de tu marca (por defecto)'),
        catalogo.disposiciones.map(d =>
          el('option', { value: d.id, selected: p.disposicion === d.id }, `${d.label} — ${d.descripcion}`))
      )
      form.append(el('div.campo', {},
        el('label', {}, 'Disposición del texto'),
        el('span.ayuda', {}, 'Cómo se distribuyen los bloques en esta placa puntual.'),
        selDisp
      ))
    }

    /* — campos — */
    if (p.plantilla === 'foto' && !p.foto) {
      // Clase propia: se borra este aviso y no "el primer aviso del formulario".
      // Sin eso se comía la advertencia de licencia que aparece al elegir foto.
      const a = aviso('Esta plantilla va sobre una imagen. Mientras no elijas una, la vista previa muestra un fondo liso.')
      a.classList.add('aviso-sin-foto')
      form.append(a)
    }
    for (const campo of PLANTILLAS[p.plantilla].campos) form.append(armarCampo(campo, p, refrescarDemorado, medidor))

    // En historias, todas las plantillas pueden llevar foto de fondo (opcional).
    // La plantilla 'foto' ya la incluye arriba; el resto la recibe como extra.
    if (esHistoria && p.plantilla !== 'foto') {
      const selFoto = selectorDeImagen({
        cuentaId: cuenta.id,
        orientacion: 'vertical',
        inicial: p.foto,
        onElegir: img => {
          p.foto = img
          p.credito = img.credito || ''
          refrescarDemorado()
        },
      })
      form.append(el('div.campo', {},
        el('label', {}, '📸 Foto de fondo'),
        el('span.ayuda', {}, 'Opcional. Sin foto la historia usa el color de tu marca como fondo.'),
        !p.foto ? el('div.aviso', { style: 'margin-bottom:10px' }, 'Sin foto, la placa usa el color de tu marca de fondo. Podés dejarlo así.') : null,
        selFoto.nodo
      ))
    }

    refrescar()

    function editarDeNuevo() { vaciar(contenedor); editar() }
  }

  /* ── campos ────────────────────────────────────────────── */

  function armarCampo(campo, p, alEscribir, medidor) {
    const def = CAMPOS[campo]

    if (campo === 'imagen') {
      const sel = selectorDeImagen({
        cuentaId: cuenta.id,
        orientacion: st.canal === 'historia' ? 'vertical' : '',
        inicial: p.foto,
        onElegir: img => {
          p.foto = img
          p.credito = img.credito || ''
          // Ya hay imagen: el aviso de "todavía no elegiste una" sobra. Se saca
          // por su clase, no por ser el primero: otros avisos —el de licencia,
          // sin ir más lejos— aparecen en el mismo momento.
          document.querySelector('.aviso-sin-foto')?.remove()
          alEscribir()
        },
      })
      return el('div.campo', {}, el('label', {}, def.label), sel.nodo)
    }

    if (campo === 'chips') {
      const ta = el('textarea', { rows: 3, placeholder: def.ej, value: (p.chips || []).join('\n') })
      ta.addEventListener('input', () => {
        p.chips = ta.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3)
        alEscribir()
      })
      return el('div.campo', {}, el('label', {}, def.label), el('span.ayuda', {}, def.ayuda), ta)
    }

    if (campo === 'pasos') {
      if (!p.pasos.length) {
        p.pasos = [1, 2, 3].map(n => ({ numero: String(n), etiqueta: '', titulo: '', detalle: '' }))
      }
      const cont = el('div')
      const repintar = () => {
        vaciar(cont)
        p.pasos.forEach((paso, i) => {
          const fila = el('div', { style: 'border-top:1px solid var(--linea);padding:14px 0' })
          fila.append(el('div.rotulo', { style: 'margin-bottom:8px' }, `Paso ${i + 1}`))
          for (const [clave, etiqueta, ej] of [
            ['etiqueta', 'Etiqueta corta', 'Día uno'],
            ['titulo', 'Qué se hace', 'Se alimenta la madre'],
            ['detalle', 'Una línea más', 'Harina y agua. Nada más.'],
          ]) {
            const inp = el('input', { type: 'text', placeholder: ej, value: paso[clave], style: 'margin-bottom:6px' })
            inp.addEventListener('input', () => { paso[clave] = inp.value; alEscribir() })
            fila.append(el('label.chico', { style: 'display:block;color:var(--tinta-3);margin-bottom:2px' }, etiqueta), inp)
          }
          cont.append(fila)
        })
        const acciones = el('div', { style: 'display:flex;gap:8px;margin-top:10px' })
        if (p.pasos.length < 4) {
          acciones.append(el('button.btn.fantasma.chico', {
            onclick: () => { p.pasos.push({ numero: String(p.pasos.length + 1), etiqueta: '', titulo: '', detalle: '' }); repintar(); alEscribir() },
          }, '+ Paso'))
        }
        if (p.pasos.length > 2) {
          acciones.append(el('button.btn.texto.chico', {
            onclick: () => { p.pasos.pop(); repintar(); alEscribir() },
          }, 'Quitar el último'))
        }
        cont.append(acciones)
      }
      repintar()
      return el('div.campo', {}, el('label', {}, def.label), el('span.ayuda', {}, def.ayuda), cont)
    }

    /* — campos de texto — */
    const entrada = def.largo
      ? el('textarea', { rows: campo === 'cuerpo' ? 3 : 2, placeholder: def.ej })
      : el('input', { type: 'text', placeholder: def.ej })
    entrada.value = p[campo] || ''

    const cuenta_ = el('span.medidor')
    const actualizarCuenta = () => {
      if (!def.max) return
      const largo = entrada.value.replace(/<[^>]+>/g, '').length
      cuenta_.innerHTML = `<b>${largo}</b> / ${def.max}`
      cuenta_.style.color = largo > def.max ? 'var(--acento)' : ''
    }

    entrada.addEventListener('input', () => { p[campo] = entrada.value; actualizarCuenta(); alEscribir() })
    actualizarCuenta()

    // Resaltar: envuelve lo que el usuario seleccionó con la etiqueta que
    // corresponde a esta plantilla. Es la forma de enseñar la función sin
    // pedirle a un panadero que escriba HTML a mano.
    const herramientas = el('div', { style: 'display:flex;gap:10px;align-items:center;margin-top:6px' })
    if (def.resalta) {
      const etiqueta = p.plantilla === 'frase' ? ['<em>', '</em>'] : ['<span class="acc">', '</span>']
      herramientas.append(el('button.btn.texto.chico', {
        onclick: () => {
          const { selectionStart: a, selectionEnd: b, value: v } = entrada
          if (a === b) return
          entrada.value = v.slice(0, a) + etiqueta[0] + v.slice(a, b) + etiqueta[1] + v.slice(b)
          p[campo] = entrada.value
          actualizarCuenta(); alEscribir()
        },
      }, 'Resaltar lo seleccionado'))
    }
    if (def.negrita) {
      herramientas.append(el('button.btn.texto.chico', {
        onclick: () => {
          const { selectionStart: a, selectionEnd: b, value: v } = entrada
          if (a === b) return
          entrada.value = v.slice(0, a) + '<b>' + v.slice(a, b) + '</b>' + v.slice(b)
          p[campo] = entrada.value
          actualizarCuenta(); alEscribir()
        },
      }, 'Negrita'))
    }
    if (def.max) herramientas.append(el('span', { style: 'margin-left:auto' }, cuenta_))

    return el('div.campo', {},
      el('label', {}, def.label),
      def.ayuda && el('span.ayuda', {}, def.ayuda),
      entrada,
      herramientas.children.length ? herramientas : null
    )
  }

  pintar()
}
