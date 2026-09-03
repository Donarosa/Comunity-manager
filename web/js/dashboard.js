// Dashboard y Pantalla de Inicio del Usuario.
// Divide la vista de Inicio (resumen, métricas destacadas y marca) del Dashboard de Placas (galería, planes y actividad).

import { api } from './api.js'
import { el, vaciar, aviso } from './ui.js'
import { obtenerUsuario, cerrarSesion } from './auth.js'

/**
 * Vista de Inicio (Home):
 * Muestra el perfil, métricas de ahorro destacadas (10 USD/placa), cuota,
 * identidad de marca y accesos directos, con CTA al Dashboard de Placas (sin mostrar las imágenes acá).
 */
export async function iniciarHome({
  contenedor,
  cuentaId,
  catalogo,
  onAbrirEditor,
  onAbrirWizard,
  onAbrirPlan,
  onAbrirDashboard,
  alCerrarSesion,
}) {
  vaciar(contenedor)
  contenedor.append(el('div.cargando-txt', {}, 'Cargando tu espacio...'))

  try {
    const data = await api.dashboard(cuentaId)
    renderizarHome({
      contenedor,
      data,
      catalogo,
      onAbrirEditor,
      onAbrirWizard,
      onAbrirPlan,
      onAbrirDashboard,
      alCerrarSesion,
    })
  } catch (err) {
    vaciar(contenedor).append(
      aviso(`Error cargando inicio: ${err.message}`, 'malo'),
      el('button.btn.fantasma', {
        style: 'margin-top:14px',
        onclick: () => iniciarHome({ contenedor, cuentaId, catalogo, onAbrirEditor, onAbrirWizard, onAbrirPlan, onAbrirDashboard, alCerrarSesion }),
      }, 'Reintentar')
    )
  }
}

function renderizarHome({
  contenedor,
  data,
  catalogo,
  onAbrirEditor,
  onAbrirWizard,
  onAbrirPlan,
  onAbrirDashboard,
  alCerrarSesion,
}) {
  vaciar(contenedor)
  const { cuenta, marca, estado, publicaciones = [], planes = [], estadisticas = [], resumenMetricas } = data
  const usuarioAuth = obtenerUsuario()

  const panel = el('div.dashboard-usuario')
  contenedor.append(panel)

  /* ── 1. Cabecera de Usuario ── */
  const avatarUrl = cuenta.foto || usuarioAuth?.foto ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cuenta.nombre || 'Usuario')}&backgroundColor=A83A1C&textColor=FAF7F0`

  const cabecera = el('div.dash-header', {},
    el('div.dash-usuario-info', {},
      el('img.dash-avatar', { src: avatarUrl, alt: cuenta.nombre }),
      el('div', {},
        el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;' },
          el('h1', { style: 'font-size:1.65rem;margin:0;font-weight:800;' }, marca?.nombre || cuenta.nombre),
          el('span.badge-estado', {}, `Plan ${cuenta.plan || 'Único'}`)
        ),
        el('p.apunte', { style: 'margin:2px 0 0;' },
          cuenta.email || 'Usuario registrado',
          marca ? ` · ${marca.handle || ''}` : ''
        )
      )
    ),
    el('div.dash-acciones-top', {},
      el('button.btn.fantasma.chico', {
        onclick: async () => {
          if (confirm('¿Deseás cerrar la sesión actual?')) {
            await cerrarSesion()
            alCerrarSesion()
          }
        },
      }, 'Cerrar sesión')
    )
  )

  /* ── 2. Tarjetas de Métricas e Interacciones ── */
  const valorObj = estado?.valor
  const ahorroTxt = valorObj
    ? (valorObj.referencia?.simbolo || 'US$') + Math.round(valorObj.equivalenteTotal || 0).toLocaleString('es-AR')
    : 'US$0'

  const totalPubs = resumenMetricas?.totalPublicaciones || publicaciones.length || 0
  const placasMes = resumenMetricas?.placasEsteMes || 0

  // Tarjeta Publicaciones con contador
  const cardPublicaciones = el('div.dash-metrica-card.dash-metrica-card--pubs', {},
    el('span.rotulo', {}, 'Publicaciones'),
    el('strong.dash-metrica-cifra', {}, String(totalPubs)),
    el('span.apunte.chico', {}, `${placasMes} placas generadas este mes`),
    el('button.btn.chico.btn--outline', {
      style: 'margin-top:8px;width:100%;font-size:0.82rem;padding:6px 10px;text-align:center;justify-content:center;',
      onclick: () => onAbrirDashboard('pubs'),
    }, 'Ver mis placas →')
  )

  // Tarjeta Ahorro total DESTACADA a 10 USD/placa
  const cardAhorro = el('div.dash-metrica-card.dash-metrica-card--ahorro', {},
    // Una sola píldora arriba. Eran dos y decían lo mismo: "US$10 / placa"
    // arriba y la aclaración completa abajo, con "vs diseñador" en el medio.
    // La que importa es contra qué se compara; el precio ya está en la línea
    // de abajo.
    el('div.dash-metrica-topbar', {},
      el('span.rotulo', { style: 'color:#15803d;font-weight:700;' }, 'Ahorro total'),
      el('span.chip-ahorro-destacado', {}, '✨ vs diseñador')
    ),
    el('div.dash-metrica-cifra-fila', {},
      el('strong.dash-metrica-cifra.dash-metrica-cifra--ahorro', {}, ahorroTxt)
    ),
    el('span.apunte.chico.ahorro-aclaracion', {},
      valorObj?.texto?.aclaracion || 'a US$10 la placa — lo que cobra un diseñador por una placa suelta'
    )
  )

  const metricasGrid = el('div.dash-metricas-grid', {},
    cardPublicaciones,
    cardAhorro,
    tarjetaCuota(estado)
  )

  /* ── 3. Panel de Identidad de Marca ── */
  const panelMarca = el('div.dash-marca-box', {})
  if (marca && marca.colors?.flat) {
    const C = marca.colors.flat

    // La tarjeta toma la identidad y colores de la marca
    panelMarca.style.backgroundColor = C.bg || '#ffffff'
    panelMarca.style.borderColor = C.accent ? `${C.accent}40` : 'var(--color-rule)'
    panelMarca.style.borderLeft = C.accent ? `6px solid ${C.accent}` : '1.5px solid var(--color-rule)'
    panelMarca.style.boxShadow = C.accent ? `0 4px 20px ${C.accent}15` : 'var(--shadow-card)'

    const rotuloMarca = el('span.rotulo', {
      style: C.accent ? `background: ${C.accent}18; color: ${C.accentDeep || C.accent}; border: 1px solid ${C.accent}35;` : ''
    }, 'Identidad de Marca')

    // Título con tipografía y color de la marca
    const nombreMarcaEl = el('h3', {
      style: `margin: 6px 0 3px; font-size: 1.35rem; font-weight: 800; color: ${C.darkBg || C.ink || 'inherit'};`
    })

    if (marca.wordmark?.base && marca.wordmark?.accent) {
      nombreMarcaEl.append(
        el('span', {}, marca.wordmark.base + ' '),
        el('span', { style: `color: ${C.accent};` }, marca.wordmark.accent)
      )
    } else {
      nombreMarcaEl.textContent = marca.nombre
    }

    const infoDetalle = el('p.apunte.chico', {
      style: `color: ${C.muted || 'var(--color-muted)'}; margin: 0;`
    }, `${marca.handle || '@tu_marca'} · Tipografía: ${marca.fonts?.preset || 'Seriedad'}`)

    const btnEditar = el('button.btn.fantasma.chico', {
      style: C.accent ? `color: ${C.accentDeep || C.accent}; border-color: ${C.accent}55; background: #ffffff; font-weight: 600;` : '',
      onclick: onAbrirWizard
    }, 'Editar marca')

    // Isotipo / logo preview si existe
    let logoPreview = null
    if (marca.logo?.inner) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', marca.logo.viewBox || '0 0 100 100')
      svg.setAttribute('width', '36')
      svg.setAttribute('height', '36')
      svg.style.color = C.accent || C.darkBg || 'currentColor'
      svg.style.stroke = 'currentColor'
      svg.style.fill = 'none'
      svg.style.strokeWidth = String(marca.logo.strokeWidth || 6)
      svg.style.strokeLinecap = 'round'
      svg.style.strokeLinejoin = 'round'
      svg.innerHTML = marca.logo.inner

      logoPreview = el('div.dash-marca-logo-thumb', {
        style: `width:44px;height:44px;border-radius:12px;background:#ffffff;border:1px solid ${C.accent}30;display:flex;align-items:center;justify-content:center;padding:4px;flex-shrink:0;box-shadow:0 2px 8px ${C.accent}12;`
      }, svg)
    }

    const infoIzquierda = el('div', { style: 'display:flex;align-items:center;gap:14px;' },
      logoPreview,
      el('div', {},
        rotuloMarca,
        nombreMarcaEl,
        infoDetalle
      )
    )

    const paleta = el('div.dash-paleta-preview', {
      style: `border-top: 1px solid ${C.hair || (C.accent + '25')};`
    },
      colorBadge('Fondo claro', C.bg, `background:#ffffff; border-color:${C.accent}30; color:${C.ink || 'inherit'};`),
      colorBadge('Fondo oscuro', C.darkBg, `background:#ffffff; border-color:${C.accent}30; color:${C.ink || 'inherit'};`),
      colorBadge('Acento', C.accent, `background:#ffffff; border-color:${C.accent}30; color:${C.ink || 'inherit'};`)
    )

    panelMarca.append(
      el('div.dash-marca-cabecera', {},
        infoIzquierda,
        btnEditar
      ),
      paleta
    )
  } else if (marca) {
    panelMarca.append(
      el('div.dash-marca-cabecera', {},
        el('div', {},
          el('span.rotulo', {}, 'Identidad de Marca'),
          el('h3', { style: 'margin:4px 0;' }, marca.nombre),
          el('p.apunte.chico', {}, `${marca.handle || '@tu_marca'} · Tipografía: ${marca.fonts?.preset || 'Seriedad'}`)
        ),
        el('button.btn.fantasma.chico', { onclick: onAbrirWizard }, 'Editar marca')
      )
    )
  } else {
    panelMarca.append(
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;' },
        el('div', {},
          el('span.rotulo', {}, 'Identidad de Marca'),
          el('h3', { style: 'margin:4px 0;' }, 'Todavía no configuraste tu marca'),
          el('p.apunte.chico', {}, 'Definí tus colores, tipografía y logo para que las placas salgan con tu estética.')
        ),
        el('button.btn.chico', { onclick: onAbrirWizard }, 'Armar mi marca')
      )
    )
  }

  /* ── 4. Pestañas y CTA a Dashboard en Home ── */
  const pestaniasHome = el('div.dash-tabs-home-wrap', {},
    el('div.dash-tabs', {},
      el('button.dash-tab-btn.activo', { onclick: () => onAbrirDashboard('pubs') }, `Mis Placas (${publicaciones.length})`),
      el('button.dash-tab-btn', { onclick: () => onAbrirDashboard('stats') }, `Actividad (${estadisticas.length})`)
    ),
    el('button.btn.chico.btn--mint.dash-cta-btn', {
      onclick: () => onAbrirDashboard('pubs'),
    }, '🖼 Ver mis placas →')
  )

  /* ── 5. Acciones directas (Dock flotante sin botón de dashboard duplicado) ── */
  const barraAcciones = marca
    ? el('div.dock-acciones', {},
        el('button.btn', { onclick: onAbrirEditor }, '✎ Escribir yo'),
        el('button.btn.cyan', { onclick: onAbrirPlan }, '✨ Sugerime'))
    : el('div.dock-acciones', {},
        el('button.btn', { onclick: onAbrirWizard }, 'Armar mi marca para empezar'))

  panel.append(
    cabecera,
    metricasGrid,
    panelMarca,
    pestaniasHome,
    barraAcciones
  )
}

/**
 * Vista de Dashboard de Placas:
 * Apartado dedicado para ver todas las placas, planes de contenido y actividad.
 */
export async function iniciarDashboard({
  contenedor,
  cuentaId,
  catalogo,
  onAbrirEditor,
  onAbrirWizard,
  onAbrirPlan,
  onVolverHome,
  alCerrarSesion,
  tabInicial = 'pubs',
}) {
  vaciar(contenedor)
  contenedor.append(el('div.cargando-txt', {}, 'Cargando tus placas y contenido...'))

  try {
    const data = await api.dashboard(cuentaId)
    renderizarDashboardView({
      contenedor,
      data,
      catalogo,
      onAbrirEditor,
      onAbrirWizard,
      onAbrirPlan,
      onVolverHome,
      alCerrarSesion,
      tabInicial,
    })
  } catch (err) {
    vaciar(contenedor).append(
      aviso(`Error cargando dashboard: ${err.message}`, 'malo'),
      el('button.btn.fantasma', {
        style: 'margin-top:14px',
        onclick: () => iniciarDashboard({ contenedor, cuentaId, catalogo, onAbrirEditor, onAbrirWizard, onAbrirPlan, onVolverHome, alCerrarSesion, tabInicial }),
      }, 'Reintentar')
    )
  }
}

function renderizarDashboardView({
  contenedor,
  data,
  catalogo,
  onAbrirEditor,
  onAbrirWizard,
  onAbrirPlan,
  onVolverHome,
  alCerrarSesion,
  tabInicial = 'pubs',
}) {
  vaciar(contenedor)
  const { cuenta, marca, estado, publicaciones = [], planes = [], estadisticas = [] } = data

  const panel = el('div.dashboard-usuario.dashboard-galeria')
  contenedor.append(panel)

  /* ── Cabecera del Dashboard ── */
  const cabeceraDash = el('div.dash-header', {},
    el('div', {},
      el('div', { style: 'display:flex;align-items:center;gap:10px;' },
        onVolverHome ? el('button.btn.fantasma.chico', { onclick: onVolverHome, style: 'padding:4px 10px;font-size:0.85rem;' }, '← Volver al Inicio') : null,
        el('h1', { style: 'font-size:1.6rem;margin:0;font-weight:800;' }, 'Dashboard de Placas')
      ),
      el('p.apunte', { style: 'margin:4px 0 0;' },
        `${publicaciones.length} publicaciones · ${marca?.nombre || cuenta.nombre}`
      )
    ),
    el('div.dash-acciones-top', { style: 'display:flex;gap:8px;' },
      el('button.btn.chico', { onclick: onAbrirEditor }, '+ Nueva placa'),
      el('button.btn.cyan.chico', { onclick: onAbrirPlan }, '✨ Sugerir')
    )
  )

  /* ── Pestañas: Publicaciones, Actividad ── */
  const pestanias = el('div.dash-tabs', {})
  const tabPubs = el('button.dash-tab-btn' + (tabInicial === 'pubs' ? '.activo' : ''), {}, `Mis Placas (${publicaciones.length})`)
  const tabStats = el('button.dash-tab-btn' + (tabInicial === 'stats' ? '.activo' : ''), {}, `Actividad (${estadisticas.length})`)
  pestanias.append(tabPubs, tabStats)

  const cuerpoTab = el('div.dash-tab-cuerpo', { style: 'margin-top:16px;' })

  function renderPublicaciones(filtro = 'todos') {
    vaciar(cuerpoTab)

    const pubsFiltradas = filtro === 'todos'
      ? publicaciones
      : publicaciones.filter(p => p.tipo === filtro)

    const filtrosBar = el('div.dash-filtros-bar', {},
      el('button.filtro-chip' + (filtro === 'todos' ? '.activo' : ''), { onclick: () => renderPublicaciones('todos') }, 'Todas'),
      el('button.filtro-chip' + (filtro === 'feed' ? '.activo' : ''), { onclick: () => renderPublicaciones('feed') }, 'Feed'),
      el('button.filtro-chip' + (filtro === 'historia' ? '.activo' : ''), { onclick: () => renderPublicaciones('historia') }, 'Historias'),
      el('button.filtro-chip' + (filtro === 'carrusel' ? '.activo' : ''), { onclick: () => renderPublicaciones('carrusel') }, 'Carruseles')
    )

    cuerpoTab.append(filtrosBar)

    if (pubsFiltradas.length === 0) {
      cuerpoTab.append(
        el('div.dash-vacio', {},
          el('h4', {}, 'No hay publicaciones en esta categoría todavía.'),
          el('p.apunte', { style: 'margin:6px 0 16px;' }, 'Creá tu primera placa con tus colores y tu logo listos para Instagram.'),
          el('button.btn.chico', { onclick: onAbrirEditor }, 'Crear una placa ahora')
        )
      )
      return
    }

    const grilla = el('div.dash-galeria-grid', {})
    for (const p of pubsFiltradas) {
      grilla.append(tarjetaPublicacion(p, cuenta.id))
    }
    cuerpoTab.append(grilla)
  }

  function renderActividad() {
    vaciar(cuerpoTab)
    if (estadisticas.length === 0) {
      cuerpoTab.append(el('p.apunte', { style: 'padding:20px 0;' }, 'No hay actividad registrada recientemente.'))
      return
    }

    const lista = el('ul.lista-actividad', {})
    for (const ev of estadisticas) {
      const fecha = ev.fecha ? new Date(ev.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : ''
      const detalle = describirMetadata(ev.metadata)
      lista.append(
        el('li.item-actividad', {},
          el('span.fecha-actividad', {}, fecha),
          el('strong', {}, formatearEvento(ev.evento)),
          detalle ? el('span.meta-actividad', {}, detalle) : null
        )
      )
    }
    cuerpoTab.append(lista)
  }

  // Eventos de tabs
  tabPubs.onclick = () => {
    activarTab(tabPubs)
    renderPublicaciones('todos')
  }
  tabStats.onclick = () => {
    activarTab(tabStats)
    renderActividad()
  }

  function activarTab(btnActivo) {
    [tabPubs, tabStats].forEach(b => b.classList.remove('activo'))
    btnActivo.classList.add('activo')
  }

  panel.append(
    cabeceraDash,
    pestanias,
    cuerpoTab
  )

  if (tabInicial === 'stats') {
    activarTab(tabStats)
    renderActividad()
  } else {
    activarTab(tabPubs)
    renderPublicaciones('todos')
  }
}

function tarjetaMetrica(titulo, valor, detalle) {
  return el('div.dash-metrica-card', {},
    el('span.rotulo', {}, titulo),
    el('strong.dash-metrica-cifra', {}, valor),
    el('span.apunte.chico', {}, detalle)
  )
}

/**
 * La cuota, con una barra por escala.
 *
 * Hay dos topes que corren en paralelo —el del mes y el del día— y el que
 * manda es el que se llena primero. Con un solo número no se veía: podían
 * quedar cien piezas en el mes y ninguna hoy.
 */
function tarjetaCuota(estado) {
  const limites = estado?.plan?.limites || {}
  const usado = estado?.usado || {}

  const barra = (etiqueta, gastado, tope) => {
    if (!tope) return null
    const proporcion = Math.min(1, gastado / tope)
    const quedan = Math.max(0, tope - gastado)
    // Rojo cuando queda menos de una placa de cada diez; ámbar bajo un cuarto.
    const estadoBarra = quedan / tope <= 0.1 ? ' agotada' : quedan / tope <= 0.25 ? ' justa' : ''
    return el('div.cuota-linea', {},
      el('div.cuota-cab', {},
        el('span', {}, etiqueta),
        el('b', {}, `${quedan} de ${tope}`)),
      el('div.cuota-riel', {
        role: 'progressbar',
        'aria-valuenow': String(quedan),
        'aria-valuemin': '0',
        'aria-valuemax': String(tope),
        'aria-label': `${etiqueta}: quedan ${quedan} de ${tope} placas`,
      }, el(`span.cuota-relleno${estadoBarra}`, { style: `width:${Math.round(proporcion * 100)}%` }))
    )
  }

  return el('div.dash-metrica-card.dash-metrica-card--cuota', {},
    el('span.rotulo', {}, 'Placas que te quedan'),
    el('div.cuota-barras', {},
      barra('Este mes', usado.mes?.piezas || 0, limites.piezasMes),
      barra('Hoy', usado.dia?.piezas || 0, limites.piezasDia))
  )
}

function colorBadge(etiqueta, hex, estiloExtra = '') {
  return el('div.dash-color-item', { style: estiloExtra },
    el('span.color-dot', { style: `background-color:${hex};` }),
    el('span.apunte.chico', {}, `${etiqueta}: ${hex}`)
  )
}

function tarjetaPublicacion(p, cuentaId) {
  const archivos = p.archivos || []
  const imgUrl = archivos[0] ? (archivos[0].startsWith('http') || archivos[0].startsWith('/') ? archivos[0] : `/piezas/${cuentaId}/${archivos[0]}`) : null
  const fechaTxt = p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : ''

  const card = el('div.dash-pub-card', {},
    imgUrl
      ? el('div.dash-pub-img-wrap', {},
          el('img', { src: imgUrl, alt: p.titulo, loading: 'lazy' }),
          el('span.dash-tipo-tag', {}, p.tipo)
        )
      : el('div.dash-pub-placeholder', {}, p.tipo),
    el('div.dash-pub-body', {},
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;' },
        el('span.rotulo', {}, fechaTxt),
        p.interacciones ? el('span.apunte.chico', {}, `📥 ${p.interacciones.descargas || 1}`) : null
      ),
      el('h4.dash-pub-titulo', {}, p.titulo || 'Publicación'),
      p.caption ? el('p.dash-pub-caption', {}, p.caption) : null,
      imgUrl ? el('a.btn.fantasma.chico', {
        href: imgUrl,
        download: (p.titulo || 'placa').replace(/\s+/g, '_') + '.png',
        target: '_blank',
        style: 'margin-top:10px;text-align:center;display:block;',
      }, 'Descargar PNG') : null
    )
  )
  return card
}

function formatearEvento(tipo) {
  const nombres = {
    cuenta_creada: 'Cuenta creada',
    login_otp: 'Inicio de sesión con OTP',
    login_google: 'Inicio de sesión con Google',
    placa_renderizada: 'Placas generadas',
    plan_generado: 'Plan de contenido semanal armado',
    marca_actualizada: 'Marca actualizada',
    identidad_sugerida: 'Propuesta de identidad solicitada',
  }
  return nombres[tipo] || tipo
}

/**
 * Los datos del evento, en castellano.
 *
 * Antes se volcaba el JSON con las llaves y las comillas reemplazadas por
 * espacios, y salía «canal : feed , cantidad :3»: legible para quien escribió
 * el objeto y para nadie más.
 */
function describirMetadata(meta) {
  if (!meta || typeof meta !== 'object') return ''
  const CANAL = { feed: 'para el feed', historia: 'para historia', cuadrado: 'cuadrada' }
  const partes = []

  if (meta.cantidad) partes.push(`${meta.cantidad} placa${meta.cantidad > 1 ? 's' : ''}`)
  if (meta.canal) partes.push(CANAL[meta.canal] || meta.canal)
  if (meta.nombre) partes.push(meta.nombre)
  if (meta.negocio) partes.push(meta.negocio)
  if (meta.email) partes.push(meta.email)

  // Cualquier clave que no tenga una forma propia se muestra igual, pero
  // separada con una coma y sin la puntuación del JSON.
  const conocidas = new Set(['cantidad', 'canal', 'nombre', 'negocio', 'email'])
  for (const [k, v] of Object.entries(meta)) {
    if (conocidas.has(k) || v == null || v === '') continue
    if (typeof v === 'object') continue
    partes.push(`${k}: ${v}`)
  }
  return partes.join(' · ')
}
