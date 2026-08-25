// Onboarding. Cuatro pasos: contá tu negocio, decinos qué tenés, armamos la
// identidad, y mirá cómo queda.
//
// La decisión de diseño que más cambia la experiencia está en el paso 2. En vez
// de preguntar "¿tenés identidad de marca?" —que un panadero no sabe si tiene—
// se pregunta por separado por el logo, el color y la tipografía. Casi ningún
// negocio chico tiene las tres, casi todos tienen alguna. Un sí o no global
// obligaría a mentir en una de las dos direcciones.

import { api } from './api.js'
import { el, $, $$, vaciar, aviso, elegirEnGrupo, svgLogo } from './ui.js'
import { selectorDeColor, coloresDeSVG } from './color.js'

const PASOS = [
  ['Tu negocio', 'negocio'],
  ['Qué tenés', 'tenencia'],
  ['Tu identidad', 'identidad'],
  ['Listo', 'listo'],
]

let fuentesCargadas = false
function cargarFuentesDeMuestra(catalogo) {
  if (fuentesCargadas) return
  fuentesCargadas = true
  const familias = catalogo.tipografias.map(t => t.id)
  // Solo los pesos que se usan en la muestra: la pantalla no puede tardar
  // cuatro segundos en pintar por traer doce familias completas.
  const url = 'https://fonts.googleapis.com/css2?' +
    ['Inter:wght@600', 'Libre+Franklin:wght@600', 'Nunito+Sans:wght@600', 'Chivo:wght@600',
     'Source+Sans+3:wght@600', 'Poppins:wght@600', 'Fraunces:ital@1', 'Playfair+Display:ital@1',
     'Bitter:ital@1', 'Instrument+Serif:ital@1', 'Lora:ital@1', 'DM+Serif+Display:ital@1']
      .map(f => 'family=' + f).join('&') + '&display=swap'
  document.head.append(el('link', { rel: 'stylesheet', href: url }))
}

const FUENTES_MUESTRA = {
  moderno: ['Inter', 'Fraunces'],
  editorial: ['Libre Franklin', 'Playfair Display'],
  calido: ['Nunito Sans', 'Bitter'],
  tecnico: ['Chivo', 'Instrument Serif'],
  clasico: ['Source Sans 3', 'Lora'],
  geometrico: ['Poppins', 'DM Serif Display'],
}

export function iniciarWizard({ contenedor, catalogo, cuentaId, alTerminar }) {
  const st = {
    cuentaId,
    negocio: {},
    tiene: { logo: null, color: null, tipo: null },
    logo: null,
    coloresDelLogo: [],
    color: null,
    tipografia: null,
    disposicion: 'clasica',
    sugerencia: null,
    paso: 0,
  }

  function pintar() {
    vaciar(contenedor)
    const riel = el('nav.riel', {}, el('ol', {},
      PASOS.map(([nombre], i) =>
        el('li', { class: i === st.paso ? 'actual' : i < st.paso ? 'hecho' : '' }, nombre))
    ))
    const panel = el('div.paso')
    contenedor.append(el('div.wizard', {}, riel, panel))

    ;[pasoNegocio, pasoTenencia, pasoIdentidad, pasoListo][st.paso](panel)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const ir = n => { st.paso = n; pintar() }

  /* ── 1. el negocio ─────────────────────────────────────── */

  function pasoNegocio(panel) {
    const campos = [
      ['nombre', 'Cómo se llama', 'Como lo conocen tus clientes. Va a ir arriba de cada placa.', 'Panadería Mendieta', false],
      ['rubro', 'A qué se dedica', 'En pocas palabras.', 'panadería de barrio', false],
      ['ciudad', 'Dónde está', '', 'Rosario', false],
      ['queVende', 'Qué vende', 'Lo concreto, no las categorías.', 'pan de masa madre, facturas, tortas por encargo', true],
      ['publico', 'Quién le compra', '', 'vecinos del barrio, familias', true],
      ['diferencial', 'Por qué te eligen a vos', 'Lo que decís cuando alguien pregunta por qué comprar acá y no en la de enfrente. Es lo que más cambia el contenido.', 'masa madre propia, todo sale del horno a las 7 de la mañana', true],
      ['handle', 'Tu usuario de Instagram', 'Sin el arroba. Si no tenés, lo dejamos vacío.', 'panaderiamendieta', false],
    ]

    const inputs = {}
    const form = el('div')
    for (const [clave, etiqueta, ayuda, ejemplo, largo] of campos) {
      const entrada = largo
        ? el('textarea', { rows: 2, placeholder: ejemplo })
        : el('input', { type: 'text', placeholder: ejemplo })
      entrada.value = st.negocio[clave] || ''
      inputs[clave] = entrada
      form.append(el('div.campo', {},
        el('label', {}, etiqueta),
        ayuda && el('span.ayuda', {}, ayuda),
        entrada
      ))
    }

    const error = el('div', { style: 'margin-bottom:14px' })
    const seguir = el('button.btn', {
      onclick: () => {
        for (const [k, v] of Object.entries(inputs)) st.negocio[k] = v.value.trim()
        vaciar(error)
        if (!st.negocio.nombre) {
          error.append(aviso('Necesitamos al menos el nombre del negocio.', 'malo'))
          return
        }
        ir(1)
      },
    }, 'Seguir')

    panel.append(
      el('span.rotulo', {}, 'Paso 1 de 4'),
      el('h2', {}, 'Contanos de tu negocio'),
      el('p.intro', {}, 'Con esto armamos tu marca y, más adelante, el contenido. Cuanto más concreto, mejor sale: "pan de masa madre" sirve, "productos de calidad" no dice nada.'),
      form, error, el('div.acciones-paso', {}, seguir)
    )
  }

  /* ── 2. qué tiene ──────────────────────────────────────── */

  function pasoTenencia(panel) {
    const preguntas = [
      ['logo', '¿Tenés logo?', 'Un archivo SVG hecho de trazos. Si lo tenés en JPG o PNG no sirve para esto.'],
      ['color', '¿Tenés un color de marca?', 'Aunque sea "el bordó ese" sin saber el código exacto.'],
      ['tipo', '¿Tenés una tipografía definida?', 'La mayoría de los negocios chicos no, y está bien.'],
    ]

    const cont = el('div')
    for (const [clave, pregunta, ayuda] of preguntas) {
      const grupo = el('div.opciones.dos')
      const marcar = (v, b) => { st.tiene[clave] = v; elegirEnGrupo(grupo, b) }

      const si = el('button.opcion', { onclick: () => marcar(true, si) },
        el('b', {}, 'Sí, lo tengo'), el('span', {}, clave === 'logo' ? 'Lo subo yo' : 'Lo elijo yo'))
      const no = el('button.opcion', { onclick: () => marcar(false, no) },
        el('b', {}, 'No, sugerime'), el('span', {}, 'Que lo proponga la plataforma'))

      if (st.tiene[clave] === true) si.classList.add('elegida')
      if (st.tiene[clave] === false) no.classList.add('elegida')
      grupo.append(si, no)

      cont.append(el('div.campo', {},
        el('label', {}, pregunta),
        el('span.ayuda', {}, ayuda),
        grupo
      ))
    }

    const error = el('div', { style: 'margin-bottom:14px' })
    const seguir = el('button.btn', {
      onclick: () => {
        vaciar(error)
        if (Object.values(st.tiene).some(v => v === null)) {
          error.append(aviso('Contestá las tres para seguir.', 'malo'))
          return
        }
        ir(2)
      },
    }, 'Seguir')

    panel.append(
      el('span.rotulo', {}, 'Paso 2 de 4'),
      el('h2', {}, '¿Qué tenés ya armado?'),
      el('p.intro', {}, 'Preguntamos por separado porque casi ningún negocio chico tiene las tres cosas, y casi todos tienen alguna. Lo que no tengas, lo proponemos nosotros.'),
      cont, error,
      el('div.acciones-paso', {}, seguir, el('button.btn.texto', { onclick: () => ir(0) }, '← Volver'))
    )
  }

  /* ── 3. la identidad ───────────────────────────────────── */

  async function pasoIdentidad(panel) {
    const necesitaIA = Object.values(st.tiene).some(v => v === false)

    panel.append(
      el('span.rotulo', {}, 'Paso 3 de 4'),
      el('h2', {}, 'Tu identidad'),
      el('p.intro', {}, necesitaIA
        ? 'Armamos propuestas para lo que no tenías. Lo que sí tenías, lo cargás vos.'
        : 'Cargá lo tuyo y mirá cómo se ve aplicado.')
    )

    const secciones = el('div')
    const acciones = el('div.acciones-paso')
    panel.append(secciones, acciones)

    if (necesitaIA && !st.sugerencia) {
      const espera = el('p.cargando-txt', {}, 'Pensando una identidad para tu negocio')
      secciones.append(espera)
      try {
        st.sugerencia = await api.sugerirIdentidad(st.cuentaId, st.negocio)
      } catch (e) {
        espera.remove()
        secciones.append(aviso(`No pudimos generar la propuesta. ${e.message}`, 'malo'))
        secciones.append(el('p.apunte.chico', { style: 'margin-top:10px' },
          'Podés seguir igual y cargar lo tuyo, o probar de nuevo más tarde.'))
        st.tiene = { logo: true, color: true, tipo: true }
      }
      espera.remove()
    }

    if (st.sugerencia?.lectura) {
      secciones.append(el('div.aviso.bien', { style: 'margin-bottom:24px' }, st.sugerencia.lectura))
    }

    seccionLogo(secciones)
    seccionColor(secciones)
    seccionTipografia(secciones)

    const error = el('div')
    secciones.append(error)

    const listo = el('button.btn', {
      onclick: async () => {
        vaciar(error)
        listo.disabled = true
        listo.textContent = 'Guardando…'
        try {
          await api.guardarMarca(st.cuentaId, {
            ...st.negocio,
            color: st.color || undefined,
            tipografia: st.tipografia || undefined,
            logo: st.logo || undefined,
          })
          ir(3)
        } catch (e) {
          error.append(aviso(e.message, 'malo'))
          listo.disabled = false
          listo.textContent = 'Guardar mi marca'
        }
      },
    }, 'Guardar mi marca')

    acciones.append(listo, el('button.btn.texto', { onclick: () => ir(1) }, '← Volver'))
  }

  function bloque(cont, titulo, ayuda, ...hijos) {
    cont.append(el('section', { style: 'margin-bottom:34px' },
      el('h3', { style: 'margin-bottom:3px' }, titulo),
      ayuda && el('span.ayuda', { style: 'margin-bottom:14px' }, ayuda),
      ...hijos
    ))
  }

  // Confirmación de que el logo entró. Se dibuja tanto al subirlo como al
  // volver a pintar el paso: sin esto, extraer los colores del archivo
  // re-renderizaba la sección y borraba la única señal de que salió bien, así
  // que el usuario creía que había fallado y volvía a subirlo.
  function mostrarLogoCargado(destino, logo) {
    vaciar(destino).append(
      el('div', { style: 'display:flex;gap:14px;align-items:center;margin-top:6px' },
        svgLogo(logo, 52),
        el('span.apunte.chico', {},
          'Listo. Lo dibujamos en un solo color para que funcione sobre fondo claro y oscuro.')),
      st.coloresDelLogo.length
        ? el('p.apunte.chico', { style: 'margin-top:8px' },
            `Encontramos ${st.coloresDelLogo.length} color(es) en el archivo. Están abajo, en la pestaña «Del logo que subiste».`)
        : null
    )
  }

  function seccionLogo(cont) {
    if (st.tiene.logo) {
      const estado = el('div', { style: 'margin-top:10px' })
      if (st.logo) mostrarLogoCargado(estado, st.logo)
      const entrada = el('input', {
        type: 'file', accept: '.svg,image/svg+xml',
        onchange: async ev => {
          const archivo = ev.target.files?.[0]
          if (!archivo) return
          const texto = await archivo.text()
          st.coloresDelLogo = coloresDeSVG(texto)
          const viewBox = texto.match(/viewBox\s*=\s*"([^"]+)"/)?.[1] || '0 0 100 100'
          const inner = texto.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '')
          vaciar(estado)
          try {
            const r = await api.subirLogo(st.cuentaId, { viewBox, inner, strokeWidth: 8 })
            st.logo = r.logo
            // Repintar el paso entero para que el selector de color ofrezca los
            // colores del archivo. `mostrarLogoCargado` se encarga de que la
            // confirmación sobreviva al repintado.
            if (st.coloresDelLogo.length) pintar()
            else mostrarLogoCargado(estado, r.logo)
          } catch (e) {
            vaciar(estado).append(aviso(e.message, 'malo'))
          }
        },
      })
      bloque(cont, 'Logo', 'Tiene que ser un SVG hecho de trazos: exportalo con el texto convertido a curvas y sin imágenes incrustadas.', entrada, estado)
      return
    }

    const opciones = st.sugerencia?.logos || []
    if (!opciones.length) return

    const grilla = el('div.logos')
    for (const op of opciones) {
      const b = el('button.logo-op', {
        onclick: () => { st.logo = op.logo; elegirEnGrupo(grilla, b) },
      }, svgLogo(op.logo, 62), el('div.concepto', {}, op.concepto))
      if (st.logo?.inner === op.logo.inner) b.classList.add('elegida')
      grilla.append(b)
    }
    bloque(cont, 'Elegí tu logo', 'Cuatro ideas distintas, no la misma forma girada. Se van a ver a 40 píxeles en la esquina de cada placa.', grilla)
  }

  function seccionColor(cont) {
    const sugeridos = st.sugerencia?.colores || []
    const inicial = st.color || sugeridos[0]?.hex || '#A83A1C'
    if (!st.color) st.color = inicial

    const contenido = el('div')

    if (!st.tiene.color && sugeridos.length) {
      const grupo = el('div.opciones', { style: 'margin-bottom:20px' })
      for (const c of sugeridos) {
        const b = el('button.opcion', {
          style: 'display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:center',
          onclick: () => { st.color = c.hex; elegirEnGrupo(grupo, b); sel.nodo.replaceWith((sel = nuevoSelector()).nodo) },
        },
          el('span', { style: `background:${c.hex};height:44px;border-radius:2px;display:block` }),
          el('span', {}, el('b', {}, `${c.nombre} · ${c.hex}`), el('span', {}, c.porque))
        )
        if (c.hex === st.color) b.classList.add('elegida')
        grupo.append(b)
      }
      contenido.append(grupo, el('p.apunte.chico', { style: 'margin-bottom:14px' },
        'O buscá el tuyo:'))
    }

    const nuevoSelector = () => selectorDeColor({
      inicial: st.color,
      delLogo: st.coloresDelLogo,
      onCambio: hex => { st.color = hex },
    })
    let sel = nuevoSelector()
    contenido.append(sel.nodo)

    bloque(cont, 'Color', st.tiene.color
      ? 'Elegí primero la familia y después el tono exacto. Si tenés el código, está la segunda pestaña.'
      : null, contenido)
  }

  function seccionTipografia(cont) {
    cargarFuentesDeMuestra(catalogo)
    const sugerida = st.sugerencia?.tipografia
    if (!st.tipografia) st.tipografia = sugerida?.preset || 'moderno'

    const grupo = el('div.opciones')
    for (const t of catalogo.tipografias) {
      const [sans, serif] = FUENTES_MUESTRA[t.id] || ['inherit', 'inherit']
      const b = el('button.opcion', { onclick: () => { st.tipografia = t.id; elegirEnGrupo(grupo, b) } },
        el('div', { style: `font-family:'${sans}',sans-serif;font-weight:600;font-size:1.28rem;letter-spacing:-.02em;margin-bottom:2px` },
          st.negocio.nombre || 'Tu negocio'),
        el('div', { style: `font-family:'${serif}',serif;font-style:italic;font-size:1.02rem;color:var(--tinta-2);margin-bottom:6px` },
          'y la frase que va sin explicación'),
        el('span', {}, `${t.label} — ${t.vibe}`),
        sugerida?.preset === t.id && sugerida.porque
          ? el('span', { style: 'color:var(--acento);margin-top:4px' }, `Sugerida: ${sugerida.porque}`)
          : null
      )
      if (t.id === st.tipografia) b.classList.add('elegida')
      grupo.append(b)
    }

    bloque(cont, 'Tipografía', 'Las dos líneas de arriba de cada opción son las que vas a ver en tus placas.', grupo)
  }

  /* ── 4. listo ──────────────────────────────────────────── */

  async function pasoListo(panel) {
    panel.append(
      el('span.rotulo', {}, 'Paso 4 de 4'),
      el('h2', {}, 'Cómo se acomoda el texto'),
      el('p.intro', {}, 'Tu color y tu logo ya distinguen tus placas de las de otro negocio. La disposición las termina de separar: es cómo se ordena el texto adentro. Elegí la que te represente y mirá el cambio en la placa de al lado.')
    )

    const lienzo = el('div.lienzo', { style: 'width:340px;height:425px;flex:none' })
    const marco = el('iframe', {
      width: 1080, height: 1350, scrolling: 'no',
      style: 'transform:scale(0.3148)',
    })
    lienzo.append(marco)

    const opciones = el('div.opciones', { style: 'flex:1;min-width:0' })
    const errorVista = el('div')

    const placaDeMuestra = {
      plantilla: 'texto',
      kicker: st.negocio.rubro ? st.negocio.rubro.slice(0, 22) : 'Tu marca',
      titulo: 'Así se ven tus <span class="acc">placas</span>',
      cuerpo: st.negocio.diferencial
        ? st.negocio.diferencial.charAt(0).toUpperCase() + st.negocio.diferencial.slice(1)
        : 'Tu color, tu tipografía y tu logo aplicados a cada pieza que bajes.',
      pasos: [], chips: [], emoji: '', fuente: '', linea2: '',
    }

    async function refrescar() {
      vaciar(errorVista)
      try {
        // marcaTemporal deja probar la disposición sin guardarla todavía.
        marco.srcdoc = await api.previsualizar(st.cuentaId, {
          canal: 'feed',
          placa: placaDeMuestra,
          marcaTemporal: { disposicion: st.disposicion },
        })
      } catch (e) {
        errorVista.append(aviso(`No pudimos generar la vista previa: ${e.message}`, 'malo'))
      }
    }

    for (const d of catalogo.disposiciones || []) {
      const b = el('button.opcion', {
        onclick: () => { st.disposicion = d.id; elegirEnGrupo(opciones, b); refrescar() },
      }, el('b', {}, d.label), el('span', {}, d.descripcion))
      if (d.id === st.disposicion) b.classList.add('elegida')
      opciones.append(b)
    }

    panel.append(
      el('div', { style: 'display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap' }, lienzo, opciones),
      errorVista
    )

    const acciones = el('div.acciones-paso')
    const listo = el('button.btn', {
      onclick: async () => {
        listo.disabled = true
        listo.textContent = 'Guardando…'
        try {
          await api.guardarMarca(st.cuentaId, { disposicion: st.disposicion })
          alTerminar()
        } catch (e) {
          vaciar(errorVista).append(aviso(e.message, 'malo'))
          listo.disabled = false
          listo.textContent = 'Empezar a publicar'
        }
      },
    }, 'Empezar a publicar')

    acciones.append(listo, el('button.btn.texto', { onclick: () => ir(2) }, '← Cambiar la marca'))
    panel.append(acciones)

    refrescar()
  }

  pintar()
}
