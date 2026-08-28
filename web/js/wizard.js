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
    logotipoTipo: 'palabra-simbolo',
    logotipoTratamiento: 'linea',
    logotipoEscudo: 'circulo',
    logotipoFuente: 'mismo',
    sugerencia: null,
    paso: 0,
  }

  function pintar() {
    vaciar(contenedor)

    const pasosConfig = [
      { id: '01 NEGOCIO', dot: 'process__dot--mint' },
      { id: '02 QUÉ TENÉS', dot: 'process__dot--cyan' },
      { id: '03 IDENTIDAD', dot: 'process__dot--pear' },
      { id: '04 LISTO', dot: 'process__dot--coral' },
    ]

    const processStrip = el('div.process')
    pasosConfig.forEach((p, idx) => {
      const step = el('div.process__step', {
        class: idx === st.paso ? 'is-active' : ''
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

    seccionLogo(secciones)
    seccionColor(secciones)
    seccionTipografia(secciones)
    seccionLogotipo(secciones)

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

  function mostrarLogoCargado(destino, logo) {
    const esRaster = Boolean(logo.esRaster || /<image\b/i.test(logo.inner || ''))

    const btnQuitar = el('button.btn.texto.chico', {
      style: 'color:var(--malo, #c0392b);cursor:pointer;padding:4px 8px;font-size:12px;margin-left:auto',
      onclick: async () => {
        st.logo = null
        st.coloresDelLogo = []
        vaciar(destino).append(el('p.apunte.chico', { style: 'color:var(--tinta-suave,#666);margin-top:6px' }, 'Logo quitado. Tus placas usarán la firma tipográfica de autor configurada abajo.'))
      }
    }, '✕ Quitar logo subido')

    const tarjeta = el('div', {
      style: 'display:flex;gap:14px;align-items:center;margin-top:8px;padding:10px 14px;background:#F9FBFB;border:1px solid var(--borde,#ddd);border-radius:8px'
    },
      svgLogo(logo, 52),
      el('div', { style: 'flex:1' },
        el('b', { style: 'display:block;font-size:13px;color:var(--tinta,#111)' }, esRaster ? 'Imagen raster cargada (.PNG / .JPG)' : 'Vector cargado (.SVG)'),
        el('span.apunte.chico', {}, esRaster
          ? 'Ubicado arriba a la izquierda con pastilla protectora de contraste.'
          : 'Dibujado en un solo color para máxima nitidez en fondos claros y oscuros.'
        )
      ),
      btnQuitar
    )

    const avisoRaster = esRaster
      ? el('div.aviso', { style: 'margin-top:8px;font-size:12px;background:#FFF9E6;border-color:#F5D061;color:#7A5E0B' },
          '⚠️ Al no ser un vector (.SVG), puede perder nitidez o no contrastar bien en algunos fondos. Si no te gusta cómo queda en las placas, podés quitarlo arriba y usar únicamente la firma tipográfica de autor abajo.')
      : null

    const avisoColores = st.coloresDelLogo.length
      ? el('p.apunte.chico', { style: 'margin-top:8px' },
          `Encontramos ${st.coloresDelLogo.length} color(es) en el archivo. Están abajo, en la pestaña «Del logo que subiste».`)
      : null

    vaciar(destino).append(tarjeta, avisoRaster, avisoColores)
  }

  function seccionLogo(cont) {
    const estado = el('div', { style: 'margin-top:10px' })
    if (st.logo) mostrarLogoCargado(estado, st.logo)

    const entrada = el('input', {
      type: 'file',
      accept: '.svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg',
      onchange: async ev => {
        const archivo = ev.target.files?.[0]
        if (!archivo) return
        vaciar(estado)

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
              mostrarLogoCargado(estado, r.logo)
            } catch (e) {
              vaciar(estado).append(aviso(e.message, 'malo'))
            }
          }
          reader.readAsDataURL(archivo)
        } else {
          const texto = await archivo.text()
          st.coloresDelLogo = coloresDeSVG(texto)
          
          // Extraer viewBox robusto (comillas dobles o simples)
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
            if (st.coloresDelLogo.length) pintar()
            else mostrarLogoCargado(estado, r.logo)
          } catch (e) {
            vaciar(estado).append(aviso(e.message, 'malo'))
          }
        }
      },
    })

    bloque(cont, 'Logo de tu negocio (Opcional)', 'Si tenés un logo propio lo ubicamos arriba a la izquierda de tus placas. Si no tenés o preferís no subirlo, tus piezas se firman con la identidad tipográfica configurada abajo.', entrada, estado)
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

  function seccionLogotipo(cont) {
    const cat = catalogo.logotipos
    if (!cat) return

    const dosPalabras = (st.negocio.nombre || '').trim().split(/\s+/).length > 1
    const tratamientos = cat.tratamientos.filter(t => !t.requiereDosPalabras || dosPalabras)

    const cont2 = el('div')
    const filaTratamientos = el('div')

    function pintarTratamientos() {
      vaciar(filaTratamientos)
      if (st.logotipoTipo === 'simbolo') return
      const grupo = el('div.opciones')
      for (const t of tratamientos) {
        const b = el('button.opcion', {
          onclick: () => { st.logotipoTratamiento = t.id; elegirEnGrupo(grupo, b); refrescarMuestra() },
        }, el('b', {}, t.label), el('span', {}, t.descripcion))
        if (t.id === st.logotipoTratamiento) b.classList.add('elegida')
        grupo.append(b)
      }
      filaTratamientos.append(
        el('label', { style: 'display:block;font-weight:600;font-size:.92rem;margin:22px 0 8px' }, 'Cómo se resuelve el nombre'),
        grupo
      )
    }

    const filaFuentes = el('div')

    function pintarFuentes() {
      vaciar(filaFuentes)
      if (st.logotipoTipo === 'simbolo') return
      const grupo = el('div.opciones.dos')
      for (const f of cat.fuentesLogotipo || []) {
        const b = el('button.opcion', {
          onclick: () => { st.logotipoFuente = f.id; elegirEnGrupo(grupo, b); refrescarMuestra() },
        }, el('b', {}, f.label), el('span', {}, f.vibe))
        if (f.id === st.logotipoFuente) b.classList.add('elegida')
        grupo.append(b)
      }
      filaFuentes.append(
        el('label', { style: 'display:block;font-weight:600;font-size:.92rem;margin:22px 0 8px' }, 'Con qué letra se escribe tu nombre'),
        grupo
      )
    }

    const filaSimbolos = el('div')

    function pintarSimbolos() {
      vaciar(filaSimbolos)
      if (st.logotipoTipo === 'palabra' || st.logo) return
      const grupo = el('div.opciones.dos')
      for (const e of cat.escudos) {
        const b = el('button.opcion', {
          onclick: () => { st.logotipoEscudo = e.id; elegirEnGrupo(grupo, b); refrescarMuestra() },
        }, el('b', {}, e.label), el('span', {}, e.descripcion))
        if (e.id === st.logotipoEscudo) b.classList.add('elegida')
        grupo.append(b)
      }
      filaSimbolos.append(
        el('label', { style: 'display:block;font-weight:600;font-size:.92rem;margin:22px 0 8px' }, 'Cómo se resuelve el símbolo'),
        grupo
      )
    }

    const grupoTipos = el('div.opciones')
    for (const t of cat.tipos) {
      const b = el('button.opcion', {
        onclick: () => { st.logotipoTipo = t.id; elegirEnGrupo(grupoTipos, b); pintarTratamientos(); pintarSimbolos(); pintarFuentes(); refrescarMuestra() },
      }, el('b', {}, t.label), el('span', {}, t.descripcion))
      if (t.id === st.logotipoTipo) b.classList.add('elegida')
      grupoTipos.append(b)
    }

    const muestra = el('div', { style: 'margin-top:20px' })
    function refrescarMuestra() {
      vaciar(muestra).append(
        el('span.rotulo', { style: 'display:block;margin-bottom:8px' }, 'Así firma tus placas'),
        el('div', { style: 'border:1px solid var(--linea-fuerte);border-radius:var(--r);background:#fff;padding:20px 22px' },
          muestraLogotipo())
      )
    }

    function muestraLogotipo() {
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

      const conSimbolo = st.logotipoTipo !== 'palabra'
      const conNombre = st.logotipoTipo !== 'simbolo'
      const t = st.logotipoTratamiento

      const e = st.logotipoEscudo
      const letras = e === 'barra' ? '' : e === 'letra' ? ini.slice(0, 1) : ini
      const cuerpo = (letras.length > 1 ? 16 : 21) * (e === 'letra' ? 1.5 : e === 'contorno' ? 0.92 : 1)
      const fondo = {
        circulo: `border-radius:50%;background:${color};color:#fff`,
        cuadrado: `border-radius:16%;background:${color};color:#fff`,
        contorno: `border-radius:50%;border:2.5px solid ${color};color:${color}`,
        letra: `color:${color}`,
        barra: `background:${color};border-radius:2px`,
      }[e] || `border-radius:50%;background:${color};color:#fff`
      const ancho = e === 'barra' ? 10 : 40
      const sim = conSimbolo
        ? `<span style="display:inline-flex;align-items:center;justify-content:center;flex:none;width:${ancho}px;height:40px;font-weight:700;font-size:${cuerpo}px;letter-spacing:-.04em;font-family:'${fuenteMono}',sans-serif;${fondo}">${letras}</span>`
        : ''

      const estilos = {
        linea: `font-weight:400`,
        apilado: `display:flex;flex-direction:column;line-height:.92;letter-spacing:-.045em;font-size:26px`,
        filete: `font-size:27px;font-weight:500;letter-spacing:0`,
        caja: `font-weight:700`,
        empastillado: `font-weight:700`,
      }[t] || ''
      const accEstilo = {
        linea: `font-weight:800;color:${color}`,
        apilado: `font-weight:800;color:${color}`,
        filete: `font-weight:700;color:${color}`,
        caja: `font-weight:700;background:${color};color:#fff;padding:2px 10px;border-radius:3px;margin-left:6px`,
        empastillado: `font-weight:700;background:${color};color:#fff;padding:2px 10px;border-radius:3px;margin-left:6px`,
      }[t] || `color:${color}`

      const caps = lf?.caps ? 'text-transform:uppercase;' : ''
      const track = `letter-spacing:${lf?.tracking || '-.03em'};`
      const nom = conNombre
        ? `<span style="font-family:'${fuenteLogo}',sans-serif;font-size:31px;font-weight:700;${track}${caps}color:#14121F;${estilos}">${base}${acc ? `<span style="${accEstilo}">${acc}</span>` : ''}</span>`
        : ''

      const bj = [st.negocio.rubro, st.negocio.ciudad].map(x => (x || '').trim()).filter(Boolean).join(' · ')
      const bajada = bj && conNombre
        ? `<span style="font-family:ui-monospace,monospace;font-size:11px;font-weight:600;letter-spacing:.19em;text-transform:uppercase;color:#6B7176;white-space:nowrap">${bj}</span>`
        : ''

      const filete = t === 'filete' && conNombre
        ? `<span style="grid-column:1/-1;width:38px;height:3px;background:${color};border-radius:2px"></span>`
        : ''

      const caja = t === 'filete' && conNombre
        ? `display:grid;grid-template-columns:auto auto;justify-content:start;align-items:center;gap:6px 11px`
        : `display:flex;align-items:center;gap:13px`

      const d = el('div', { style: `${caja};font-family:'${fuente}',sans-serif` })
      d.innerHTML = filete + sim + (nom
        ? `<span style="display:flex;flex-direction:column;gap:4px;min-width:0">${nom}${bajada}</span>`
        : '')
      return d
    }

    pintarTratamientos()
    pintarSimbolos()
    pintarFuentes()
    refrescarMuestra()
    cont2.append(grupoTipos, filaFuentes, filaTratamientos, filaSimbolos, muestra)

    bloque(cont, 'Tu logo', 'Un logo es tu nombre bien resuelto, no un icono de catálogo. Si no subiste uno propio, el símbolo se arma con tus iniciales — así es tuyo y nadie más lo tiene.', cont2)
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
