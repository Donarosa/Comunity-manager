// Dashboard Personal del Usuario.
// Muestra el perfil, métricas de ahorro e interacciones, galería de piezas y planes guardados.

import { api } from './api.js'
import { el, vaciar, aviso } from './ui.js'
import { obtenerUsuario, cerrarSesion } from './auth.js'

export async function iniciarDashboard({
  contenedor,
  cuentaId,
  catalogo,
  onAbrirEditor,
  onAbrirWizard,
  onAbrirPlan,
  alCerrarSesion,
}) {
  vaciar(contenedor)
  contenedor.append(el('div.cargando-txt', {}, 'Cargando tu dashboard personal...'))

  try {
    const data = await api.dashboard(cuentaId)
    renderizarDashboard({
      contenedor,
      data,
      catalogo,
      onAbrirEditor,
      onAbrirWizard,
      onAbrirPlan,
      alCerrarSesion,
    })
  } catch (err) {
    vaciar(contenedor).append(
      aviso(`Error cargando dashboard: ${err.message}`, 'malo'),
      el('button.btn.fantasma', {
        style: 'margin-top:14px',
        onclick: () => iniciarDashboard({ contenedor, cuentaId, catalogo, onAbrirEditor, onAbrirWizard, onAbrirPlan, alCerrarSesion }),
      }, 'Reintentar')
    )
  }
}

function renderizarDashboard({
  contenedor,
  data,
  catalogo,
  onAbrirEditor,
  onAbrirWizard,
  onAbrirPlan,
  alCerrarSesion,
}) {
  vaciar(contenedor)
  const { cuenta, marca, estado, publicaciones, planes, estadisticas, resumenMetricas } = data
  const usuarioAuth = obtenerUsuario()

  const panel = el('div.dashboard-usuario', { style: 'padding:32px 0 80px;' })
  contenedor.append(panel)

  /* ── 1. Cabecera de Usuario ── */
  const avatarUrl = cuenta.foto || usuarioAuth?.foto ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cuenta.nombre || 'Usuario')}&backgroundColor=A83A1C&textColor=FAF7F0`

  const cabecera = el('div.dash-header', {},
    el('div.dash-usuario-info', {},
      el('img.dash-avatar', { src: avatarUrl, alt: cuenta.nombre }),
      el('div', {},
        el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;' },
          el('h1', { style: 'font-size:1.8rem;margin:0;' }, cuenta.nombre),
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
    ? (valorObj.referencia?.simbolo || '$') + Math.round(valorObj.equivalenteTotal || 0).toLocaleString('es-AR')
    : '$0'

  const metricasGrid = el('div.dash-metricas-grid', {},
    tarjetaMetrica('Placas generadas', String(resumenMetricas?.totalPublicaciones || 0), `${resumenMetricas?.placasEsteMes || 0} este mes`),
    tarjetaMetrica('Ahorro acumulado', ahorroTxt, valorObj?.texto?.aclaracion || 'estimado vs agencia'),
    tarjetaMetrica('Planes de contenido', String(resumenMetricas?.totalPlanes || 0), 'estrategias armadas'),
    tarjetaMetrica('Cuota disponible', `${estado?.restante?.piezas?.mes || 0} piezas`, `${estado?.restante?.piezas?.dia || 0} disponibles hoy`)
  )

  /* ── 3. Panel de Identidad de Marca ── */
  const panelMarca = el('div.dash-marca-box', {})
  if (marca) {
    const paleta = marca.colors ? el('div.dash-paleta-preview', {},
      colorBadge('Fondo claro', marca.colors.light?.bg || '#FAF7F0'),
      colorBadge('Fondo oscuro', marca.colors.dark?.bg || '#16140F'),
      colorBadge('Acento', marca.colors.accent?.bg || marca.meta?.colorOriginal || '#A83A1C')
    ) : null

    panelMarca.append(
      el('div.dash-marca-cabecera', {},
        el('div', {},
          el('span.rotulo', {}, 'Identidad de Marca'),
          el('h3', { style: 'margin:4px 0;' }, marca.nombre),
          el('p.apunte.chico', {}, `${marca.handle || '@tu_marca'} · Tipografía: ${marca.fonts?.preset || 'Seriedad'}`)
        ),
        el('button.btn.fantasma.chico', { onclick: onAbrirWizard }, 'Editar marca')
      ),
      paleta
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

  /* ── 4. Botones de Acción Rápida ── */
  const barraAcciones = el('div.dash-barra-acciones', {},
    el('button.btn', { onclick: onAbrirEditor }, '+ Nueva publicación'),
    el('button.btn.fantasma', { onclick: onAbrirPlan }, 'Plan semanal con IA')
  )

  /* ── 5. Pestañas: Publicaciones, Planes, Actividad ── */
  const pestanias = el('div.dash-tabs', {})
  const tabPubs = el('button.dash-tab-btn.activo', {}, `Mis Placas (${publicaciones.length})`)
  const tabPlanes = el('button.dash-tab-btn', {}, `Planes (${planes.length})`)
  const tabStats = el('button.dash-tab-btn', {}, `Actividad (${estadisticas.length})`)
  pestanias.append(tabPubs, tabPlanes, tabStats)

  const cuerpoTab = el('div.dash-tab-cuerpo', { style: 'margin-top:20px;' })

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

  function renderPlanes() {
    vaciar(cuerpoTab)
    if (planes.length === 0) {
      cuerpoTab.append(
        el('div.dash-vacio', {},
          el('h4', {}, 'No tenés planes de contenido guardados.'),
          el('p.apunte', { style: 'margin:6px 0 16px;' }, 'La IA puede redactar tus copys, hashtags y armar el calendario de la semana.'),
          el('button.btn.chico', { onclick: onAbrirPlan }, 'Armar un plan semanal')
        )
      )
      return
    }

    for (const pl of planes) {
      const fechaTxt = pl.fecha ? new Date(pl.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
      const card = el('div.dash-plan-card', {},
        el('div.dash-plan-header', {},
          el('div', {},
            el('span.rotulo', {}, fechaTxt),
            el('h3', { style: 'margin:2px 0 6px;' }, pl.resumen || 'Plan de contenido semanal'),
            el('p.apunte.chico', {}, `${pl.publicaciones?.length || 0} publicaciones generadas`)
          )
        ),
        el('div.dash-plan-pubs-lista', {},
          (pl.publicaciones || []).map(pub =>
            el('div.dash-plan-pub-item', {},
              el('strong', {}, `${pub.dia} · ${pub.canal}`),
              el('p', { style: 'font-size:0.9rem;margin:4px 0;' }, pub.objetivo),
              el('p.apunte.chico', { style: 'white-space:pre-wrap;background:var(--papel);padding:8px;border-radius:2px;margin-top:6px;' }, pub.caption)
            )
          )
        )
      )
      cuerpoTab.append(card)
    }
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
      lista.append(
        el('li.item-actividad', {},
          el('span.fecha-actividad', {}, fecha),
          el('strong', {}, formatearEvento(ev.evento)),
          ev.metadata ? el('span.meta-actividad', {}, JSON.stringify(ev.metadata).replace(/["{}]/g, ' ')) : null
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
  tabPlanes.onclick = () => {
    activarTab(tabPlanes)
    renderPlanes()
  }
  tabStats.onclick = () => {
    activarTab(tabStats)
    renderActividad()
  }

  function activarTab(btnActivo) {
    [tabPubs, tabPlanes, tabStats].forEach(b => b.classList.remove('activo'))
    btnActivo.classList.add('activo')
  }

  panel.append(
    cabecera,
    metricasGrid,
    panelMarca,
    barraAcciones,
    pestanias,
    cuerpoTab
  )

  // Iniciar en la pestaña de publicaciones
  renderPublicaciones('todos')
}

function tarjetaMetrica(titulo, valor, detalle) {
  return el('div.dash-metrica-card', {},
    el('span.rotulo', {}, titulo),
    el('strong.dash-metrica-cifra', {}, valor),
    el('span.apunte.chico', {}, detalle)
  )
}

function colorBadge(etiqueta, hex) {
  return el('div.dash-color-item', {},
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
    placa_renderizada: 'Placa renderizada en alta resolución',
    plan_generado: 'Plan de contenido semanal armado',
    marca_actualizada: 'Marca actualizada',
    identidad_sugerida: 'Propuesta de identidad solicitada',
  }
  return nombres[tipo] || tipo
}
