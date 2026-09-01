// Armado de la aplicación: enrutamiento, autenticación y pantallas.

import { api } from './api.js'
import { el, $, $$, vaciar, aviso } from './ui.js'
import { iniciarWizard } from './wizard.js'
import { iniciarEditor } from './editor.js'
import { iniciarDashboard } from './dashboard.js'
import { abrirModalAuth } from './modal-auth.js'
import { enCambioDeAuth, obtenerUsuario, cerrarSesion } from './auth.js'

const LLAVE = 'cm.cuenta'
const landing = $('#landing')
const app = $('#app')
const cuerpo = $('#app-cuerpo')
const chip = $('#chip-cuenta')
const btnEntrar = $('#btn-entrar')
const btnLoginNav = $('#btn-login-nav')
const usuarioNav = $('#usuario-nav')
const navAvatar = $('#nav-avatar')

let catalogo = null
let cuenta = null
let estadoCuota = null
let usuarioActual = null

/* ── navegación ──────────────────────────────────────────── */

function mostrarLanding() {
  app.classList.add('oculto')
  landing.classList.remove('oculto')
  $$('[data-solo-landing]').forEach(n => n.classList.remove('oculto'))
  btnEntrar.textContent = 'Empezar'
  btnLoginNav?.classList.remove('oculto')
}

function mostrarApp(pintar) {
  landing.classList.add('oculto')
  app.classList.remove('oculto')
  $$('[data-solo-landing]').forEach(n => n.classList.add('oculto'))
  btnEntrar.textContent = 'Dashboard'
  vaciar(cuerpo)
  pintar(cuerpo)
}

function actualizarChip(estado) {
  if (!chip) return
  if (estado) estadoCuota = estado
  if (!estadoCuota) return chip.classList.add('oculto')
  const r = estadoCuota.restante
  chip.classList.remove('oculto')
  chip.innerHTML = `<b>${r.piezas.mes}</b> placas este mes · <b>${r.piezas.dia}</b> hoy`
}

function actualizarNavUsuario(u) {
  usuarioActual = u
  if (u) {
    if (btnLoginNav) btnLoginNav.classList.add('oculto')
    if (usuarioNav && navAvatar) {
      usuarioNav.classList.remove('oculto')
      navAvatar.src = u.foto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.nombre || 'U')}&backgroundColor=A83A1C&textColor=FAF7F0`
      navAvatar.onclick = () => {
        if (cuenta) abrirDashboard()
      }
    }
    btnEntrar.textContent = 'Mi Dashboard'
  } else {
    if (btnLoginNav) btnLoginNav.classList.remove('oculto')
    if (usuarioNav) usuarioNav.classList.add('oculto')
    btnEntrar.textContent = 'Empezar'
  }
}

/**
 * El catálogo se pide al arrancar, y ese pedido puede fallar —red, o el
 * servidor todavía despertando—. Si volvió incompleto no alcanza con seguir:
 * el wizard descarta las secciones que no tienen datos y el paso de identidad
 * queda con el color solo, sin ningún error a la vista. Se reintenta antes de
 * abrir las pantallas que lo necesitan.
 */
async function asegurarCatalogo() {
  if (catalogo?.tipografias?.length && catalogo?.logotipos) return
  try { catalogo = await api.catalogo() } catch { /* lo avisa la pantalla */ }
}

/* ── pantallas ───────────────────────────────────────────── */

function abrirDashboard() {
  if (!cuenta) return entrar()
  mostrarApp(cont => iniciarDashboard({
    contenedor: cont,
    cuentaId: cuenta.id,
    catalogo,
    onAbrirEditor: abrirEditor,
    onAbrirWizard: abrirWizard,
    onAbrirPlan: vistaSugerir,
    alCerrarSesion: () => {
      cuenta = null
      localStorage.removeItem(LLAVE)
      mostrarLanding()
    },
  }))
}

async function abrirEditor() {
  if (!cuenta) return entrar()
  await asegurarCatalogo()
  mostrarApp(cont => iniciarEditor({
    contenedor: cont,
    cuenta,
    catalogo,
    alVolver: abrirDashboard,
    alCambiarCuota: actualizarChip,
  }))
}

async function abrirWizard() {
  if (!cuenta) return entrar()
  await asegurarCatalogo()
  mostrarApp(cont => iniciarWizard({
    contenedor: cont,
    catalogo,
    cuentaId: cuenta.id,
    marca: cuenta.marca,
    modoEdicion: Boolean(cuenta.marca),
    alTerminar: async () => {
      await recargarCuenta()
      abrirDashboard()
    },
  }))
}

/* ── plan de contenido ───────────────────────────────────── */

/* ── sugerir contenido ───────────────────────────────────────
 *
 * Tres preguntas y las placas hechas. Reemplaza al formulario de plan semanal,
 * que arrancaba pidiendo "cuántos posteos y cuántas historias" —una cuenta que
 * el negocio no tiene por qué haber pensado— antes de preguntar de qué quería
 * hablar. Acá la primera pregunta es el tema, que es lo único que la persona sí
 * tiene en la cabeza cuando abre la aplicación.
 *
 * "Toda la semana" quedó como una forma más: el plan semanal ya estaba
 * construido y funcionaba, así que pasa a ser un tipo de pedido en vez de un
 * botón aparte que compite con el de publicar.
 */

const FORMAS = [
  { id: 'post', titulo: 'Un posteo', detalle: 'Una placa sola para el feed.', placas: '1 placa' },
  { id: 'carrusel', titulo: 'Un carrusel', detalle: 'Se desliza: portada, desarrollo y cierre.', placas: 'hasta 5 placas' },
  { id: 'historia', titulo: 'Una historia', detalle: 'Vertical, dura 24 horas.', placas: '1 placa' },
  { id: 'cuadrado', titulo: 'Una cuadrada', detalle: 'Sirve para reusar en otras redes.', placas: '1 placa' },
  { id: 'semana', titulo: 'Toda la semana', detalle: 'Varios posteos e historias de una vez.', placas: 'hasta 17 placas' },
]

function vistaSugerir() {
  if (!cuenta) return entrar()
  const st = { tema: '', forma: 'carrusel', posteos: 3, historias: 2 }

  mostrarApp(cont => {
    const panel = el('div', { style: 'padding:0 0 100px;max-width:760px' })
    cont.append(panel)
    paso1()

    /* — 1 · de qué hablamos — */
    function paso1() {
      vaciar(panel)
      const texto = el('textarea', {
        rows: 3,
        placeholder: 'Ej: que ahora abrimos los domingos y las facturas salen a las 8',
        value: st.tema,
      })
      texto.addEventListener('input', () => { st.tema = texto.value })

      const chips = el('div.chips-temas')
      const nota = el('span.ayuda', {}, 'Buscando ideas con lo que contaste de tu negocio…')

      const pintarChips = ({ temas, origen }) => {
        vaciar(chips)
        if (!temas.length) { nota.textContent = 'Escribí vos de qué querés hablar.'; return }
        nota.textContent = origen === 'ia'
          ? 'Salen de tu rubro, lo que vendés y lo que te diferencia.'
          : 'Armadas con lo que cargaste en el alta.'
        for (const t of temas) {
          chips.append(el('button.chip-tema', {
            type: 'button',
            onclick: () => {
              texto.value = t
              st.tema = t
              $$('.chip-tema', chips).forEach(c => c.classList.remove('elegido'))
              chips.querySelector(`[data-t="${CSS.escape(t)}"]`)?.classList.add('elegido')
            },
            dataset: { t },
          }, t))
        }
      }

      api.temas(cuenta.id)
        .then(pintarChips)
        .catch(() => { nota.textContent = 'Escribí vos de qué querés hablar.' })

      panel.append(
        el('span.rotulo', {}, 'Paso 1 de 3'),
        el('h2', { style: 'margin:6px 0 8px' }, '¿De qué querés hablar?'),
        el('p.intro', {}, 'Contame algo puntual, o elegí una de las ideas de abajo. Escribir no descuenta nada del plan.'),
        el('div.campo', {}, el('label', {}, 'Algo puntual'), texto),
        el('div.campo', {}, el('label', {}, 'O elegí una de estas'), nota, chips),
        el('div.acciones-paso', {},
          el('button.btn', { onclick: () => { st.tema = texto.value.trim(); paso2() } }, 'Seguir →'),
          el('button.btn.texto', { onclick: abrirDashboard }, '← Volver al Dashboard'))
      )
    }

    /* — 2 · qué tipo — */
    function paso2() {
      vaciar(panel)
      const grilla = el('div.opciones')
      const marcar = () => $$('.opcion', grilla).forEach(o =>
        o.classList.toggle('elegida', o.dataset.forma === st.forma))

      for (const f of FORMAS) {
        grilla.append(el('button.opcion', {
          dataset: { forma: f.id },
          style: 'display:flex;flex-direction:column;align-items:flex-start;gap:5px',
          onclick: () => { st.forma = f.id; marcar(); pintarExtra() },
        }, el('b', {}, f.titulo), el('span', {}, f.detalle),
           el('span.rotulo', { style: 'margin-top:4px' }, f.placas)))
      }
      marcar()

      // "Toda la semana" es la única forma que necesita preguntar cuánto.
      const extra = el('div')
      const pintarExtra = () => {
        vaciar(extra)
        if (st.forma !== 'semana') return
        const posteos = el('select', {},
          [1, 2, 3, 4].map(n => el('option', { value: n, selected: n === st.posteos }, `${n} posteo${n > 1 ? 's' : ''}`)))
        const historias = el('select', {},
          [0, 1, 2, 3].map(n => el('option', { value: n, selected: n === st.historias }, `${n} historia${n === 1 ? '' : 's'}`)))
        const cuenta_ = el('span.ayuda')
        const recalcular = () => {
          st.posteos = Number(posteos.value); st.historias = Number(historias.value)
          const techo = st.posteos * 5 + st.historias
          const hoy = estadoCuota?.restante?.piezas?.dia
          const alcanza = hoy == null || techo <= hoy
          cuenta_.textContent = `Son hasta ${techo} placas` +
            (hoy == null ? '.' : alcanza ? ` y te quedan ${hoy} hoy.` : ` y hoy te quedan ${hoy}: elegí menos.`)
          cuenta_.classList.toggle('malo', !alcanza)
        }
        posteos.addEventListener('change', recalcular)
        historias.addEventListener('change', recalcular)
        recalcular()
        extra.append(el('div.campo', { style: 'margin-top:20px' },
          el('label', {}, 'Cuánto'),
          el('div', { style: 'display:flex;gap:10px' }, posteos, historias),
          cuenta_))
      }
      pintarExtra()

      panel.append(
        el('span.rotulo', {}, 'Paso 2 de 3'),
        el('h2', { style: 'margin:6px 0 8px' }, '¿Qué tipo de publicación?'),
        el('p.intro', {}, st.tema
          ? `Sobre «${st.tema}». Cada forma cuenta la misma idea de una manera distinta.`
          : 'Cada forma cuenta la misma idea de una manera distinta.'),
        grilla, extra,
        el('div.acciones-paso', {},
          el('button.btn', { onclick: generar }, 'Armar la publicación →'),
          el('button.btn.texto', { onclick: paso1 }, '← Volver'))
      )
    }

    /* — 3 · armando y resultado — */
    async function generar() {
      vaciar(panel)
      panel.append(
        el('span.rotulo', {}, 'Paso 3 de 3'),
        el('h2', { style: 'margin:6px 0 8px' }, 'Armando tu publicación'),
        el('p.cargando-txt', {}, 'Escribiendo el texto y renderizando las placas'),
        el('p.apunte.chico', {}, 'Tarda unos veinte segundos. No cierres esta pantalla.')
      )
      try {
        const esSemana = st.forma === 'semana'
        const r = await api.contenido(cuenta.id, {
          pedido: st.tema,
          forma: esSemana ? '' : st.forma,
          posteos: esSemana ? st.posteos : 1,
          historias: esSemana ? st.historias : 0,
        })
        actualizarChip(r.estado)
        vaciar(panel)
        panel.append(
          el('span.rotulo', {}, 'Listo'),
          el('h2', { style: 'margin:6px 0 14px' }, esSemana ? 'Tu semana está lista' : 'Tu publicación está lista')
        )
        mostrarPlan(panel, r)
      } catch (e) {
        vaciar(panel)

        panel.append(
          el('span.rotulo', {}, 'Paso 3 de 3'),
          el('h2', { style: 'margin:6px 0 8px' }, 'No se pudo armar'),
          aviso(e.message, 'malo'),
          el('div.acciones-paso', {},
            el('button.btn', { onclick: paso2 }, '← Probar de nuevo'),
            el('button.btn.texto', { onclick: abrirDashboard }, 'Volver al Dashboard'))
        )
      }
    }
  })
}

function mostrarPlan(cont, r) {
  vaciar(cont)
  cont.append(
    el('div.aviso.bien', {}, r.resumen),
    el('button.btn.chico', {
      style: 'margin-bottom:18px;',
      onclick: abrirDashboard,
    }, '← Volver al Dashboard para ver todas tus placas')
  )

  for (const pub of r.publicaciones) {
    const bloque = el('section', { style: 'padding:22px 0;border-top:1px solid var(--linea)' })
    bloque.append(
      el('span.rotulo', {}, `${pub.dia} · ${pub.canal}`),
      el('h3', { style: 'margin:3px 0 8px' }, pub.objetivo)
    )
    if (pub.archivos?.length) {
      bloque.append(el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px' },
        pub.archivos.map(a => {
          const url = a.startsWith('/') ? a : `/piezas/${cuenta.id}/${r.carpeta.split('/').pop()}/${a}`
          return el('a', { href: url, target: '_blank', download: a },
            el('img', { src: url, style: 'width:88px;border:1px solid var(--linea-fuerte);border-radius:2px;display:block' }))
        })))
    }
    bloque.append(
      el('div', { style: 'background:#fff;border:1px solid var(--linea);border-radius:var(--r);padding:14px' },
        el('div.rotulo', { style: 'margin-bottom:6px' }, 'Texto del posteo'),
        el('p', { style: 'white-space:pre-wrap;font-size:0.94rem' }, pub.caption),
        el('p.credito', { style: 'margin-top:8px' }, pub.hashtags.join(' '))
      )
    )
    cont.append(bloque)
  }

  if (r.pendientes?.length) {
    cont.append(el('div.aviso', { style: 'margin-top:20px' },
      'Faltan fotos para algunas placas: ' + r.pendientes.map(p => p.notaFoto).join(' · ') +
      '. Armalas desde "Nueva publicación" con la plantilla Sobre una foto.'))
  }
}

/* ── arranque y sincronización de sesión ─────────────────── */

async function recargarCuenta() {
  if (!cuenta?.id) return
  const r = await api.cuenta(cuenta.id)
  cuenta = r.cuenta
  actualizarChip(r.estado)
}

async function sincronizarUsuario(usuario) {
  if (!usuario) {
    cuenta = null
    actualizarNavUsuario(null)
    mostrarLanding()
    return
  }

  actualizarNavUsuario(usuario)

  try {
    const r = await api.loginFirebase({
      uid: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      foto: usuario.foto,
    })
    cuenta = r.cuenta
    localStorage.setItem(LLAVE, cuenta.id)
    actualizarChip(r.estado)
    if (!cuenta.marca) abrirWizard()
    else abrirDashboard()
  } catch (err) {
    console.warn('[Sync] Error sincronizando usuario:', err.message)
    // Fallback: intentar leer cuenta guardada o crearla
    try {
      const res = await api.cuenta(usuario.id)
      cuenta = res.cuenta
      actualizarChip(res.estado)
      if (!cuenta.marca) abrirWizard()
      else abrirDashboard()
    } catch {
      const nueva = await api.crearCuenta({
        id: usuario.id,
        nombre: usuario.nombre || 'Mi Negocio',
        email: usuario.email,
        foto: usuario.foto,
      })
      cuenta = nueva.cuenta
      actualizarChip(nueva.estado)
      abrirWizard()
    }
  }
}

async function entrar() {
  const u = obtenerUsuario()
  if (!u) {
    abrirModalAuth({
      alAutenticar: usuario => {
        sincronizarUsuario(usuario)
      },
    })
    return
  }

  if (!cuenta) {
    await sincronizarUsuario(u)
  } else {
    abrirDashboard()
  }
}

async function arrancar() {
  catalogo = await api.catalogo().catch(() => ({ tipografias: [], formatos: [], planes: [] }))
  // Si vino incompleto, asegurarCatalogo() lo reintenta antes de cada pantalla.

  // Suscribirse a cambios en la sesión de Auth
  enCambioDeAuth(u => {
    actualizarNavUsuario(u)
  })

  const u = obtenerUsuario()
  if (u) {
    try {
      const r = await api.cuenta(u.id)
      cuenta = r.cuenta
      actualizarChip(r.estado)
      actualizarNavUsuario(u)
      // Usuario logueado: ir directo al dashboard (o wizard si no completó la marca)
      if (!cuenta.marca) abrirWizard()
      else abrirDashboard()
    } catch {
      // Si la cuenta no existe en el backend, la sincronizamos
      await sincronizarUsuario(u)
    }
  } else {
    mostrarLanding()
  }

  btnEntrar.addEventListener('click', () => {
    if (!app.classList.contains('oculto')) {
      abrirDashboard()
      return
    }
    entrar()
  })

  if (btnLoginNav) {
    btnLoginNav.addEventListener('click', () => {
      abrirModalAuth({ alAutenticar: usuario => sincronizarUsuario(usuario) })
    })
  }

  $$('[data-ir="wizard"]').forEach(b => b.addEventListener('click', entrar))

  // N10 floating-on-scroll morph de Bubble (Hum-07)
  const barra = $('#barra-nav') || $('header.barra')
  if (barra) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        barra.classList.add('is-floating')
      } else {
        barra.classList.remove('is-floating')
      }
    }, { passive: true })
  }

  iniciarCarruselPantallas()
}

/* ── Carrusel dinámico de pantallas de salida ──────────────── */

function iniciarCarruselPantallas() {
  const container = $('#carrusel-pantallas')
  const track = $('#carrusel-track')
  const btnPrev = $('#carrusel-prev')
  const btnNext = $('#carrusel-next')
  const dotsContainer = $('#carrusel-dots')

  if (!container || !track) return

  const items = Array.from(track.querySelectorAll('.phone-mockup, .placa-mockup'))
  const total = items.length
  if (total === 0) return

  let indiceActual = 0
  let timerAutoplay = null
  let pausado = false

  // Generar dots interactivos
  vaciar(dotsContainer)
  items.forEach((_, i) => {
    const dot = el('button.carrusel-dot', {
      'aria-label': `Ir a pantalla ${i + 1}`,
      class: i === 0 ? 'is-active' : '',
    })
    dot.addEventListener('click', () => irAPlaca(i))
    dotsContainer.append(dot)
  })

  const dots = Array.from(dotsContainer.querySelectorAll('.carrusel-dot'))

  function actualizarPosicion() {
    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === indiceActual)
    })
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === indiceActual)
    })

    const itemActivo = items[indiceActual]
    if (itemActivo && container) {
      const containerWidth = container.clientWidth
      const itemWidth = itemActivo.offsetWidth
      const itemOffsetLeft = itemActivo.offsetLeft
      const targetTranslate = -(itemOffsetLeft - (containerWidth / 2) + (itemWidth / 2))
      track.style.transform = `translateX(${targetTranslate}px)`
    }
  }

  function irAPlaca(idx) {
    indiceActual = ((idx % total) + total) % total
    actualizarPosicion()
    reiniciarTimer()
  }

  function siguiente() {
    irAPlaca(indiceActual + 1)
  }

  function anterior() {
    irAPlaca(indiceActual - 1)
  }

  function iniciarTimer() {
    detenerTimer()
    timerAutoplay = setInterval(() => {
      if (!pausado) siguiente()
    }, 3200)
  }

  function detenerTimer() {
    if (timerAutoplay) {
      clearInterval(timerAutoplay)
      timerAutoplay = null
    }
  }

  function reiniciarTimer() {
    iniciarTimer()
  }

  if (btnPrev) btnPrev.addEventListener('click', () => anterior())
  if (btnNext) btnNext.addEventListener('click', () => siguiente())

  items.forEach((item, i) => {
    item.addEventListener('click', () => irAPlaca(i))
  })

  container.addEventListener('mouseenter', () => { pausado = true })
  container.addEventListener('mouseleave', () => { pausado = false })
  container.addEventListener('touchstart', () => { pausado = true }, { passive: true })
  container.addEventListener('touchend', () => {
    pausado = false
    reiniciarTimer()
  }, { passive: true })

  window.addEventListener('resize', () => actualizarPosicion(), { passive: true })

  // Inicializar — esperamos que el DOM esté pintado
  setTimeout(() => {
    actualizarPosicion()
    iniciarTimer()
  }, 150)
}


arrancar()

