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

function extraerIniciales(nombre = '') {
  const palabras = String(nombre).trim().split(/\s+/).filter(Boolean)
  if (!palabras.length) return 'M'
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + (palabras[1] ? palabras[1][0] : '')).toUpperCase()
}

function escSvg(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generarPropuestasLocales(negocio = {}) {
  const nombre = escSvg(negocio.nombre || 'Mi Negocio')
  const subtitulo = escSvg((negocio.rubro || negocio.ciudad || 'OFICIO & CALIDAD').toUpperCase())
  const ini = extraerIniciales(negocio.nombre || 'MN')

  return [
    {
      id: 'logo-firma',
      nombre: 'Firma / Caligráfico',
      concepto: 'Tipografía de autor continua con subtítulo artesanal.',
      logo: {
        viewBox: '0 0 300 110',
        inner: `
          <g text-anchor="middle" fill="currentColor">
            <text x="150" y="58" font-family="'Alex Brush', 'Dancing Script', cursive" font-size="44" transform="rotate(-2 150 58)">${nombre}</text>
            <line x1="40" y1="72" x2="260" y2="72" stroke="currentColor" stroke-width="1.2" opacity="0.75" />
            <text x="150" y="88" font-family="'Plus Jakarta Sans', sans-serif" font-size="10.5" font-weight="700" letter-spacing="4.5" opacity="0.85">${subtitulo}</text>
          </g>
        `,
        strokeWidth: 4,
        strokeWidthSmall: 3,
        origen: 'sugerido',
      },
    },
    {
      id: 'logo-pastilla',
      nombre: 'Pastilla / Caja de Marca',
      concepto: 'Bloque sólido de alto impacto con máxima legibilidad.',
      logo: {
        viewBox: '0 0 300 110',
        inner: `
          <rect x="18" y="18" width="264" height="74" rx="37" fill="currentColor" opacity="0.08"/>
          <rect x="22" y="22" width="256" height="66" rx="33" fill="none" stroke="currentColor" stroke-width="3.5"/>
          <text x="150" y="57" text-anchor="middle" dominant-baseline="central" font-family="'Syne', 'Montserrat', sans-serif" font-size="23" font-weight="800" letter-spacing="2" fill="currentColor">${nombre.toUpperCase()}</text>
          <text x="150" y="75" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" letter-spacing="3.5" fill="currentColor" opacity="0.8">${subtitulo}</text>
        `,
        strokeWidth: 4,
        strokeWidthSmall: 3,
        origen: 'sugerido',
      },
    },
    {
      id: 'logo-sello',
      nombre: 'Sello / Medallón Circular',
      concepto: 'Insignia tradicional con texto arqueado y símbolo central.',
      logo: {
        viewBox: '0 0 100 100',
        inner: `
          <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="2.5"/>
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width="0.8"/>
          <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" stroke-width="0.8"/>
          <text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="'Plus Jakarta Sans', sans-serif" font-size="${ini.length > 1 ? 16 : 22}" font-weight="800" fill="currentColor">${ini}</text>
        `,
        strokeWidth: 4,
        strokeWidthSmall: 3,
        origen: 'sugerido',
      },
    },
    {
      id: 'logo-monograma',
      nombre: 'Monograma de Diseñador',
      concepto: 'Iniciales entrelazadas en marco geométrico de autor.',
      logo: {
        viewBox: '0 0 300 110',
        inner: `
          <rect x="25" y="15" width="80" height="80" rx="14" fill="none" stroke="currentColor" stroke-width="3"/>
          <text x="65" y="55" text-anchor="middle" dominant-baseline="central" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="800" fill="currentColor">${ini}</text>
          <text x="125" y="50" font-family="'Playfair Display', serif" font-size="24" font-weight="700" fill="currentColor">${nombre}</text>
          <text x="125" y="72" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="600" letter-spacing="3" fill="currentColor" opacity="0.8">${subtitulo}</text>
        `,
        strokeWidth: 4,
        strokeWidthSmall: 3,
        origen: 'sugerido',
      },
    },
  ]
}

export function iniciarWizard({ contenedor, catalogo, cuentaId, marca = null, modoEdicion = false, alTerminar }) {
  const st = {
    cuentaId,
    negocio: {
      nombre: marca?.nombre || '',
      rubro: marca?.negocio?.rubro || '',
      ciudad: marca?.negocio?.ciudad || '',
      queVende: marca?.negocio?.queVende || '',
      publico: marca?.negocio?.publico || '',
      diferencial: marca?.negocio?.diferencial || '',
      handle: marca?.handle || '',
    },
    tiene: { logo: marca?.logo ? true : null, color: marca?.meta?.colorOriginal ? true : null, tipo: marca?.fonts?.preset ? true : null },
    logo: marca?.logo || null,
    coloresDelLogo: [],
    color: marca?.colors?.accent?.bg || marca?.meta?.colorOriginal || '#A83A1C',
    tipografia: marca?.fonts?.preset || 'moderno',
    disposicion: marca?.disposicion || 'clasica',
    logotipoTipo: marca?.logotipo?.tipo || 'palabra-simbolo',
    logotipoTratamiento: marca?.logotipo?.tratamiento || 'linea',
    logotipoEscudo: marca?.logotipo?.escudo || 'circulo',
    logotipoFuente: marca?.logotipo?.fuente || 'mismo',
    sugerencia: null,
    paso: 0,
    modoEdicion: Boolean(modoEdicion || (marca && marca.nombre)),
    subModuloActivo: null,
    mensajeExito: null,
  }

  function pintar() {
    vaciar(contenedor)

    if (st.modoEdicion && !st.subModuloActivo) {
      renderizarHubEdicion(contenedor)
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }

    if (st.modoEdicion && st.subModuloActivo) {
      renderizarSubModulo(contenedor, st.subModuloActivo)
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }

    const pasosConfig = [
      { id: '01 NEGOCIO', dot: 'process__dot--mint' },
      { id: '02 QUÉ TENÉS', dot: 'process__dot--cyan' },
      { id: '03 IDENTIDAD', dot: 'process__dot--pear' },
      { id: '04 LISTO', dot: 'process__dot--coral' },
    ]

    const processStrip = el('div.process')
    pasosConfig.forEach((p, idx) => {
      const esPasado = idx < st.paso
      const step = el('div.process__step', {
        class: `${idx === st.paso ? 'is-active' : ''} ${esPasado ? 'is-done' : ''}`.trim(),
        title: esPasado ? `Volver a ${p.id}` : '',
        onclick: esPasado ? () => ir(idx) : null,
      },
        el('span.process__dot.' + p.dot),
        el('span', {}, p.id)
      )
      processStrip.append(step)
      if (idx < pasosConfig.length - 1) {
        processStrip.append(el('span.process__link'))
      }
    })

    const panel = el('div.card', { style: 'margin-top:10px;' })
    contenedor.append(el('div.wizard', {}, processStrip, panel))

    ;[pasoNegocio, pasoTenencia, pasoIdentidad, pasoListo][st.paso](panel)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const ir = n => { st.paso = n; pintar() }

  /* ══════════════════════════════════════════════════════════
   * HUB MODULAR DE EDICIÓN DE MARCA (4 CARDS PRINCIPALES)
   * ══════════════════════════════════════════════════════════ */
  function renderizarHubEdicion(cont) {
    const hub = el('div.edicion-marca-hub', { style: 'max-width:820px;margin:0 auto;' })

    const cabecera = el('div', { style: 'margin-bottom:24px;' },
      el('span.rotulo', {}, 'Configuración de Marca'),
      el('h2', { style: 'margin:6px 0 8px;' }, 'Editar Identidad de Marca'),
      el('p.intro', { style: 'margin:0;' }, 'Elegí qué aspecto querés modificar. Los cambios que guardes se aplicarán de inmediato a tus próximas placas.')
    )

    const avisoExito = st.mensajeExito
      ? el('div.aviso.bien', { style: 'margin-bottom:20px;' }, st.mensajeExito)
      : null

    const grid = el('div.edicion-marca-grid')

    // Card 1: Negocio
    const cardNegocio = el('div.edicion-card', {
      onclick: () => { st.subModuloActivo = 'negocio'; st.mensajeExito = null; pintar() }
    },
      el('div.edicion-card__header', {},
        el('div.edicion-card__icon', {}, '🏪'),
        el('h3.edicion-card__title', {}, 'Datos del negocio')
      ),
      el('div.edicion-card__body', {},
        el('b', { style: 'display:block;margin-bottom:2px;' }, st.negocio.nombre || 'Sin nombre'),
        el('span', {}, `${st.negocio.rubro || 'Rubro'} · ${st.negocio.ciudad || 'Ubicación'}`),
        st.negocio.handle ? el('div', { style: 'color:var(--color-ink-3);font-size:12px;margin-top:4px;' }, `@${st.negocio.handle}`) : null
      ),
      el('div.edicion-card__footer', {},
        el('span', {}, 'Editar información ➔')
      )
    )

    // Card 2: Color
    const cardColor = el('div.edicion-card', {
      onclick: () => { st.subModuloActivo = 'color'; st.mensajeExito = null; pintar() }
    },
      el('div.edicion-card__header', {},
        el('div.edicion-card__icon', {}, '🎨'),
        el('h3.edicion-card__title', {}, 'Paleta de color')
      ),
      el('div.edicion-card__body', {},
        el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px;' },
          el('span', { style: `width:22px;height:22px;border-radius:50%;background:${st.color};border:1.5px solid rgba(0,0,0,0.15);display:inline-block;` }),
          el('b', {}, st.color)
        ),
        el('span', {}, 'Color de acento y contraste calculado para tus piezas.')
      ),
      el('div.edicion-card__footer', {},
        el('span', {}, 'Cambiar color ➔')
      )
    )

    // Card 3: Tipografía
    const cardTipo = el('div.edicion-card', {
      onclick: () => { st.subModuloActivo = 'tipografia'; st.mensajeExito = null; pintar() }
    },
      el('div.edicion-card__header', {},
        el('div.edicion-card__icon', {}, '✍️'),
        el('h3.edicion-card__title', {}, 'Tipografía')
      ),
      el('div.edicion-card__body', {},
        el('b', { style: 'display:block;text-transform:capitalize;margin-bottom:2px;' }, `Preset ${st.tipografia}`),
        el('span', {}, 'Fuentes para títulos principales, volantas y frases de impacto.')
      ),
      el('div.edicion-card__footer', {},
        el('span', {}, 'Cambiar tipografía ➔')
      )
    )

    // Card 4: Logo y Firma
    const cardFirma = el('div.edicion-card', {
      onclick: () => { st.subModuloActivo = 'firma'; st.mensajeExito = null; pintar() }
    },
      el('div.edicion-card__header', {},
        el('div.edicion-card__icon', {}, '🔤'),
        el('h3.edicion-card__title', {}, 'Logo y firma')
      ),
      el('div.edicion-card__body', {},
        el('b', { style: 'display:block;margin-bottom:2px;' }, st.logo ? '✓ Logo propio cargado' : `Firma: ${st.logotipoTipo}`),
        el('span', {}, 'Cómo se estampa tu marca en el encabezado y pie de tus placas.')
      ),
      el('div.edicion-card__footer', {},
        el('span', {}, 'Editar firma y logo ➔')
      )
    )

    // Card 5: Disposición del texto
    const cardDisp = el('div.edicion-card', {
      onclick: () => { st.subModuloActivo = 'disposicion'; st.mensajeExito = null; pintar() }
    },
      el('div.edicion-card__header', {},
        el('div.edicion-card__icon', {}, '📐'),
        el('h3.edicion-card__title', {}, 'Disposición del texto')
      ),
      el('div.edicion-card__body', {},
        el('b', { style: 'display:block;text-transform:capitalize;margin-bottom:2px;' }, `Estilo ${st.disposicion}`),
        el('span', {}, 'Cómo se acomoda el título, kicker y párrafos adentro del post.')
      ),
      el('div.edicion-card__footer', {},
        el('span', {}, 'Cambiar disposición ➔')
      )
    )

    grid.append(cardNegocio, cardColor, cardTipo, cardFirma, cardDisp)

    const pie = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:20px;border-top:1px solid var(--color-rule);' },
      el('button.btn.btn--outline.btn--mint', { onclick: alTerminar }, '← Volver al Dashboard'),
      el('button.btn', { onclick: alTerminar }, 'Listo, volver a publicar')
    )

    hub.append(cabecera, avisoExito, grid, pie)
    cont.append(hub)
  }

  /* ── SUBMÓDULO ESPECÍFICO DE EDICIÓN ── */
  function renderizarSubModulo(cont, modulo) {
    const wrapper = el('div.card', { style: 'max-width:820px;margin:0 auto;' })
    cont.append(wrapper)

    const guardarYVolver = async (nombreModulo) => {
      try {
        await api.guardarMarca(st.cuentaId, {
          ...st.negocio,
          color: st.color || undefined,
          tipografia: st.tipografia || undefined,
          disposicion: st.disposicion || undefined,
          logotipoTipo: st.logotipoTipo,
          logotipoTratamiento: st.logotipoTratamiento,
          logotipoEscudo: st.logotipoEscudo,
          logotipoFuente: st.logotipoFuente,
          logo: st.logo || undefined,
        })
        st.subModuloActivo = null
        st.mensajeExito = `✓ Cambios guardados con éxito en ${nombreModulo}.`
        pintar()
      } catch (e) {
        alert(`Error al guardar: ${e.message}`)
      }
    }

    if (modulo === 'negocio') {
      const campos = [
        ['nombre', 'Cómo se llama', 'Como lo conocen tus clientes.', 'Panadería Mendieta', false],
        ['rubro', 'A qué se dedica', 'En pocas palabras.', 'panadería de barrio', false],
        ['ciudad', 'Dónde está', 'Tu ciudad o barrio.', 'Rosario', false],
        ['queVende', 'Qué vende', 'Lo concreto.', 'pan de masa madre, facturas', true],
        ['publico', 'Quién le compra', '', 'vecinos del barrio', true],
        ['diferencial', 'Por qué te eligen a vos', 'Tu diferencial de marca.', 'masa madre propia', true],
        ['handle', 'Tu usuario de Instagram', 'Sin el arroba.', 'panaderiamendieta', false],
      ]
      const inputs = {}
      const form = el('div')
      for (const [clave, etiqueta, ayuda, ejemplo, largo] of campos) {
        const entrada = largo ? el('textarea', { rows: 2 }) : el('input', { type: 'text' })
        entrada.value = st.negocio[clave] || ''
        inputs[clave] = entrada
        form.append(el('div.campo', {}, el('label', {}, etiqueta), ayuda && el('span.ayuda', {}, ayuda), entrada))
      }
      wrapper.append(
        el('span.rotulo', {}, 'Edición de Negocio'),
        el('h2', {}, 'Datos del negocio'),
        form,
        el('div.acciones-paso', { style: 'margin-top:20px;' },
          el('button.btn', {
            onclick: async () => {
              for (const [k, v] of Object.entries(inputs)) st.negocio[k] = v.value.trim()
              await guardarYVolver('Datos del negocio')
            }
          }, 'Guardar cambios ➔'),
          el('button.btn.btn--outline.btn--mint', { onclick: () => { st.subModuloActivo = null; pintar() } }, '← Volver a opciones')
        )
      )
    } else if (modulo === 'color') {
      const contColor = el('div')
      seccionColor(contColor)
      wrapper.append(
        el('span.rotulo', {}, 'Edición de Color'),
        el('h2', {}, 'Paleta de color'),
        contColor,
        el('div.acciones-paso', { style: 'margin-top:20px;' },
          el('button.btn', { onclick: () => guardarYVolver('Color de marca') }, 'Guardar cambios ➔'),
          el('button.btn.btn--outline.btn--mint', { onclick: () => { st.subModuloActivo = null; pintar() } }, '← Volver a opciones')
        )
      )
    } else if (modulo === 'tipografia') {
      const contTipo = el('div')
      seccionTipografia(contTipo)
      wrapper.append(
        el('span.rotulo', {}, 'Edición de Tipografía'),
        el('h2', {}, 'Tipografía de placas'),
        contTipo,
        el('div.acciones-paso', { style: 'margin-top:20px;' },
          el('button.btn', { onclick: () => guardarYVolver('Tipografía') }, 'Guardar cambios ➔'),
          el('button.btn.btn--outline.btn--mint', { onclick: () => { st.subModuloActivo = null; pintar() } }, '← Volver a opciones')
        )
      )
    } else if (modulo === 'firma') {
      const contFirma = el('div')
      seccionIdentidadYFirma(contFirma)
      wrapper.append(
        el('span.rotulo', {}, 'Edición de Firma y Logo'),
        el('h2', {}, 'Logo y firma de autor'),
        contFirma,
        el('div.acciones-paso', { style: 'margin-top:20px;' },
          el('button.btn', { onclick: () => guardarYVolver('Logo y firma') }, 'Guardar cambios ➔'),
          el('button.btn.btn--outline.btn--mint', { onclick: () => { st.subModuloActivo = null; pintar() } }, '← Volver a opciones')
        )
      )
    } else if (modulo === 'disposicion') {
      wrapper.append(
        el('span.rotulo', {}, 'Edición de Disposición'),
        el('h2', {}, 'Disposición del texto')
      )
      pasoListo(wrapper)
    }
  }

  /* ── 1. el negocio ─────────────────────────────────────── */

  function pasoNegocio(panel) {
    const campos = [
      ['nombre', 'Cómo se llama', 'Como lo conocen tus clientes. Va a ir arriba de cada placa.', 'Panadería Mendieta', false],
      ['rubro', 'A qué se dedica', 'En pocas palabras.', 'panadería de barrio', false],
      ['ciudad', 'Dónde está', 'Tu ciudad o barrio para armar hashtags locales. Si vendés solo por internet, poné "Online".', 'Rosario (u "Online")', false],
      ['queVende', 'Qué vende', 'Lo concreto, no las categorías.', 'pan de masa madre, facturas, tortas por encargo', true],
      ['publico', 'Quién le compra', '', 'vecinos del barrio, familias', true],
      ['diferencial', 'Por qué te eligen a vos', 'Lo que decís cuando alguien pregunta por qué comprar acá y no en la de enfrente. Es lo que más cambia el contenido.', 'masa madre propia, todo sale del horno a las 7 de la mañana', true],
      ['handle', 'Tu usuario de Instagram', 'Sin el arroba. Se estampa en el cierre de las placas y en los llamados a la acción. Podés completarlo después.', 'panaderiamendieta', false],
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
      ['logo', '¿Tenés logo?', 'Un archivo vectorial de diseño (.SVG). Si solo tenés una foto o imagen con fondo (.JPG o .PNG), te conviene pedirnos una propuesta para que quede nítido y sin fondo.'],
      ['color', '¿Tenés un color de marca?', 'Aunque sea una idea general ("el bordó ese") sin saber el código exacto.'],
      ['tipo', '¿Tenés una tipografía definida?', 'La mayoría de las marcas al empezar no la tienen, y está perfecto.'],
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
      el('p.intro', {}, 'Preguntamos por separado porque cada marca tiene su propio punto de partida: es normal tener alguna cosa lista y otras pendientes. Lo que te falte, te lo proponemos nosotros.'),
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
        // Fallback inmediato y fluido
        st.sugerencia = {
          logos: generarPropuestasLocales(st.negocio),
          colores: [],
          tipografia: { preset: 'moderno' },
        }
      }
      espera.remove()
    }

    if (st.sugerencia?.lectura) {
      secciones.append(el('div.aviso.bien', { style: 'margin-bottom:24px' }, st.sugerencia.lectura))
    }

    seccionColor(secciones)
    seccionTipografia(secciones)
    seccionIdentidadYFirma(secciones)

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
            logotipoTipo: st.logotipoTipo,
            logotipoTratamiento: st.logotipoTratamiento,
            logotipoEscudo: st.logotipoEscudo,
            logotipoFuente: st.logotipoFuente,
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

  /* ── SECCIÓN COLOR (wrapper de selectorDeColor) ── */
  function seccionColor(cont) {
    const sel = selectorDeColor({
      inicial: st.color || '#A83A1C',
      delLogo: st.coloresDelLogo || [],
      onCambio: hex => { st.color = hex },
    })
    bloque(cont, 'Color de tu marca', 'Elegí el color que ya usás o dejate guiar por las propuestas.', sel.nodo)
  }

  /* ── SECCIÓN TIPOGRAFÍA ── */
  function seccionTipografia(cont) {
    if (!catalogo.tipografias?.length) return
    cargarFuentesDeMuestra(catalogo)

    const grupo = el('div.opciones', {})
    for (const t of catalogo.tipografias) {
      const [pal, ser] = FUENTES_MUESTRA[t.id] || ['Inter', 'Fraunces']
      const muestra = el('button.opcion', {
        onclick: () => {
          st.tipografia = t.id
          elegirEnGrupo(grupo, muestra)
        },
        style: 'flex-direction:column;align-items:flex-start;gap:6px;padding:14px 16px'
      },
        el('b', { style: `font-family:'${pal}',sans-serif;font-size:1.05rem` }, t.label || t.id),
        el('span', { style: `font-family:'${ser}',serif;font-style:italic;font-size:1.35rem;opacity:0.75;line-height:1.1` }, t.muestra || 'Una frase de impacto')
      )
      if (t.id === st.tipografia) muestra.classList.add('elegida')
      grupo.append(muestra)
    }
    bloque(cont, 'Tipografía', 'Determina cómo se ven los titulares, frases y volantas en cada placa.', grupo)
  }

  function seccionIdentidadYFirma(cont) {
    const cat = catalogo.logotipos
    if (!cat) return

    const contPrincipal = el('div')

    /* ── 1. SUBIDA DE LOGO PROPIO ── */
    const estadoLogo = el('div', { style: 'margin-top:8px' })

    function pintarEstadoLogo() {
      vaciar(estadoLogo)
      if (!st.logo) {
        const inputSubir = el('input', {
          type: 'file',
          accept: '.svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg',
          style: 'display:none',
          onchange: async ev => {
            const archivo = ev.target.files?.[0]
            if (!archivo) return
            vaciar(estadoLogo).append(el('p.apunte.chico', {}, 'Procesando archivo…'))

            const esRaster = archivo.type.includes('png') || archivo.type.includes('jpeg') || archivo.type.includes('jpg') || /\.(png|jpe?g)$/i.test(archivo.name)

            if (esRaster) {
              const reader = new FileReader()
              reader.onload = async () => {
                const base64Data = reader.result
                const inner = `<image href="${base64Data}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>`
                try {
                  const r = await api.subirLogo(st.cuentaId, {
                    viewBox: '0 0 100 100',
                    inner,
                    src: base64Data,
                    esRaster: true,
                    strokeWidth: 2,
                  })
                  st.logo = r.logo
                  st.coloresDelLogo = []
                  pintarEstadoLogo()
                  refrescarMuestra()
                  pintarSimbolos()
                } catch (e) {
                  vaciar(estadoLogo).append(aviso(e.message, 'malo'))
                }
              }
              reader.readAsDataURL(archivo)
            } else {
              const texto = await archivo.text()
              st.coloresDelLogo = coloresDeSVG(texto)
              let viewBox = texto.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1]
              if (!viewBox) {
                const w = parseFloat(texto.match(/\bwidth\s*=\s*["']([\d.]+)["']/i)?.[1] || '100')
                const h = parseFloat(texto.match(/\bheight\s*=\s*["']([\d.]+)["']/i)?.[1] || '100')
                viewBox = `0 0 ${w} ${h}`
              }
              const inner = texto.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '').trim()
              try {
                const r = await api.subirLogo(st.cuentaId, { viewBox, inner, strokeWidth: 8 })
                st.logo = r.logo
                pintarEstadoLogo()
                refrescarMuestra()
                pintarSimbolos()
                if (st.coloresDelLogo.length) pintar()
              } catch (e) {
                vaciar(estadoLogo).append(aviso(e.message, 'malo'))
              }
            }
          }
        })

        const btnSubir = el('button.btn.btn--outline.btn--mint.chico', {
          onclick: () => inputSubir.click()
        }, '📎 Subir archivo (.SVG o .PNG)')

        estadoLogo.append(
          inputSubir,
          el('div', { style: 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:6px' },
            btnSubir,
            el('span.apunte.chico', {}, 'Opcional. Si no tenés logo, tus placas se firman automáticamente con tus iniciales.')
          )
        )
      } else {
        const esRaster = Boolean(st.logo.esRaster || /<image\b/i.test(st.logo.inner || ''))
        const btnQuitar = el('button.btn.texto.chico', {
          style: 'color:var(--color-accent-3-deep);cursor:pointer;padding:4px 8px;font-size:12px;margin-left:auto',
          onclick: async () => {
            st.logo = null
            st.coloresDelLogo = []
            pintarEstadoLogo()
            refrescarMuestra()
            pintarSimbolos()
          }
        }, '✕ Quitar logo')

        const tarjeta = el('div', {
          style: 'display:flex;gap:14px;align-items:center;padding:10px 16px;background:var(--color-paper-2);border:1.5px solid var(--color-rule);border-radius:14px'
        },
          svgLogo(st.logo, 44),
          el('div', { style: 'flex:1' },
            el('b', { style: 'display:block;font-size:13px;' }, esRaster ? 'Logo PNG / JPG cargado' : 'Logo vectorial SVG cargado'),
            el('span.apunte.chico', {}, 'Reemplaza el monograma de iniciales y se aplica en todas tus placas.')
          ),
          btnQuitar
        )
        estadoLogo.append(tarjeta)
      }
    }
    pintarEstadoLogo()

    /* ── 2. PREVISUALIZADOR INTERACTIVO EN VIVO (ARRIBA) ── */
    const tarjetaPreview = el('div.firma-preview-card')

    function refrescarMuestra() {
      vaciar(tarjetaPreview).append(
        el('div', { style: 'display:flex;justify-content:space-between;align-items:center;' },
          el('span.rotulo', {}, 'Vista previa en vivo de tu firma'),
          el('span.apunte.chico', {}, st.logo ? '✓ Usando tu logo subido' : '✓ Usando monograma de autor')
        ),
        el('div.firma-preview-duo', {},
          el('div.firma-caja-muestra.clara', {}, renderMuestraFirma('clara')),
          el('div.firma-caja-muestra.oscura', {}, renderMuestraFirma('oscura'))
        )
      )
    }

    function renderMuestraFirma(tema = 'clara') {
      const nombre = st.negocio.nombre || 'Tu negocio'
      const partes = nombre.trim().split(/\s+/)
      const base = partes.length > 1 ? partes.slice(0, -1).join(' ') + ' ' : nombre
      const acc = partes.length > 1 ? partes[partes.length - 1] : ''
      const color = st.color || '#A83A1C'
      const fuente = (FUENTES_MUESTRA[st.tipografia] || ['Inter'])[0]

      const lf = (cat.fuentesLogotipo || []).find(f => f.id === st.logotipoFuente)
      const fuenteLogo = lf?.family || fuente
      const fuenteMono = lf?.monograma === false ? fuente : fuenteLogo
      if (lf?.importUrl && !document.querySelector(`link[href="${lf.importUrl}"]`)) {
        document.head.append(el('link', { rel: 'stylesheet', href: lf.importUrl }))
      }
      const ini = partes.length > 1
        ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
        : nombre.slice(0, 1).toUpperCase()

      const esOscuro = tema === 'oscura'
      const colorTexto = esOscuro ? '#FAF7F0' : '#14121F'

      // Caso especial: Sello circular de autor
      if (st.logotipoTipo === 'sello') {
        const idArco = `arco-sello-${tema}-${Date.now().toString(36)}`
        const idArcoInf = `arco-inf-${tema}-${Date.now().toString(36)}`
        const rubro = (st.negocio.rubro || 'EST. 2026').toUpperCase()
        const selloSvg = `
          <svg viewBox="0 0 100 100" width="70" height="70" style="overflow:visible">
            <defs>
              <path id="${idArco}" d="M 12,50 A 38,38 0 1,1 88,50" fill="none"/>
              <path id="${idArcoInf}" d="M 88,50 A 38,38 0 0,1 12,50" fill="none"/>
            </defs>
            <circle cx="50" cy="50" r="47" fill="none" stroke="${color}" stroke-width="2.2"/>
            <circle cx="50" cy="50" r="41" fill="none" stroke="${color}" stroke-width="0.8" stroke-dasharray="2.5,2.5"/>
            <circle cx="50" cy="50" r="23" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="1.2"/>
            <text x="50" y="57" text-anchor="middle" fill="${color}" font-family="'${fuenteMono}', sans-serif" font-weight="900" font-size="16" letter-spacing="-0.04em">${ini}</text>
            <text font-size="7.5" font-family="'${fuenteLogo}', sans-serif" font-weight="800" letter-spacing="0.12em" fill="${colorTexto}"><textPath href="#${idArco}" startOffset="50%" text-anchor="middle">${nombre.toUpperCase().slice(0, 20)}</textPath></text>
            <text font-size="6.5" font-family="var(--font-label, sans-serif)" font-weight="700" letter-spacing="0.16em" fill="${color}"><textPath href="#${idArcoInf}" startOffset="50%" text-anchor="middle">★ ${rubro.slice(0, 16)} ★</textPath></text>
          </svg>
        `
        const d = el('div', { style: 'display:flex;align-items:center;justify-content:center;padding:4px' })
        d.innerHTML = selloSvg
        return d
      }

      const conSimbolo = st.logotipoTipo !== 'palabra'
      const conNombre = st.logotipoTipo !== 'simbolo'
      const t = st.logotipoTratamiento

      // Símbolo o Logo
      let simHtml = ''
      if (conSimbolo) {
        if (st.logo) {
          simHtml = `<span style="display:inline-flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px">${svgLogo(st.logo, 38).outerHTML}</span>`
        } else {
          const e = st.logotipoEscudo
          const letras = e === 'barra' ? '' : e === 'letra' ? ini.slice(0, 1) : ini
          const cuerpo = (letras.length > 1 ? 16 : 21) * (e === 'letra' ? 1.5 : e === 'contorno' ? 0.92 : 1)
          const fondo = {
            circulo: `border-radius:50%;background:${color};color:#fff`,
            cuadrado: `border-radius:12px;background:${color};color:#fff`,
            contorno: `border-radius:50%;border:2px solid ${color};color:${color}`,
            letra: `color:${color}`,
            barra: `background:${color};border-radius:2px`,
          }[e] || `border-radius:50%;background:${color};color:#fff`
          const ancho = e === 'barra' ? 8 : 38
          simHtml = `<span style="display:inline-flex;align-items:center;justify-content:center;flex:none;width:${ancho}px;height:38px;font-weight:800;font-size:${cuerpo}px;letter-spacing:-.04em;font-family:'${fuenteMono}',sans-serif;${fondo}">${letras}</span>`
        }
      }

      // Nombre
      const estilos = {
        linea: `font-weight:500`,
        apilado: `display:flex;flex-direction:column;line-height:.92;letter-spacing:-.045em;font-size:24px`,
        filete: `font-size:24px;font-weight:600;letter-spacing:0`,
        caja: `font-weight:700`,
        pastilla: `font-weight:700`,
      }[t] || ''

      const accEstilo = {
        linea: `font-weight:800;color:${color}`,
        apilado: `font-weight:800;color:${color}`,
        filete: `font-weight:700;color:${color}`,
        caja: `font-weight:700;background:${color};color:#fff;padding:2px 8px;border-radius:4px;margin-left:4px`,
        pastilla: `font-weight:700;background:${color};color:#fff;padding:2px 8px;border-radius:4px;margin-left:4px`,
      }[t] || `color:${color}`

      const caps = lf?.caps ? 'text-transform:uppercase;' : ''
      const track = `letter-spacing:${lf?.tracking || '-.03em'};`
      const nomHtml = conNombre
        ? `<span style="font-family:'${fuenteLogo}',sans-serif;font-size:26px;font-weight:750;${track}${caps}color:${colorTexto};${estilos}">${base}${acc ? `<span style="${accEstilo}">${acc}</span>` : ''}</span>`
        : ''

      const bj = [st.negocio.rubro, st.negocio.ciudad].map(x => (x || '').trim()).filter(Boolean).join(' · ')
      const bajada = bj && conNombre
        ? `<span style="font-family:var(--font-label);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${esOscuro ? 'rgba(255,255,255,0.6)' : '#6B7176'};white-space:nowrap">${bj}</span>`
        : ''

      const filete = t === 'filete' && conNombre
        ? `<span style="grid-column:1/-1;width:34px;height:3px;background:${color};border-radius:2px"></span>`
        : ''

      const caja = t === 'filete' && conNombre
        ? `display:grid;grid-template-columns:auto auto;justify-content:start;align-items:center;gap:4px 10px`
        : `display:flex;align-items:center;gap:12px`

      const d = el('div', { style: `${caja};font-family:'${fuente}',sans-serif` })
      d.innerHTML = filete + simHtml + (nomHtml ? `<span style="display:flex;flex-direction:column;gap:3px;min-width:0">${nomHtml}${bajada}</span>` : '')
      return d
    }

    /* ── 3. SELECTORES SINTÉTICOS Y LIMPIOS ── */
    const dosPalabras = (st.negocio.nombre || '').trim().split(/\s+/).length > 1
    const tratamientos = cat.tratamientos.filter(t => !t.requiereDosPalabras || dosPalabras)

    // Grupo 1: Estructura
    const grupoTipos = el('div.opciones', { style: 'margin-bottom:18px' })
    const tiposLimpios = [
      { id: 'palabra-simbolo', label: 'Nombre y símbolo', desc: st.logo ? 'Tu nombre junto a tu logo subido.' : 'Tu nombre con monograma de iniciales.' },
      { id: 'palabra', label: 'Solo el nombre', desc: 'Firma tipografiada limpia y directa.' },
      { id: 'sello', label: 'Sello circular', desc: 'Emblema redondo de autor.' },
      { id: 'simbolo', label: 'Solo el logo', desc: st.logo ? 'Tu logo sin texto.' : null, soloConLogo: true },
    ]
    for (const t of tiposLimpios) {
      const deshabilitado = t.soloConLogo && !st.logo
      const desc = deshabilitado
        ? '↑ Subí tu logo primero para usar esta opción'
        : t.desc
      const b = el('button.opcion', {
        onclick: deshabilitado ? null : () => {
          st.logotipoTipo = t.id
          elegirEnGrupo(grupoTipos, b)
          pintarTratamientos()
          pintarSimbolos()
          refrescarMuestra()
        },
        disabled: deshabilitado || undefined,
        title: deshabilitado ? 'Subí un logo primero para habilitar esta opción' : '',
        style: deshabilitado ? 'opacity:0.45;cursor:not-allowed;pointer-events:none' : '',
      }, el('b', {}, t.label), el('span', { style: deshabilitado ? 'color:var(--color-accent-1);font-style:italic;font-size:12px' : '' }, desc))
      if (t.id === st.logotipoTipo && !deshabilitado) b.classList.add('elegida')
      grupoTipos.append(b)
    }

    // Grupo 2: Tratamiento del nombre
    const filaTratamientos = el('div')
    function pintarTratamientos() {
      vaciar(filaTratamientos)
      if (st.logotipoTipo === 'simbolo') return
      const grupo = el('div.opciones', { style: 'margin-bottom:18px' })
      const tratLimpios = [
        { id: 'linea', label: 'En una línea', desc: 'Nombre corrido con acento de color.' },
        { id: 'apilado', label: 'Apilado', desc: 'En dos renglones compactos con peso.' },
        { id: 'filete', label: 'Con filete', desc: 'Línea superior con el color de tu marca.' },
        { id: 'pastilla', label: 'En pastilla', desc: 'Recuadro suave de protección.' },
      ].filter(t => t.id !== 'apilado' || dosPalabras)

      for (const t of tratLimpios) {
        const b = el('button.opcion', {
          onclick: () => {
            st.logotipoTratamiento = t.id
            elegirEnGrupo(grupo, b)
            refrescarMuestra()
          },
        }, el('b', {}, t.label), el('span', {}, t.desc))
        if (t.id === st.logotipoTratamiento) b.classList.add('elegida')
        grupo.append(b)
      }
      filaTratamientos.append(
        el('label', { style: 'display:block;font-weight:700;font-size:.95rem;margin-bottom:8px' }, 'Formato del nombre'),
        grupo
      )
    }

    // Grupo 3: Símbolo de iniciales (solo si no subió logo propio)
    const filaSimbolos = el('div')
    function pintarSimbolos() {
      vaciar(filaSimbolos)
      if (st.logotipoTipo === 'palabra' || st.logo) return
      const grupo = el('div.opciones.dos', { style: 'margin-bottom:18px' })
      const escudosLimpios = [
        { id: 'circulo', label: 'Círculo pleno', desc: 'Iniciales sobre fondo redondo de color.' },
        { id: 'cuadrado', label: 'Pastilla cuadrada', desc: 'Iniciales en caja redondeada.' },
        { id: 'contorno', label: 'Contorno fino', desc: 'Borde de color sin relleno.' },
        { id: 'letra', label: 'Solo letras', desc: 'Iniciales limpias de autor.' },
      ]
      for (const e of escudosLimpios) {
        const b = el('button.opcion', {
          onclick: () => {
            st.logotipoEscudo = e.id
            elegirEnGrupo(grupo, b)
            refrescarMuestra()
          },
        }, el('b', {}, e.label), el('span', {}, e.desc))
        if (e.id === st.logotipoEscudo) b.classList.add('elegida')
        grupo.append(b)
      }
      filaSimbolos.append(
        el('label', { style: 'display:block;font-weight:700;font-size:.95rem;margin-bottom:8px' }, 'Símbolo de iniciales'),
        grupo
      )
    }

    pintarTratamientos()
    pintarSimbolos()
    refrescarMuestra()

    contPrincipal.append(
      tarjetaPreview,
      el('label', { style: 'display:block;font-weight:700;font-size:.95rem;margin-bottom:8px' }, 'Estructura de la firma'),
      grupoTipos,
      filaTratamientos,
      filaSimbolos,
      el('div', { style: 'margin-top:14px;padding-top:14px;border-top:1px solid var(--color-rule)' },
        el('label', { style: 'display:block;font-weight:700;font-size:.95rem;margin-bottom:4px' }, '¿Tenés tu propio archivo de logo?'),
        estadoLogo
      )
    )

    bloque(cont, 'Firma y membrete de tus placas', 'Cómo se estampa tu marca al pie y en el encabezado de cada publicación.', contPrincipal)
  }

  /* ── 4. listo ──────────────────────────────────────────── */

  async function pasoListo(panel) {
    panel.append(
      el('span.rotulo', {}, 'Paso 4 de 4'),
      el('h2', {}, 'Cómo se acomoda el texto'),
      el('p.intro', {}, 'Tu color y tu logo ya distinguen tus placas de las de otro negocio. La disposición las termina de separar: es cómo se ordena el texto adentro. Elegí la que te represente y mirá el cambio en la placa de al lado.')
    )

    const lienzo = el('div.lienzo')
    const marco = el('iframe', {
      width: 1080, height: 1350, scrolling: 'no',
    })
    lienzo.append(marco)

    const previewBox = el('div.disposicion-preview-card', {},
      el('span.rotulo', { style: 'margin-bottom:2px' }, 'Vista previa en tiempo real'),
      lienzo
    )

    const opciones = el('div.opciones', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px' })
    const errorVista = el('div', { style: 'margin-top:14px' })

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
        marco.srcdoc = await api.previsualizar(st.cuentaId, {
          canal: 'feed',
          placa: placaDeMuestra,
          marcaTemporal: {
            color: st.color,
            tipografia: st.tipografia,
            disposicion: st.disposicion,
            logotipoTipo: st.logotipoTipo,
            logotipoTratamiento: st.logotipoTratamiento,
            logotipoEscudo: st.logotipoEscudo,
            logotipoFuente: st.logotipoFuente,
            logo: st.logo,
          },
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

    const gridCont = el('div.paso-disposicion-grid', {}, previewBox, opciones)

    const acciones = el('div.acciones-paso', { style: 'margin-top:28px;padding-top:20px;border-top:1px solid var(--color-rule)' })
    const listo = el('button.btn', {
      onclick: async () => {
        listo.disabled = true
        listo.textContent = 'Guardando…'
        try {
          await api.guardarMarca(st.cuentaId, { disposicion: st.disposicion })
          if (st.modoEdicion) {
            st.subModuloActivo = null
            st.mensajeExito = '✓ Disposición guardada con éxito.'
            pintar()
          } else {
            alTerminar()
          }
        } catch (e) {
          vaciar(errorVista).append(aviso(e.message, 'malo'))
          listo.disabled = false
          listo.textContent = 'Empezar a publicar'
        }
      },
    }, st.modoEdicion ? 'Guardar disposición ➔' : 'Empezar a publicar ➔')

    const fnVolver = st.modoEdicion
      ? () => { st.subModuloActivo = null; pintar() }
      : () => ir(2)
    const btnVolver = el('button.btn.btn--outline.btn--mint', { onclick: fnVolver },
      st.modoEdicion ? '← Volver a opciones' : '← Volver a identidad')
    acciones.append(listo, btnVolver)

    panel.append(gridCont, errorVista, acciones)
    refrescar()
  }

  pintar()
}
