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
import { montarFondoCascada } from './cascada-fondo.js'
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
  // El id sigue siendo 'manifiesto': lo usan el motor, el esquema del modelo y
  // las placas ya guardadas. Lo que cambia es cómo se llama en pantalla.
  // "Manifiesto" es palabra de diseñador y suena a declaración de principios:
  // nadie que atiende un mostrador iba a pensar que ahí entra "hacemos las
  // milanesas como en casa".
  manifiesto: { label: 'Idea', para: 'Una sola idea, en letras grandes. Sin explicación abajo: lo que decís es todo.' },
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
  // Se llamaba "emoji" y dibuja la cifra de la promo: 64 píxeles, negrita, en el
  // centro del recuadro. Con ese nombre, ese ejemplo y un tope de 4 caracteres,
  // lo que se escribía ahí nunca era lo que la placa esperaba.
  emoji: { label: '¿Cuál es la oferta?', ayuda: 'La cifra que la gente busca: 2×1, 50%, $4.500. Sale grande, en el medio del recuadro.', ej: '2×1', max: 14 },
  chips: { label: 'Precios o condiciones', ayuda: 'De 2 a 3, cortitos. Uno por línea.', ej: 'Desde $4.500\nRetiro en el local' },
  pasos: { label: 'Los pasos', ayuda: 'Tres o cuatro. Con más, la placa se aprieta y deja de leerse.' },
  imagen: { label: 'La foto' },
}

/** Campos que la placa dibuja dentro de un mismo recuadro. */
const GRUPOS = {
  oferta: { titulo: 'El recuadro de la oferta', campos: ['emoji', 'kicker', 'cuerpo', 'chips'] },
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
  feed: { w: 1080, h: 1350, rotulo: 'Post de feed (1080×1350)', maxAncho: 560 },
  historia: { w: 1080, h: 1920, rotulo: 'Historia (1080×1920)', maxAncho: 460 },
  cuadrado: { w: 1080, h: 1080, rotulo: 'Placa cuadrada (1080×1080)', maxAncho: 560 },
}

/* ── pantalla ────────────────────────────────────────────── */

export function iniciarEditor({ contenedor, cuenta, catalogo, alVolver, alCambiarCuota, alPaso }) {
  const st = { canal: null, tipo: null, placas: [], activa: 0 }
  let fondoCascada = null

  /* En qué paso está y cómo se sale de él.
   *
   * Es lo mismo que hace el botón "Volver" de cada pantalla, expuesto para que
   * la flecha del navegador haga lo mismo: dentro del editor son tres pasos y
   * antes la flecha te sacaba del sitio desde cualquiera de ellos. */
  const pasoActual = () => {
    if (!st.canal) return ['formato', alVolver]
    return ['editar', () => { st.canal = null; st.tipo = null; pintar() }]
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
    fondoCascada?.destruir()
    fondoCascada = null
    const [, volver] = pasoActual()
    if (alPaso) history.back()
    else volver?.()
  }

  const pintar = () => {
    fondoCascada?.destruir()
    fondoCascada = null
    vaciar(contenedor)
    if (!st.canal) elegirFormato()
    else editar()
    alPaso?.(...pasoActual())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  /* ── 1. qué vas a publicar ─────────────────────────────── */

  function elegirFormato() {
    fondoCascada?.destruir()

    const screen = el('div.formato-cascada-screen')
    fondoCascada = montarFondoCascada(screen)

    const cont = el('div.formato-panel-central')

    const opcion = (titulo, detalle, medidas, onClick) =>
      el('button.opcion', { onclick: onClick, style: 'display:flex;flex-direction:column;align-items:flex-start;gap:6px' },
        el('b', {}, titulo),
        el('span', { style: 'flex:1' }, detalle),
        el('span.rotulo', { style: 'margin-top:4px' }, medidas))

    const arrancar = (canal, tipo, placas) => () => {
      fondoCascada?.destruir()
      fondoCascada = null
      st.canal = canal
      st.tipo = tipo
      st.placas = placas
      pintar()
    }

    cont.append(
      el('span.rotulo', {}, 'Nueva publicación'),
      el('h2', {}, '¿Qué vas a ', el('em', {}, 'armar'), '?'),
      el('p.intro', {}, 'Cada formato cambia el tamaño del lienzo y cómo se acomoda el texto. Instagram te deja recortar antes de publicar, pero recorta por los costados y podés perder texto: conviene armarla en el formato en el que la vas a subir.'),
      el('div.opciones', {},
        opcion('Post de feed', 'Una placa sola, la que queda en tu perfil.', '1080×1350',
          arrancar('feed', 'post', [vacia('texto')])),
        opcion('Carrusel', 'Varias que se deslizan: empieza con una portada y termina pidiendo la acción.', 'hasta 6',
          arrancar('feed', 'carrusel', [vacia('texto'), vacia('texto'), vacia('texto')])),
        opcion('Historia', 'Se ve 24 horas, a pantalla completa. También sirve de portada de reel.', '1080×1920',
          arrancar('historia', null, [vacia('texto')])),
        opcion('Cuadrada', 'La clásica. Entra bien en el perfil y sirve para reutilizar en otras redes.', '1080×1080',
          arrancar('cuadrado', null, [vacia('texto')]))
      ),
      el('div.acciones-paso', {}, el('button.btn.texto', { onclick: irAtras }, '← Volver'))
    )

    screen.append(cont)
    contenedor.append(screen)
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
    const cajaEditor = el('div.editor', {}, form, vista)
    contenedor.append(cajaEditor)

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
    const aplicar = (escala, dx, dy) => {
      lienzo.style.width = `${Math.round(F.w * escala)}px`
      lienzo.style.height = `${Math.round(F.h * escala)}px`
      marco.style.transform = `scale(${escala})`
      // Acercada a un campo, la placa es más grande que la ventana y hay que
      // decirle qué pedazo se ve. Sin desplazamiento la vuelve a centrar el
      // flex de la zona, que es lo que corresponde cuando entra entera.
      const corrida = dx !== undefined
      lienzo.style.position = corrida ? 'absolute' : ''
      lienzo.style.left = corrida ? `${Math.round(dx)}px` : ''
      lienzo.style.top = corrida ? `${Math.round(dy)}px` : ''
    }

    /* La escala con la que la placa entra entera, y el campo que se está
       escribiendo encima de ella —si hay alguno—. */
    let escalaBase = 0
    let campoEnLaPlaca = null
    // Hasta que los pasos existan no hay modo que revisar: la vista previa se
    // mide antes de que estén armados.
    let pasosListos = false
    const enElTelefono = () => window.matchMedia('(max-width: 720px)').matches

    let ajustando = false
    const ajustarEscala = () => {
      if (ajustando) return
      ajustando = true
      try {
        const disponible = Math.min(zona.clientWidth, F.maxAncho)
        if (!disponible) return

        /* En el teléfono la placa se acomoda al alto disponible.
         *
         * El panel de arriba tiene un tope propio y se compacta al abrirse el
         * teclado, así que su alto está definido y es el que aprieta. Midiendo
         * solo el ancho, la placa conservaba su tamaño cuando el panel se
         * achicaba y quedaba cortada por el `overflow: hidden`: se veía partida,
         * como si estuviera por detrás. La corrección por desborde tampoco
         * servía acá, justamente porque con el desborde oculto no hay nada que
         * medir. */
        if (enElTelefono() && zona.clientHeight > 40) {
          escalaBase = Math.min(disponible / F.w, zona.clientHeight / F.h)
          if (campoEnLaPlaca) acercarAlCampo()
          else aplicar(escalaBase)
          return
        }

        let escala = disponible / F.w
        aplicar(escala)
        const sobra = vista.scrollHeight - vista.clientHeight
        if (sobra > 1) {
          escala = Math.max(0.05, (F.h * escala - sobra) / F.h)
          aplicar(escala)
        }
        escalaBase = escala
      } finally {
        ajustando = false
      }
    }
    ajustarEscala()
    // Cada vez que el motor devuelve HTML nuevo el iframe se recarga entero: el
    // elemento que tenía el campo encima ya no es el mismo, y hay que volver a
    // medirlo y a marcarlo.
    marco.addEventListener('load', () => ajustarEscala())
    // Se miran las dos cajas: cuando la banda de escritura crece o se achica,
    // lo que cambia de alto es la vista, y la zona no se entera si nada la
    // vuelve a medir.
    const observador = new ResizeObserver(() => { revisarModo(); ajustarEscala() })
    observador.observe(zona)
    observador.observe(vista)

    const errorVista = el('div')
    const medidor = el('div.medidor')

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
    /* Lo que sale de generar no puede quedar adentro del panel de la placa.
     *
     * En el teléfono ese panel es la capa oscura donde vive la pieza, con el
     * alto justo y el desborde oculto: el aviso salía verde sobre negro, la
     * placa se encogía a una estampilla y el botón de guardar quedaba abajo de
     * la banda. Va en su propia caja, que en la computadora se dibuja donde
     * estaba y en el teléfono se abre como pantalla completa. */
    const errorBajar = el('div', { style: 'margin-top:12px' })
    const salida = el('div', { style: 'margin-top:12px' })
    const cajaSalida = el('div.editor-salida', {},
      el('button.btn.texto.chico.salida-cerrar', {
        type: 'button',
        onclick: () => { vaciar(salida); vaciar(errorBajar); cajaSalida.classList.remove('abierta') },
      }, '← Seguir editando'),
      errorBajar, salida)
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
            // Se dice qué se ahorró, no a qué precio se hizo. "US$10 a precio de
            // diseñador" se lee como lo que costó; el valor está en lo que no
            // hubo que pagar.
            ref ? el('p.medidor', { style: 'margin-top:8px' },
              'Te ahorraste ',
              el('b', {}, ref.simbolo + Math.round(n * ref.precioPorPlaca).toLocaleString('es-AR')),
              ` de un diseñador o community manager`) : null,
            bloqueDeGuardado(r.archivos, cuenta?.marca?.nombre || cuenta?.nombre || '')
          )
          cajaSalida.classList.add('abierta')
        } catch (e) {
          errorBajar.append(aviso(
            e.codigo === 'cuota_excedida' ? e.message : `No se pudieron generar: ${e.message}`, 'malo'))
          cajaSalida.classList.add('abierta')
        } finally {
          generar.disabled = false
          generar.textContent = rotuloGenerar()
        }
      },
    }, rotuloGenerar())

    /* En el teléfono la placa entra en unos 120 píxeles: alcanza para ver la
     * composición —dónde cae el título, si el texto desborda— pero no para
     * leerla. Este botón la abre a pantalla completa cuando hace falta
     * revisarla de verdad. En escritorio no aparece: ahí ya se ve. */
    const verGrande = el('button.btn-ver-grande', {
      type: 'button',
      onclick: () => abrirLupa(marco, F),
    }, 'Ver grande')

    /* Resaltar, negrita y el contador del campo que se está escribiendo.
       Viven en su `.campo`, y cuando el campo se va a la placa se vienen con
       él: son los mismos nodos, así que los botones siguen andando.

       Van al pie, con la barra de pasos, y no flotando sobre la pieza: una
       pastilla encima de la placa tapa justo la parte que se está mirando. */
    const tiraHerramientas = el('div.tira-herramientas')

    const liveBadge = el('div.placa-live-badge', {},
      el('span.live-dot'),
      el('span', {}, 'EN VIVO')
    )

    vista.append(
      el('span.rotulo', { style: 'display:block;margin-bottom:10px' }, 'Vista previa'),
      zona, liveBadge, verGrande, errorVista,
      el('div.editor-vista-generar', {}, generar),
      cajaSalida, medidor
    )

    /* — escribir sobre la placa —
     *
     * Acercar la placa al campo que se está escribiendo.
     *
     * Con la placa entera en un teléfono, el cuerpo se escribe en letra de once
     * píxeles: se ve dónde va a quedar el texto, pero no se lee lo que se
     * escribe. La placa se acerca hasta que la columna del campo llena el ancho
     * de la ventana y se corre para dejarlo a la vista. En el título, que ya se
     * lee, la cuenta da uno y no se acerca nada. */
    function acercarAlCampo() {
      const doc = marco.contentDocument
      const nodo = doc?.body ? nodoDelCampo(doc, campoEnLaPlaca.campo) : null
      // El motor no dibuja un bloque vacío, y en la vista previa tampoco: si el
      // elemento no está, no hay dónde apoyar el campo.
      if (!nodo) { aplicar(escalaBase); return }

      traerLasFuentesDeLaPlaca(doc)

      const caja = nodo.getBoundingClientRect()
      // La tipografía se copia con el elemento sin marcar. La marca de edición
      // pone el color en transparente, así que leerla con la marca puesta —al
      // entrar al campo la primera vez no está, pero en cada nueva medición sí—
      // dejaba el campo escribiendo en tinta invisible.
      nodo.removeAttribute('data-editando')
      const cs = doc.defaultView.getComputedStyle(nodo)
      const tipo = {
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        fontStyle: cs.fontStyle, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign, textTransform: cs.textTransform, color: cs.color,
      }
      // Con el campo vacío, lo que se ve en la placa es el ejemplo que pone la
      // vista previa. Ese mismo texto es el que va de consigna adentro del
      // campo: el ejemplo largo del formulario no entra en la caja del título.
      const { entrada } = campoEnLaPlaca
      if (!entrada.value.trim()) entrada.placeholder = nodo.textContent.trim()
      marcarLoQueSeEscribe(doc, nodo)

      /* Cuánto se acerca, decidido al entrar al campo y no tocado después: la
       * etiqueta crece con lo que se escribe, y recalculando en cada letra la
       * placa se movía sola mientras uno tipea.
       *
       * Se acerca lo justo para que la letra se lea, y nunca tanto como para
       * cortar la línea: acercarse más allá de eso deja al que escribe sin ver
       * dónde termina el renglón. En el título no hace falta ninguna de las dos
       * cosas —a placa entera ya mide veintiséis píxeles— y la cuenta da uno. */
      // Se rehace, eso sí, cuando cambia la escala con la que la placa entra
      // entera: al entrar al campo el panel de abajo todavía estaba dibujado, y
      // la placa se quedaba con el tamaño chico que tenía debajo de él.
      if (campoEnLaPlaca.base !== escalaBase) {
        campoEnLaPlaca.base = escalaBase
        const paraLeerlo = MINIMO_LEGIBLE / parseFloat(tipo.fontSize)
        const paraQueEntreLaLinea = zona.clientWidth / Math.max(caja.width, 1)
        campoEnLaPlaca.escala = Math.min(
          escalaBase * ACERCAMIENTO_MAXIMO,
          Math.max(escalaBase, Math.min(paraLeerlo, paraQueEntreLaLinea)))
      }
      const e = campoEnLaPlaca.escala

      // Qué pedazo se ve: el campo en el medio, pero sin dejar borde vacío. Si
      // la placa entra entera en esa dirección, va centrada.
      const encuadrar = (medida, ventana, centro) => medida <= ventana
        ? (ventana - medida) / 2
        : Math.min(0, Math.max(ventana - medida, ventana / 2 - centro))
      aplicar(e,
        encuadrar(F.w * e, zona.clientWidth, (caja.left + caja.width / 2) * e),
        encuadrar(F.h * e, zona.clientHeight, (caja.top + caja.height / 2) * e))

      calzarSobreLaPlaca(entrada, tipo, caja, e)
    }

    /** Sacar el campo del panel de abajo y apoyarlo sobre la placa. */
    function escribirEnLaPlaca(seccion, paso, conFoco = true) {
      const entrada = paso.querySelector('textarea')
      if (!entrada) return false
      campoEnLaPlaca = {
        campo: seccion.campo,
        entrada,
        herramientas: paso.querySelector('.campo-herramientas'),
        caja: entrada.closest('.campo'),
        escala: 0,
        base: 0,
        consigna: entrada.placeholder,
        crecer: () => crecerConLoQueSeEscribe(entrada, 0),
      }
      entrada.addEventListener('input', campoEnLaPlaca.crecer)
      lienzo.append(entrada)
      if (campoEnLaPlaca.herramientas) tiraHerramientas.append(campoEnLaPlaca.herramientas)
      cajaEditor.classList.add('en-la-placa')
      acercarAlCampo()
      // El foco va acá adentro y no en un tiempo aparte: iOS solo abre el
      // teclado si el foco sale del mismo toque que lo pidió.
      if (conFoco) entrada.focus({ preventScroll: true })
      return true
    }

    /* Cruzar el corte de los 720 píxeles —girar el teléfono, agrandar la
     * ventana— cambia dónde tiene que estar el campo. Sin esto, al pasar a
     * computadora el campo se quedaba apoyado sobre la placa y desaparecía del
     * formulario, que en esa pantalla es el único lugar donde se escribe. */
    function revisarModo() {
      if (!pasosListos) return
      const s = secciones[activo]
      const corresponde = Boolean(enElTelefono() && s?.campo && DONDE_CAE[s.campo])
      if (campoEnLaPlaca && !corresponde) soltarLaPlaca()
      // Al volver, sin robar el foco: nadie pidió el teclado girando el teléfono.
      else if (!campoEnLaPlaca && corresponde) escribirEnLaPlaca(s, pasos[activo], false)
    }

    /** Devolver el campo a su lugar y volver a mostrar la placa entera. */
    function soltarLaPlaca() {
      if (!campoEnLaPlaca) return
      const { entrada, herramientas, caja, consigna, crecer } = campoEnLaPlaca
      entrada.removeEventListener('input', crecer)
      entrada.placeholder = consigna
      entrada.removeAttribute('style')
      // El orden del campo es rótulo, ayuda, entrada y herramientas: los dos
      // que se habían ido vuelven en ese orden y queda como estaba.
      caja?.append(entrada)
      if (herramientas) caja?.append(herramientas)
      for (const n of marco.contentDocument?.querySelectorAll('[data-editando]') || []) {
        n.removeAttribute('data-editando')
      }
      campoEnLaPlaca = null
      cajaEditor.classList.remove('en-la-placa')
      aplicar(escalaBase)
    }

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
    //
    // Los estilos van en la hoja y no en línea: en el teléfono esta cabecera se
    // convierte en una barra fina fija arriba de todo, y un estilo en línea no
    // se puede alcanzar desde una media query.
    form.append(
      el('div.editor-cabecera', {},
        el('button.btn.texto.chico.editor-volver', {
          type: 'button',
          onclick: irAtras,
        }, '← Volver'),
        // En un carrusel se dice qué papel cumple la placa: la primera y la
        // última se dibujan distinto y conviene que se sepa antes de escribir.
        el('div.rotulo', {}, esCarrusel
          ? `Carrusel · placa ${st.activa + 1} de ${st.placas.length}${PAPEL[plantillaSegunPosicion(p.plantilla, st.activa, st.placas.length)] || ''}`
          : F.rotulo),
        el('h2', {}, 'Escribí tu placa')
      )
    )

    /* — el editor, en pasos —
     *
     * En computadora los pasos se muestran continuos en la columna del
     * formulario (`.editor-paso { display: contents }`) y nada de esto se ve.
     * En el teléfono se muestra uno por vez, en una banda apoyada al pie de la
     * placa, y la placa se queda con todo lo demás.
     *
     * Un paso, una cosa. Con varios campos por paso la banda crece, el teclado
     * se lleva el resto y la placa vuelve a ser una miniatura ilegible: es
     * exactamente lo que había antes. Por eso los campos principales se
     * reparten de a uno, salvo los que la placa dibuja adentro de un mismo
     * recuadro —el de la oferta—, que se preguntan juntos porque juntos se ven.
     */
    const secciones = []
    const seccion = (nom, ...nodos) => {
      const utiles = nodos.filter(Boolean)
      if (utiles.length) secciones.push({ nom, nodos: utiles })
    }
    /** Un paso con un solo campo de texto: es el que se escribe sobre la placa. */
    const seccionDeCampo = (campo, ...nodos) => {
      const utiles = nodos.filter(Boolean)
      if (!utiles.length) return
      secciones.push({
        nom: CAMPOS[campo]?.label || campo,
        ayuda: CAMPOS[campo]?.ayuda || '',
        campo,
        nodos: utiles,
      })
    }

    /* — plantilla — */
    // Portada y cierre no se ofrecen: son la primera y la última del carrusel.
    const disponibles = Object.entries(ROTULOS)

    const ICONOS_PLANTILLA = {
      texto: '📝',
      pasos: '🔢',
      oferta: '🏷️',
      frase: '💬',
      manifiesto: '💡',
      foto: '📸',
    }

    const explicacion = el('span.ayuda.ayuda-plantilla', {}, PLANTILLAS[p.plantilla].para)
    const mostrarPara = id => { explicacion.textContent = PLANTILLAS[id].para }

    const grillaPlantillas = el('div.pestanas', { style: 'margin-top:6px;gap:8px;' })
    disponibles.forEach(([id, def]) => {
      const btn = el('button.pestana' + (id === p.plantilla ? '.activa' : ''), {
        onmouseenter: () => mostrarPara(id),
        onfocus: () => mostrarPara(id),
        onmouseleave: () => mostrarPara(p.plantilla),
        onblur: () => mostrarPara(p.plantilla),
        onclick: () => {
          const usa = clavesDePlantilla(id)
          const conservar = { disposicion: p.disposicion }
          for (const k of usa) if (p[k] !== undefined) conservar[k] = p[k]
          st.placas[st.activa] = { ...vacia(id), ...conservar }
          editarDeNuevo()
        }
      }, `${ICONOS_PLANTILLA[id] || '📄'} ${def.label}`)
      grillaPlantillas.append(btn)
    })

    seccion('Plantilla', el('div.campo', {},
      el('label', {}, 'Tipo de plantilla'),
      explicacion,
      grillaPlantillas
    ))

    /* — cómo se acomoda — */
    if (catalogo?.disposiciones?.length) {
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
          d.pie ? el('span.disp-pie', {}, d.pie) : null
        )
        if ((p.disposicion || '') === d.id) boton.classList.add('elegida')
        grilla.append(boton)
      }
      seccion('Composición', el('div.campo', {},
        el('label', {}, 'Cómo se acomoda'),
        el('span.ayuda', {}, 'Dónde se apoya el texto en esta placa.'),
        grilla
      ))
    }

    /* — los campos principales, uno por paso — */
    // La plantilla de foto sobre imagen: mientras no haya foto elegida, la
    // vista previa muestra un fondo liso y conviene decirlo donde se elige.
    const avisoSinFoto = p.plantilla === 'foto' && !p.foto
      ? (() => { const a = aviso('Esta plantilla va sobre una imagen. Mientras no elijas una, la vista previa muestra un fondo liso.'); a.classList.add('aviso-sin-foto'); return a })()
      : null

    const grupo = GRUPOS[p.plantilla]
    const yaEnElGrupo = new Set()
    for (const campo of CAMPOS_PRINCIPALES[p.plantilla] || PLANTILLAS[p.plantilla].campos) {
      if (grupo?.campos.includes(campo)) {
        if (yaEnElGrupo.size) { yaEnElGrupo.add(campo); continue }
        // Todos los del recuadro, juntos y en un solo paso.
        const caja = el('div.campo-grupo', {}, el('span.campo-grupo-titulo', {}, grupo.titulo))
        for (const c of grupo.campos) {
          if (!(CAMPOS_PRINCIPALES[p.plantilla] || []).includes(c)) continue
          caja.append(armarCampo(c, p, refrescarDemorado, medidor))
          yaEnElGrupo.add(c)
        }
        seccion(grupo.titulo, caja)
        continue
      }
      seccionDeCampo(campo,
        campo === 'imagen' ? avisoSinFoto : null,
        armarCampo(campo, p, refrescarDemorado, medidor))
    }

    /* — detalles opcionales — */
    const opcionales = camposSecundarios(p.plantilla)
    const detalles = []
    if (opcionales.length) {
      const tieneAlgo = c => c === 'imagen' ? Boolean(p.foto) : Boolean(p[c])
      const abiertos = new Set(opcionales.filter(tieneAlgo))
      const zonaOpc = el('div.opcionales-abiertos')
      const botones = el('div.opcionales-botones')
      const repintarOpcionales = () => {
        vaciar(zonaOpc); vaciar(botones)
        for (const campo of opcionales) {
          if (abiertos.has(campo)) { zonaOpc.append(armarCampo(campo, p, refrescarDemorado, medidor)); continue }
          botones.append(el('button.btn.fantasma.chico', {
            type: 'button',
            onclick: () => { abiertos.add(campo); repintarOpcionales() },
          }, `＋ ${CAMPOS[campo].agregar || CAMPOS[campo].label}`))
        }
      }
      repintarOpcionales()
      detalles.push(zonaOpc, botones)
    }

    if (esHistoria && p.plantilla !== 'foto') {
      const selFoto = selectorDeImagen({
        cuentaId: cuenta.id,
        orientacion: 'vertical',
        inicial: p.foto,
        onElegir: img => {
          p.foto = img
          p.credito = creditoQueCorresponde(img)
          refrescarDemorado()
        },
      })
      detalles.push(el('div.campo', {},
        el('label', {}, '📸 Foto de fondo'),
        el('span.ayuda', {}, 'Opcional. Sin foto la historia usa el color de tu marca como fondo.'),
        !p.foto ? el('div.aviso', { style: 'margin-bottom:10px' }, 'Sin foto, la placa usa el color de tu marca de fondo. Podés dejarlo así.') : null,
        selFoto.nodo
      ))
    }
    seccion('Detalles', ...detalles)

    /* — revisión y generación — */
    const botonGenerarPaso = el('button.btn.grande.generar-paso', {
      onclick: () => generar.click()
    }, rotuloGenerar())

    seccion('Generar',
      el('div.campo', {},
        el('label', {}, 'Revisá y generá tu publicación'),
        el('span.ayuda', {}, 'Tu placa está lista. Presioná para generar los archivos en alta resolución.')
      ),
      el('div.editor-paso-resumen', {},
        el('p.resumen-formato', {}, `Formato: ${F.rotulo}`),
        el('p.resumen-detalle', {}, '2160 píxeles de ancho en alta resolución.')
      ),
      botonGenerarPaso
    )

    /* — la barra que mueve los pasos —
     *
     * Una sola, al pie de la banda, en vez de un pie por paso. Con uno por paso
     * había dos bordes seguidos —el de abajo de la barra de progreso y el de
     * arriba del pie— y en pantalla se leían como rayas sueltas entre los
     * campos, sin separar nada. */
    const pasos = secciones.map(({ nodos }, i) =>
      el(`div.editor-paso${i === 0 ? '.activo' : ''}`, { 'data-paso': String(i + 1) }, ...nodos))

    const segmentos = secciones.map(() => el('div.stepper-dot-seg'))
    const nomPaso = el('span.paso-nom-txt')
    const cuentaPaso = el('span.paso-cuenta')
    // Escribiendo sobre la placa el campo no lleva su rótulo al lado: la ayuda
    // se dice acá, que es lo único que queda del formulario.
    const ayudaPaso = el('div.paso-ayuda')
    const atras = el('button.btn.texto.chico.paso-atras', {
      type: 'button', onclick: () => irAPaso(activo - 1),
    }, '← Anterior')
    const adelante = el('button.btn.paso-adelante', {
      type: 'button', onclick: () => irAPaso(activo + 1),
    }, 'Siguiente →')

    const pasoNav = el('div.editor-pasos-nav', {},
      el('div.stepper-dots-wrap', {}, ...segmentos),
      tiraHerramientas,
      ayudaPaso,
      el('div.paso-fila', {},
        atras,
        el('span.paso-label-mobile', {}, nomPaso, el('span.paso-cuenta-sep', {}, ' · '), cuentaPaso),
        adelante)
    )

    let activo = 0
    function irAPaso(n) {
      soltarLaPlaca()
      activo = Math.max(0, Math.min(secciones.length - 1, n))
      const paso = secciones[activo]
      pasos.forEach((pnl, i) => pnl.classList.toggle('activo', i === activo))
      segmentos.forEach((s, i) => {
        s.classList.toggle('activo', i === activo)
        s.classList.toggle('completado', i < activo)
      })
      nomPaso.textContent = paso.nom
      cuentaPaso.textContent = `${activo + 1} de ${secciones.length}`
      atras.hidden = activo === 0
      adelante.hidden = activo === secciones.length - 1
      form.scrollTop = 0

      // Un campo de texto suelto se escribe encima de la placa, donde va a
      // quedar. Lo que no es un texto en un lugar —los pasos, los precios, la
      // foto, elegir plantilla— sigue en el panel de abajo: ahí no hay nada que
      // apoyar sobre la pieza.
      ayudaPaso.textContent = ''
      if (enElTelefono() && paso.campo && DONDE_CAE[paso.campo] &&
          escribirEnLaPlaca(paso, pasos[activo])) {
        ayudaPaso.textContent = paso.ayuda || ''
      }
      // La banda cambia de alto al cambiar de paso y la placa se queda con lo
      // que sobra: hay que volver a medirla, pero recién cuando el navegador
      // terminó de reacomodar el flex.
      requestAnimationFrame(ajustarEscala)
    }

    form.append(...pasos)
    // La barra de pasos es de la capa, no del panel: escribiendo sobre la placa
    // el panel no se dibuja y la barra tiene que seguir estando.
    cajaEditor.append(pasoNav)
    irAPaso(0)
    pasosListos = true

    /* Que el teclado esté abierto se marca en el body.
     *
     * No mueve nada por su cuenta —de la medida de la capa se ocupa
     * seguirAlTeclado(), que es lo único que escribe esas variables—: sirve
     * para apretar los márgenes de la banda, que con media pantalla menos
     * valen más que la prolijidad. */
    if (window.visualViewport) {
      const alAbrirseElTeclado = () => {
        const abierto = window.visualViewport.height < window.innerHeight * 0.75
        document.body.classList.toggle('teclado-abierto', abierto)
      }
      window.visualViewport.addEventListener('resize', alAbrirseElTeclado)
      alAbrirseElTeclado()
    }

    refrescar()

    function editarDeNuevo() { vaciar(contenedor); editar() }
  }

  /* ── campos ────────────────────────────────────────────── */

  /**
 * Lo que hay que decirle al teléfono sobre estos campos.
 *
 * Sin `autocomplete="off"`, iOS abre el teclado con su barra de autorrelleno:
 * los iconos de llave, tarjeta y ubicación arriba de las teclas. Acá no se pide
 * ninguna de esas cosas —se escribe el texto de una placa— así que esa barra
 * ocupa alto y ofrece datos que no vienen al caso.
 *
 * Lo demás es para escribir en castellano: mayúscula al empezar la oración y el
 * corrector encendido, que en un texto que se publica conviene.
 */
const COMO_SE_ESCRIBE = {
  autocomplete: 'off',
  autocorrect: 'on',
  autocapitalize: 'sentences',
  spellcheck: 'true',
}

/**
 * Un campo de una línea, sin la barra de autorrelleno de iOS.
 *
 * Safari ignora `autocomplete="off"` en los `input` de texto: abre igual su
 * barra con la llave, la tarjeta y la ubicación, ofreciendo datos que no vienen
 * al caso para escribir el texto de una placa, y encima ocupa alto sobre un
 * teclado que ya se comió media pantalla.
 *
 * Con un `textarea` esa barra no aparece. Se lo deja de una fila y se bloquea el
 * Enter para que se comporte como el input que reemplaza: en un campo de una
 * línea, un salto no significa nada y rompe la placa.
 */
function campoDeUnaLinea(props = {}) {
  const n = el('textarea', { rows: 1, ...COMO_SE_ESCRIBE, ...props })
  n.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault() })
  return n
}

/* ── escribir sobre la placa ─────────────────────────────── */

/**
 * Dónde cae cada campo dentro del HTML que devuelve el motor.
 *
 * Se prueban en orden y gana el primero que exista: la misma clave se dibuja
 * distinto según la plantilla —la etiqueta es una línea suelta en "texto", la
 * chapita del recuadro en "oferta" y una píldora en el cierre— y el editor no
 * tiene por qué saber cuál de las tres le tocó.
 *
 * Los campos que no están acá no se escriben sobre la placa. Los pasos, los
 * precios, la foto y la fuente no son un texto en un lugar: son varias cosas, o
 * una lista, y para eso el panel de abajo sigue siendo mejor.
 */
const DONDE_CAE = {
  kicker: ['.promo-badge', '.pill', '.kick', '.eyebrow'],
  titulo: ['.title', '.headline', '.l1'],
  cuerpo: ['.body'],
  linea2: ['.l2'],
  emoji: ['.promo-cifra'],
}

/** Debajo de esto Safari agranda la página entera al enfocar el campo. */
const MINIMO_COMODO = 16

/** Con menos que esto en pantalla, el campo no se lee mientras se escribe. */
const MINIMO_LEGIBLE = 15

/** Hasta cuánto se puede acercar la placa para escribir cómodo. */
const ACERCAMIENTO_MAXIMO = 2.4

function nodoDelCampo(doc, campo) {
  return (DONDE_CAE[campo] || []).map(s => doc.querySelector(s)).find(Boolean) || null
}

/**
 * Las tipografías de la placa, también en la página.
 *
 * El campo se dibuja afuera del iframe —ver `calzarSobreLaPlaca`— así que las
 * fuentes que cargó el motor no le sirven: sin esto el texto que se escribe
 * sale en la tipografía por defecto y no coincide con lo que hay abajo.
 */
function traerLasFuentesDeLaPlaca(doc) {
  for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
    const url = link.href
    if (!url || document.querySelector(`link[data-placa="${CSS.escape(url)}"]`)) continue
    document.head.append(el('link', { rel: 'stylesheet', href: url, 'data-placa': url }))
  }
}

/**
 * El texto de la placa se vuelve invisible, pero no se saca.
 *
 * Con `display:none` la caja desaparece y todo lo de abajo sube; con
 * `visibility:hidden` se van también el fondo de la píldora y la barrita de la
 * etiqueta, que no son texto y tienen que quedarse. Lo único que sobra son las
 * letras, porque las está dibujando el campo que se le puso encima.
 */
function marcarLoQueSeEscribe(doc, nodo) {
  if (!doc.getElementById('cm-edicion')) {
    doc.head.append(Object.assign(doc.createElement('style'), {
      id: 'cm-edicion',
      textContent: '[data-editando],[data-editando] *{color:transparent!important;' +
        '-webkit-text-fill-color:transparent!important}',
    }))
  }
  for (const otro of doc.querySelectorAll('[data-editando]')) otro.removeAttribute('data-editando')
  nodo.setAttribute('data-editando', '')
}

/**
 * Poner el campo donde va a quedar el texto, con la letra de la placa.
 *
 * El campo no se dibuja adentro del iframe. El iframe está achicado con un
 * transform, y escribir ahí adentro —con el cursor y la selección pasando por
 * esa escala— es pelearse con el navegador. Como el iframe es del mismo origen
 * se puede medir el elemento y copiarle la caja y la tipografía a un textarea
 * normal, en la página, apoyado encima del lienzo.
 *
 * `k` es el ajuste contra el agrandado automático de Safari: cuando la letra de
 * la placa mide menos de 16 píxeles en pantalla, el campo se declara de 16 y se
 * achica con un transform. Para el navegador mide 16 y no agranda la página;
 * en pantalla mide lo que mide la letra de la placa.
 */
function calzarSobreLaPlaca(entrada, tipo, caja, escala) {
  const enPantalla = parseFloat(tipo.fontSize) * escala
  const k = enPantalla < MINIMO_COMODO ? enPantalla / MINIMO_COMODO : 1
  const px = v => `${(parseFloat(v) || 0) * escala / k}px`
  Object.assign(entrada.style, {
    position: 'absolute',
    left: `${caja.left * escala}px`,
    top: `${caja.top * escala}px`,
    width: `${caja.width * escala / k}px`,
    height: `${caja.height * escala / k}px`,
    transform: k === 1 ? '' : `scale(${k})`,
    transformOrigin: '0 0',
    margin: '0',
    padding: '0',
    border: 'none',
    background: 'transparent',
    boxShadow: 'none',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    zIndex: '4',
    fontFamily: tipo.fontFamily,
    fontSize: `${Math.max(enPantalla, MINIMO_COMODO)}px`,
    fontWeight: tipo.fontWeight,
    fontStyle: tipo.fontStyle,
    lineHeight: tipo.lineHeight === 'normal' ? 'normal' : px(tipo.lineHeight),
    letterSpacing: tipo.letterSpacing === 'normal' ? 'normal' : px(tipo.letterSpacing),
    textAlign: tipo.textAlign,
    textTransform: tipo.textTransform,
    color: tipo.color,
    caretColor: tipo.color,
  })
  crecerConLoQueSeEscribe(entrada, caja.height * escala / k)
}

/**
 * El campo crece con el texto.
 *
 * La caja que se copió es la del último render, y entre render y render se
 * siguen escribiendo letras: sin esto, la tercera línea de un título de dos
 * quedaba cortada por el `overflow: hidden` hasta que la placa se dibujara de
 * nuevo.
 */
function crecerConLoQueSeEscribe(entrada, minimo) {
  entrada.style.height = 'auto'
  entrada.style.height = `${Math.max(minimo, entrada.scrollHeight)}px`
}

function armarCampo(campo, p, alEscribir, medidor) {
    const def = CAMPOS[campo]

    if (campo === 'imagen') {
      const sel = selectorDeImagen({
        cuentaId: cuenta.id,
        orientacion: st.canal === 'historia' ? 'vertical' : '',
        inicial: p.foto,
        onElegir: img => {
          p.foto = img
          p.credito = creditoQueCorresponde(img)
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
      const ta = el('textarea', { rows: 3, placeholder: def.ej, value: (p.chips || []).join('\n'), ...COMO_SE_ESCRIBE })
      ta.addEventListener('input', () => {
        p.chips = ta.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3)
        alEscribir()
      })
      return el('div.campo', {}, el('label', {}, def.label), el('span.ayuda', {}, def.ayuda), ta)
    }

    if (campo === 'pasos') {
      if (!p.pasos.length) {
        p.pasos = [1, 2, 3].map(n => ({ numero: String(n), etiqueta: '', titulo: '' }))
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
          ]) {
            const inp = campoDeUnaLinea({ placeholder: ej, value: paso[clave], style: 'margin-bottom:6px' })
            inp.addEventListener('input', () => { paso[clave] = inp.value; alEscribir() })
            fila.append(el('label.chico', { style: 'display:block;color:var(--tinta-3);margin-bottom:2px' }, etiqueta), inp)
          }
          cont.append(fila)
        })
        const acciones = el('div', { style: 'display:flex;gap:8px;margin-top:10px' })
        if (p.pasos.length < 4) {
          acciones.append(el('button.btn.fantasma.chico', {
            onclick: () => { p.pasos.push({ numero: String(p.pasos.length + 1), etiqueta: '', titulo: '' }); repintar(); alEscribir() },
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
      ? el('textarea', { rows: campo === 'cuerpo' ? 3 : 2, placeholder: def.ej, ...COMO_SE_ESCRIBE })
      : campoDeUnaLinea({ placeholder: def.ej })
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
    // Clase propia: en la columna angosta del teléfono esta fila tiene que
    // poder pasar a dos renglones, y con el estilo en línea no hay forma de
    // alcanzarla desde la hoja de estilos.
    const herramientas = el('div.campo-herramientas', { style: 'display:flex;gap:10px;align-items:center;margin-top:6px' })
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
 * La placa a pantalla completa.
 *
 * Se clona el iframe que ya está dibujado en vez de pedirle otro render al
 * servidor: es el mismo HTML, sale instantáneo y no gasta una llamada.
 */
function abrirLupa(marco, F) {
  const capa = el('div.lupa-placa', {
    onclick: e => { if (e.target === capa) capa.remove() },
  })

  const copia = marco.cloneNode(true)
  const anchoDisponible = Math.min(window.innerWidth - 44, 520)
  const altoDisponible = window.innerHeight * 0.78
  const escala = Math.min(anchoDisponible / F.w, altoDisponible / F.h)

  const caja = el('div', {
    style: `width:${Math.round(F.w * escala)}px;height:${Math.round(F.h * escala)}px;` +
           'position:relative;overflow:hidden;border-radius:10px;background:#fff;' +
           'box-shadow:0 12px 40px rgba(0,0,0,.4)',
  })
  copia.style.cssText = 'position:absolute;top:0;left:0;border:none;transform-origin:0 0;' +
    `transform:scale(${escala})`
  caja.append(copia)

  capa.append(caja, el('button.btn.chico', { onclick: () => capa.remove() }, 'Cerrar'))
  document.body.append(capa)

  // Con Escape también, que es lo que uno prueba primero en una notebook.
  const conEscape = e => {
    if (e.key !== 'Escape') return
    capa.remove()
    document.removeEventListener('keydown', conEscape)
  }
  document.addEventListener('keydown', conEscape)
}

/**
 * De qué tamaño es lo que se ve.
 *
 * En el teléfono el editor es una capa fija: la placa arriba y la banda de
 * escritura al pie, sin scroll de página. Para eso hace falta saber cuánto mide
 * lo que se ve de verdad, y `100vh` no lo dice: iOS no achica el viewport de
 * maquetación al abrir el teclado —solo el visual— así que la capa quedaba más
 * alta que la pantalla y la banda terminaba abajo del teclado.
 *
 * `visualViewport.height` es esa medida, y `offsetTop` cuánto corrió el
 * navegador la página por debajo: sumado al tope devuelve la capa adentro
 * cuando iOS desplaza para dejar a la vista el campo enfocado.
 */
function seguirAlTeclado() {
  const vv = window.visualViewport
  const raiz = document.documentElement
  if (!vv) return
  const ajustar = () => {
    raiz.style.setProperty('--vv-alto', `${Math.round(vv.height)}px`)
    raiz.style.setProperty('--vv-tope', `${Math.round(vv.offsetTop)}px`)
  }
  vv.addEventListener('resize', ajustar)
  vv.addEventListener('scroll', ajustar)
  // Y también en el scroll de la página: iOS avisa por visualViewport solo a
  // veces, y entre aviso y aviso la capa se quedaba corrida.
  addEventListener('scroll', ajustar, { passive: true })
  ajustar()
}
seguirAlTeclado()

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

/**
 * Qué crédito estampar en la placa.
 *
 * Solo el que la licencia exige: Unsplash lo pide en sus términos de API y
 * Openverse lo hereda de las Creative Commons. Pexels y Pixabay no obligan, y
 * una línea de texto sobre la foto que nadie pide le come diseño a la placa.
 *
 * La decisión va acá y no en el spec porque acá se conoce la licencia: al
 * render la foto viaja como ruta y ese dato ya se perdió.
 */
function creditoQueCorresponde(img) {
  return img?.atribucion === 'obligatoria' ? (img.credito || '') : ''
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
