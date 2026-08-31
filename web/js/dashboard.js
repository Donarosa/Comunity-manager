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
          // Si ya cargó su marca, el negocio se llama como su marca. "Mi
          // Negocio" es el nombre de relleno del alta y deja de ser cierto en
          // cuanto el usuario escribe el suyo.
          el('h1', { style: 'font-size:1.8rem;margin:0;' }, marca?.nombre || cuenta.nombre),
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
    // El total cuenta publicaciones, no placas: un carrusel de tres es una
    // publicación. Con el rótulo anterior la tarjeta se contradecía sola
    // ("Placas generadas: 7" arriba de "9 este mes").
    tarjetaMetrica('Publicaciones', String(resumenMetricas?.totalPublicaciones || 0), `${resumenMetricas?.placasEsteMes || 0} placas este mes`),
    tarjetaMetrica('Ahorro acumulado', ahorroTxt, valorObj?.texto?.aclaracion || 'estimado vs agencia'),
    // La cuota es un límite, y un límite se lee mejor viéndolo llenarse que
    // como un número suelto: "117 piezas" no dice si es mucho o poco hasta
    // saber contra qué. Las barras muestran las dos escalas —el mes y el día—
    // que es lo que define cuánto se puede hacer ahora.
    tarjetaCuota(estado)
  )

  /* ── 3. Panel de Identidad de Marca ── */
  const panelMarca = el('div.dash-marca-box', {})
  if (marca) {
    // La paleta derivada vive en colors.flat — no hay colors.light ni
    // colors.dark. Leyendo esas dos, los badges caían al valor de respaldo y el
    // panel mostraba dos códigos que no eran los de la marca. Es el único lugar
    // donde el cliente ve su paleta, y probablemente de donde la copia.
    const C = marca.colors?.flat
    const paleta = C ? el('div.dash-paleta-preview', {},
      colorBadge('Fondo claro', C.bg),
      colorBadge('Fondo oscuro', C.darkBg),
      colorBadge('Acento', C.accent)
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

  /* ── 4. Botones de Acción Rápida ──
   *
   * Sin marca no se puede publicar: las placas se dibujan con el color, la
   * tipografía y la firma del negocio. Antes las dos acciones estaban igual de
   * disponibles y el editor dejaba escribir la placa entera; el problema
   * aparecía recién al generar, con un error del servidor. Mejor pedir la
   * marca acá, que es una vez, que hacerle perder el texto escrito. */
  // Las dos acciones viven en un dock flotante: son lo más importante de la
  // pantalla y el producto se usa desde el mostrador, con el teléfono en la
  // mano. Ahí abajo quedan siempre bajo el pulgar, sin importar cuánto se haya
  // scrolleado. Se van solos al cambiar de pantalla porque cuelgan del
  // contenedor del dashboard.
  const barraAcciones = marca
    ? el('div.dock-acciones', {},
        el('button.btn', { onclick: onAbrirEditor }, '✎ Escribir yo'),
        el('button.btn.cyan', { onclick: onAbrirPlan }, '✨ Sugerime'))
    : el('div.dock-acciones', {},
        el('button.btn', { onclick: onAbrirWizard }, 'Armar mi marca para empezar'))

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
