// Editor de placas.
//
// La vista previa es un iframe con el HTML que devuelve el motor, achicado por
// CSS. No es una reconstrucción: es la misma hoja de estilos y las mismas
// fuentes que el PNG final. Una previsualización dibujada aparte se
// desincroniza del render en la primera semana y el usuario descubre la
// diferencia recién cuando ya publicó.
//
// Escribir no consume nada del plan. Solo se descuenta al generar las placas.

import { api } from './api.js'
import { el, $$, vaciar, aviso, elegirEnGrupo, demorar } from './ui.js'
import { selectorDeImagen } from './imagenes.js'
// Qué campos tiene cada plantilla lo dice el núcleo, que es el mismo que
// después arma el spec. Con la lista duplicada acá, las dos se despegaban y el
// formulario terminaba mandando campos que el render no dibuja —o al revés.
import { CAMPOS_DE_PLANTILLA, clavesDePlantilla, camposSecundarios,
         CAMPOS_PRINCIPALES, plantillaSegunPosicion } from '/nucleo/content/plantillas.mjs'

/* ── plantillas ──────────────────────────────────────────── */

// Acá va solo lo que es de pantalla: cómo se llama la plantilla y para qué
// sirve. Los campos salen de CAMPOS_DE_PLANTILLA.
//
// Portada y cierre no están: son la primera y la última placa de un carrusel,
// y eso lo decide la posición, no una pregunta al usuario. Siguen existiendo
// como plantilla porque el motor las dibuja distinto.
const ROTULOS = {
  texto: { label: 'Texto', para: 'Un título con su explicación. La que más se usa.' },
  pasos: { label: 'Pasos', para: 'Un proceso en 3 o 4 pasos.' },
  oferta: { label: 'Oferta', para: 'Un producto o servicio, con su precio.' },
  frase: { label: 'Frase', para: 'Una cita entre comillas, en bastardilla sobre color pleno.' },
  manifiesto: { label: 'Manifiesto', para: 'Una declaración grande, con las palabras que importan en color.' },
  foto: { label: 'Sobre una foto', para: 'Dos líneas cortas encima de una imagen.' },
}

// Las que el motor dibuja pero el usuario no elige: se asignan por posición.
const ROTULOS_INTERNOS = {
  portada: { label: 'Portada', para: 'La primera del carrusel. Su único trabajo es que la persona deslice.' },
  cierre: { label: 'Cierre', para: 'La última del carrusel: la que pide la acción.' },
}

const PLANTILLAS = Object.fromEntries(
  Object.entries({ ...ROTULOS, ...ROTULOS_INTERNOS })
    .map(([id, r]) => [id, { ...r, campos: CAMPOS_DE_PLANTILLA[id] }])
)

// Los rótulos hablan el idioma de quien atiende el mostrador, no el del taller
// de diseño. "Volanta" y "cuerpo" son palabras de oficio gráfico, y "fuente"
// además choca con el otro sentido que tiene en la aplicación: la tipografía.
const CAMPOS = {
  kicker: { label: 'Etiqueta', ayuda: 'Dos o tres palabras que van arriba del título, en chico.', ej: 'Masa madre', max: 26, agregar: 'Agregar una etiqueta arriba' },
  titulo: { label: 'Título', ayuda: 'Lo único que se lee seguro. Hasta 55 caracteres.', ej: 'Por qué tardamos tres días en hacer un pan', max: 55, largo: true, resalta: true },
  cuerpo: { label: 'El texto', ayuda: 'Entre 90 y 200 caracteres. Más largo no se lee y desborda.', ej: 'La masa madre no se apura. Te contamos qué pasa en cada uno de esos días.', max: 200, largo: true, negrita: true, agregar: 'Agregar un texto abajo' },
  linea2: { label: 'Segunda frase', ayuda: 'Va en el color de tu marca, debajo de la primera.', ej: 'todos los días a las 7', max: 40, largo: true, agregar: 'Agregar una segunda frase' },
  // Era el único campo del formulario sin ejemplo, y encima el más abstracto:
  // sin ver qué se espera, lo que se escribe ahí no es una fuente. El rótulo
  // usa la palabra "fuente" —dentro del editor no compite con la tipografía,
  // que se elige en el alta— y la ayuda muestra cómo queda estampado.
  fuente: { label: 'La fuente del dato', ayuda: 'Quién publicó el número que estás usando. Al pie de la placa sale como «Fuente — INDEC».', ej: 'INDEC, 2025', max: 90, agregar: 'Citar la fuente de un dato' },
  emoji: { label: 'Un emoji, si querés', ayuda: 'Uno solo, va grande arriba del título.', ej: '🥖', max: 4, agregar: 'Agregar un emoji' },
  chips: { label: 'Precios o condiciones', ayuda: 'De 2 a 3, cortitos. Uno por línea.', ej: 'Desde $4.500\nRetiro en el local' },
  pasos: { label: 'Los pasos', ayuda: 'Tres o cuatro. Con más, la placa se aprieta y deja de leerse.' },
  imagen: { label: 'La foto' },
}

const vacia = plantilla => ({
  plantilla,
  kicker: '', titulo: '', cuerpo: '', linea2: '', fuente: '', emoji: '',
  chips: [], pasos: [], foto: null, credito: '',
})

/** El papel que cumple una placa dentro de un carrusel, para el rótulo. */
const PAPEL = { portada: ' · la portada', cierre: ' · la que cierra' }

/** Lienzo de cada canal. Los números salen de core/render/formats.mjs. */
const FORMATOS = {
  feed: { w: 1080, h: 1350, rotulo: 'Post de feed (1080×1350)', maxAncho: 520 },
  historia: { w: 1080, h: 1920, rotulo: 'Historia (1080×1920)', maxAncho: 430 },
  cuadrado: { w: 1080, h: 1080, rotulo: 'Placa cuadrada (1080×1080)', maxAncho: 520 },
}

/* ── pantalla ────────────────────────────────────────────── */

export function iniciarEditor({ contenedor, cuenta, catalogo, alVolver, alCambiarCuota, alPaso }) {
  const st = { canal: null, tipo: null, placas: [], activa: 0 }

  /* En qué paso está y cómo se sale de él.
   *
   * Es lo mismo que hace el botón "Volver" de cada pantalla, expuesto para que
   * la flecha del navegador haga lo mismo: dentro del editor son tres pasos y
   * antes la flecha te sacaba del sitio desde cualquiera de ellos. */
  const pasoActual = () => {
    if (!st.canal) return ['formato', alVolver]
    if (st.canal === 'feed' && !st.tipo) return ['tipo', () => { st.canal = null; pintar() }]
    return ['editar', () => {
      // En feed se vuelve a elegir post o carrusel; en historia y cuadrada ese
      // paso no existe, así que se vuelve a la elección de formato.
      if (st.canal === 'feed') st.tipo = null
      else st.canal = null
      pintar()
    }]
  }

  /* Volver, una sola vez y por un solo camino.
   *
   * Si el botón ejecutara la acción directamente, la pantalla anterior
   * registraría su paso de nuevo y el historial crecería en vez de achicarse:
   * la flecha del navegador quedaría rebotando entre dos pantallas. Se delega
   * en history.back(), que dispara el mismo camino que la flecha. Sin alPaso
   * —el editor usado fuera de la aplicación— no hay historial que mover y se
   * llama a la acción directa. */
  const irAtras = () => {
    const [, volver] = pasoActual()
    if (alPaso) history.back()
    else volver?.()
  }

  const pintar = () => {
    vaciar(contenedor)
    if (!st.canal || (st.canal === 'feed' && !st.tipo)) elegirFormato()
    else editar()
    alPaso?.(...pasoActual())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  /* ── 1. qué vas a publicar ─────────────────────────────── */

  function elegirFormato() {
    const cont = el('div', { style: 'padding:40px 0 80px;max-width:760px' })

    // Todo en columna. Con el título y la descripción como dos spans en línea
    // salía "FeedEl posteo que queda en tu perfil.", y con la medida al costado
    // el texto quedaba en una columna de cuatro palabras de ancho.
    const opcion = (titulo, detalle, medidas, onClick) =>
      el('button.opcion', { onclick: onClick, style: 'display:flex;flex-direction:column;align-items:flex-start;gap:6px' },
        el('b', {}, titulo),
        el('span', { style: 'flex:1' }, detalle),
        el('span.rotulo', { style: 'margin-top:4px' }, medidas))

    if (!st.canal) {
      cont.append(
        el('span.rotulo', {}, 'Nueva publicación'),
        el('h2', { style: 'margin:6px 0 8px' }, '¿Dónde va?'),
        el('p.intro', {}, 'La diferencia es el tamaño del lienzo, y cambia cómo se arma la placa: una historia se ve a pantalla completa y con la mano tapando la parte de abajo.'),
        el('div.opciones', {},
          opcion('Feed', 'El posteo que queda en tu perfil.', '1080×1350',
            () => { st.canal = 'feed'; pintar() }),
          opcion('Historia', 'Se ve 24 horas, a pantalla completa. También sirve de portada de reel.', '1080×1920',
            () => { st.canal = 'historia'; st.placas = [vacia('texto')]; pintar() }),
          opcion('Cuadrada', 'La clásica. Entra bien en el perfil y sirve para reutilizar en otras redes.', '1080×1080',
            () => { st.canal = 'cuadrado'; st.placas = [vacia('texto')]; pintar() })
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
          // Las tres arrancan iguales: la primera se dibuja como portada y la
          // última como cierre por estar donde están, no por elección.
          () => { st.tipo = 'carrusel'; st.placas = [vacia('texto'), vacia('texto'), vacia('texto')]; pintar() })
      ),
      el('div.acciones-paso', {}, el('button.btn.texto', { onclick: irAtras }, '← Volver'))
    )
    contenedor.append(cont)
  }

  /* ── 2. el editor ──────────────────────────────────────── */

  function editar() {
    const esCarrusel = st.tipo === 'carrusel'
    const esHistoria = st.canal === 'historia'
    const placa = () => st.placas[st.activa]
    // La placa que se está editando. Se toma una sola vez porque cambiar de
    // placa vuelve a pintar el editor entero.
    const p = placa()

    const form = el('div.editor-form')
    const vista = el('div.editor-vista')
    contenedor.append(el('div.editor', {}, form, vista))

    /* — vista previa —
     *
     * El iframe se dibuja al tamaño real de la placa y se achica con un
     * transform. La escala no puede ser un número fijo: en un teléfono el
     * lienzo mide bastante menos que en el escritorio, y una escala calculada
     * para 400px deja la placa cortada. Se recalcula contra el ancho real. */
    const F = FORMATOS[st.canal] || FORMATOS.feed
    const lienzo = el('div.lienzo')
    const zona = el('div.lienzo-zona')
    const marco = el('iframe', {
      width: F.w,
      height: F.h,
      scrolling: 'no',
      title: 'Vista previa de la placa',
    })
    lienzo.append(marco)
    zona.append(lienzo)

    /* La escala se mide y se corrige, en dos pasos.
     *
     * Con el panel sticky el alto quedó acotado a la pantalla, y una escala
     * calculada solo contra el ancho dibujaba la placa más alta que su caja: la
     * vista previa salía con el título cortado abajo.
     *
     * No se puede resolver pidiéndole el alto disponible a un contenedor
     * flexible: ese alto depende del lienzo y el lienzo dependería de él, así
     * que la caja colapsa a cero. Se aplica la escala por ancho, se mira cuánto
     * se pasó el panel de su tope —scrollHeight contra clientHeight— y se
     * descuenta esa diferencia. Dos mediciones y ningún número mágico. */
    const aplicar = escala => {
      lienzo.style.width = `${Math.round(F.w * escala)}px`
      lienzo.style.height = `${Math.round(F.h * escala)}px`
      marco.style.transform = `scale(${escala})`
    }

    let ajustando = false
    const ajustarEscala = () => {
      if (ajustando) return
      ajustando = true
      try {
        const disponible = Math.min(zona.clientWidth, F.maxAncho)
        if (!disponible) return
        let escala = disponible / F.w
        aplicar(escala)
        const sobra = vista.scrollHeight - vista.clientHeight
        if (sobra > 1) {
          escala = Math.max(0.05, (F.h * escala - sobra) / F.h)
          aplicar(escala)
        }
      } finally {
        ajustando = false
      }
    }
    ajustarEscala()
    new ResizeObserver(ajustarEscala).observe(zona)

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
            plantilla: plantillaSegunPosicion(p.plantilla, st.activa, st.placas.length),
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

    /* — generar y guardar —
     *
     * Son dos pasos y el botón lo dice: el primero genera las placas —eso es lo
     * que consume cuota— y recién después aparecen las de guardar. Antes el
     * botón decía "Bajar el PNG" y lo que hacía era generar; el usuario creía
     * estar descargando algo y en realidad estaba gastando el plan. */
    const errorBajar = el('div', { style: 'margin-top:12px' })
    const salida = el('div', { style: 'margin-top:12px' })
    const rotuloGenerar = () => st.placas.length > 1
      ? `Generar las ${st.placas.length} placas`
      : 'Generar la placa'

    const generar = el('button.btn', {
      onclick: async () => {
        vaciar(errorBajar); vaciar(salida)
        generar.disabled = true
        generar.textContent = st.placas.length > 1 ? 'Generando las placas…' : 'Generando la placa…'
        try {
          const r = await api.renderizar(cuenta.id, {
            canal: st.canal,
            nombre: `${st.canal}-${Date.now().toString(36)}`,
            placas: st.placas.map((p, i) => ({
              ...p,
              // La primera y la última de un carrusel se dibujan como portada y
              // cierre. Es lo mismo que muestra la vista previa.
              plantilla: plantillaSegunPosicion(p.plantilla, i, st.placas.length),
              fuente: p.credito && !p.fuente ? p.credito : p.fuente,
              foto: p.foto?.ruta || null,
            })),
          })
          alCambiarCuota?.(r.estado)
          const ref = r.estado?.valor?.referencia
          const n = r.archivos.length
          salida.append(
            el('div.aviso.bien', {}, n > 1
              ? `Listas: ${n} placas en alta resolución, 2160 píxeles de ancho.`
              : 'Lista: tu placa en alta resolución, 2160 píxeles de ancho.'),
            // El incremento, en el momento en que se produjo. Es cuando más
            // significa: recién vio el trabajo salir.
            ref ? el('p.medidor', { style: 'margin-top:8px' },
              `+${n} ${n > 1 ? 'placas' : 'placa'} · `,
              el('b', {}, ref.simbolo + Math.round(n * ref.precioPorPlaca).toLocaleString('es-AR')),
              ` ${ref.modo === 'ahorro' ? 'ahorrados' : 'a precio de diseñador'}`) : null,
            bloqueDeGuardado(r.archivos, cuenta?.marca?.nombre || cuenta?.nombre || '')
          )
        } catch (e) {
          errorBajar.append(aviso(
            e.codigo === 'cuota_excedida' ? e.message : `No se pudieron generar: ${e.message}`, 'malo'))
        } finally {
          generar.disabled = false
          generar.textContent = rotuloGenerar()
        }
      },
    }, rotuloGenerar())

    vista.append(
      el('span.rotulo', { style: 'display:block;margin-bottom:10px' }, 'Vista previa'),
      zona, errorVista,
      el('div', { style: 'margin-top:16px' }, generar),
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
    // El botón de volver sale del mismo lugar que usa la flecha del navegador,
    // así los dos hacen exactamente lo mismo: en feed vuelve a elegir post o
    // carrusel, y en historia y cuadrada a elegir el formato. Esta pantalla era
    // la única del editor sin una salida a la vista.
    form.append(
      el('div', { style: 'margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--color-rule);' },
        el('button.btn.texto.chico', {
          type: 'button',
          style: 'margin-bottom:10px;padding-left:0',
          onclick: irAtras,
        }, '← Volver'),
        // En un carrusel se dice qué papel cumple la placa: la primera y la
        // última se dibujan distinto y conviene que se sepa antes de escribir.
        el('div.rotulo', {}, esCarrusel
          ? `Carrusel · placa ${st.activa + 1} de ${st.placas.length}${PAPEL[plantillaSegunPosicion(p.plantilla, st.activa, st.placas.length)] || ''}`
          : F.rotulo),
        el('h2', { style: 'margin:2px 0 0;' }, 'Escribí tu placa')
      )
    )

    /* — selector de plantilla visual con chips — */
    // Portada y cierre no se ofrecen: son la primera y la última del carrusel.
    const disponibles = Object.entries(ROTULOS)

    const ICONOS_PLANTILLA = {
      texto: '📝',
      pasos: '🔢',
      oferta: '🏷️',
      frase: '💬',
      manifiesto: '📣',
      foto: '📸',
    }

    const grillaPlantillas = el('div.pestanas', { style: 'margin-top:6px;gap:8px;' })
    disponibles.forEach(([id, def]) => {
      const btn = el('button.pestana' + (id === p.plantilla ? '.activa' : ''), {
        onclick: () => {
          // Solo se arrastra lo que la plantilla nueva va a mostrar. Conservar
          // todo dejaba texto colgado: el cuerpo de una oferta seguía saliendo
          // en la frase, invisible en el formulario y visible en el PNG.
          const usa = clavesDePlantilla(id)
          const conservar = { disposicion: p.disposicion }
          for (const k of usa) if (p[k] !== undefined) conservar[k] = p[k]
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

    // Disposición: se ve, no se lee.
    //
    // Era un desplegable con los nombres —"Bloque", "Ficha"— y nadie sabe qué
    // significan hasta aplicarlos: había que abrir, elegir, mirar el resultado y
    // volver a abrir, una vez por opción. Ahora cada una muestra un esquema de
    // dónde cae el texto y se elige de un toque.
    if (catalogo?.disposiciones?.length) {
      // Cuál es "la de tu marca" de verdad. Sin esto la primera tarjeta dibujaba
      // siempre el esquema de Clásica, así que con cualquier otra marca mostraba
      // una disposición que no era la suya —y con Clásica quedaban dos tarjetas
      // idénticas sin explicar por qué—.
      const deLaMarca = cuenta?.marca?.disposicion || 'clasica'
      const nombreDeLaMarca = catalogo.disposiciones.find(d => d.id === deLaMarca)?.label || ''

      const opciones = [
        {
          id: '',
          label: 'La de tu marca',
          esquema: deLaMarca,
          pie: nombreDeLaMarca,
          descripcion: `La que elegiste al armar tu marca${nombreDeLaMarca ? `: ${nombreDeLaMarca}` : ''}. Si no querés pensarlo, dejala.`,
        },
        ...catalogo.disposiciones,
      ]
      const grilla = el('div.disp-grilla')
      for (const d of opciones) {
        const boton = el('button.disp-opcion', {
          type: 'button',
          title: d.descripcion,
          'aria-pressed': String((p.disposicion || '') === d.id),
          onclick: () => {
            p.disposicion = d.id || null
            elegirEnGrupo(grilla, boton, 'elegida')
            for (const b of grilla.children) b.setAttribute('aria-pressed', String(b === boton))
            refrescarDemorado()
          },
        },
          esquemaDeDisposicion(d.esquema ?? d.id, Boolean(d.esquema)),
          el('span.disp-nombre', {}, d.label),
          // Decir cuál es evita la pregunta obvia: por qué dos tarjetas
          // dibujan lo mismo cuando la marca ya usa esa disposición.
          d.pie ? el('span.disp-pie', {}, d.pie) : null
        )
        if ((p.disposicion || '') === d.id) boton.classList.add('elegida')
        grilla.append(boton)
      }
      form.append(el('div.campo', {},
        el('label', {}, 'Cómo se acomoda'),
        el('span.ayuda', {}, 'Dónde se apoya el texto en esta placa.'),
        grilla
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
    /* — los campos —
     *
     * Abiertos van los principales; el resto queda detrás de un botón que dice
     * qué agrega. Solo el título es obligatorio, pero con los cinco campos
     * pintados igual el formulario se leía como cinco cosas para completar
     * antes de poder publicar. Un campo que ya tiene algo escrito se muestra
     * abierto: si no, al volver a editar la placa desaparecería del formulario
     * un texto que sí está saliendo en el PNG. */
    for (const campo of CAMPOS_PRINCIPALES[p.plantilla] || PLANTILLAS[p.plantilla].campos) {
      form.append(armarCampo(campo, p, refrescarDemorado, medidor))
    }

    const opcionales = camposSecundarios(p.plantilla)
    const tieneAlgo = c => c === 'imagen' ? Boolean(p.foto) : Boolean(p[c])
    const abiertos = new Set(opcionales.filter(tieneAlgo))
    if (opcionales.length) {
      const zona = el('div', { style: 'display:flex;flex-direction:column;gap:18px' })
      const botones = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' })
      const repintarOpcionales = () => {
        vaciar(zona); vaciar(botones)
        for (const campo of opcionales) {
          if (abiertos.has(campo)) { zona.append(armarCampo(campo, p, refrescarDemorado, medidor)); continue }
          botones.append(el('button.btn.fantasma.chico', {
            type: 'button',
            onclick: () => { abiertos.add(campo); repintarOpcionales() },
          }, `＋ ${CAMPOS[campo].agregar || CAMPOS[campo].label}`))
        }
      }
      repintarOpcionales()
      form.append(zona, botones)
    }

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
      // Frase y manifiesto marcan con bastardilla; el resto, con el acento.
      const conEm = p.plantilla === 'frase' || p.plantilla === 'manifiesto'
      const etiqueta = conEm ? ['<em>', '</em>'] : ['<span class="acc">', '</span>']
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

/* ── guardar las placas ──────────────────────────────────── */

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
/**
 * Cómo se llama el archivo que ve la persona.
 *
 * El nombre interno —`feed-mtk6bc67`— aparece en letra grande en la hoja de
 * compartir de iOS y en la carpeta de descargas, y no dice nada: ni de qué
 * negocio es, ni de cuándo. Con varias placas guardadas es imposible
 * distinguirlas. Va el nombre de la marca y la fecha, que es como uno las
 * busca después.
 */
function nombreDeArchivo(marca, i, total) {
  const hoy = new Date()
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const base = [marca, fecha].filter(Boolean).join(' ')
  return total > 1 ? `${base} (${i + 1} de ${total}).png` : `${base}.png`
}

/**
 * El dibujito de cada disposición.
 *
 * Barras donde iría el texto: la volanta fina, el título grueso, el párrafo
 * tenue. No es la placa —para eso está la vista previa— pero alcanza para saber
 * si el título va arriba, al medio o se come toda la placa, que es justamente
 * lo que el nombre no dice.
 */
function esquemaDeDisposicion(id, esDeLaMarca = false) {
  const barras = {
    titular:  ['t', 't2', 't', 'aire', 'p'],
    centrada: ['linea', 't', 't2', 'linea', 'p2'],
    bloque:   ['caja', 't', 't2', 'aire', 'p', 'p2'],
    ficha:    ['tchico', 'linea', 'pgrande', 'pgrande', 'pgrande2'],
  }[id] || ['k', 't', 't2', 'p', 'p2']

  // La clase de estilo sale de la disposición dibujada; la de la marca suma la
  // suya para teñirse distinto sin cambiar la composición.
  const caja = el(`div.disp-mini.disp-mini--${id || 'clasica'}${esDeLaMarca ? ' disp-mini--marca' : ''}`)
  for (const b of barras) caja.append(el(`i.disp-b.disp-b--${b}`))
  return caja
}

function bloqueDeGuardado(archivos, marca = '') {
  const n = archivos.length
  const caja = el('div', { style: 'display:flex;flex-direction:column;gap:10px;margin-top:14px' })

  const listos = Promise.all(archivos.map(async (a, i) => {
    const res = await fetch(a.url)
    if (!res.ok) throw new Error(`no se pudo leer ${a.name}`)
    const blob = await res.blob()
    return new File([blob], nombreDeArchivo(marca, i, n), { type: blob.type || 'image/png' })
  })).catch(() => null)

  // Un clic por archivo, espaciados: varios `download` simultáneos los bloquea
  // el navegador y solo baja el primero.
  const descargarTodo = () => archivos.forEach((a, i) => setTimeout(() => {
    const link = el('a', { href: a.url, download: nombreDeArchivo(marca, i, n) })
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
        href: a.url, download: nombreDeArchivo(marca, i, n),
      }, `Placa ${i + 1}`))))
  }

  return caja
}
