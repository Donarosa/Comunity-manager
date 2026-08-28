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
  btnEntrar.textContent = usuarioActual ? 'Ir al Dashboard' : 'Empezar'
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

/* ── pantallas ───────────────────────────────────────────── */

function abrirDashboard() {
  if (!cuenta) return entrar()
  mostrarApp(cont => iniciarDashboard({
    contenedor: cont,
    cuentaId: cuenta.id,
    catalogo,
    onAbrirEditor: abrirEditor,
    onAbrirWizard: abrirWizard,
    onAbrirPlan: vistaPlan,
    alCerrarSesion: () => {
      cuenta = null
      localStorage.removeItem(LLAVE)
      mostrarLanding()
    },
  }))
}

function abrirEditor() {
  if (!cuenta) return entrar()
  mostrarApp(cont => iniciarEditor({
    contenedor: cont,
    cuenta,
    catalogo,
    alVolver: abrirDashboard,
    alCambiarCuota: actualizarChip,
  }))
}

function abrirWizard() {
  if (!cuenta) return entrar()
  mostrarApp(cont => iniciarWizard({
    contenedor: cont,
    catalogo,
    cuentaId: cuenta.id,
    alTerminar: async () => {
      await recargarCuenta()
      abrirDashboard()
    },
  }))
}

/* ── plan de contenido ───────────────────────────────────── */

function vistaPlan() {
  if (!cuenta) return entrar()
  mostrarApp(cont => {
    const panel = el('div', { style: 'padding:40px 0 80px;max-width:760px' })
    cont.append(panel)

    const posteos = el('select', {}, [1, 2, 3, 4].map(n => el('option', { value: n, selected: n === 3 }, `${n} posteo${n > 1 ? 's' : ''}`)))
    const historias = el('select', {}, [0, 1, 2, 3].map(n => el('option', { value: n, selected: n === 2 }, `${n} historia${n === 1 ? '' : 's'}`)))
    const pedido = el('textarea', { rows: 3, placeholder: 'Ej: quiero promocionar el combo del fin de semana y contar que ahora hacemos delivery.' })

    const salida = el('div', { style: 'margin-top:26px' })
    const pedir = el('button.btn', {
      onclick: async () => {
        pedir.disabled = true
        vaciar(salida).append(el('p.cargando-txt', {}, 'Escribiendo el contenido y renderizando las placas'))
        try {
          const r = await api.contenido(cuenta.id, {
            posteos: Number(posteos.value),
            historias: Number(historias.value),
            pedido: pedido.value.trim(),
          })
          actualizarChip(r.estado)
          mostrarPlan(salida, r)
        } catch (e) {
          vaciar(salida).append(aviso(e.message, 'malo'))
        } finally {
          pedir.disabled = false
        }
      },
    }, 'Armar el plan')

    panel.append(
      el('span.rotulo', {}, 'Plan de contenido semanal'),
      el('h2', { style: 'margin:6px 0 8px' }, '¿Qué publicamos esta semana?'),
      el('p.intro', {}, 'Proponemos los posteos, escribimos el texto de las placas y el del posteo, y renderizamos todo con tu marca.'),
      el('div.campo', {}, el('label', {}, 'Cuánto'),
        el('div', { style: 'display:flex;gap:10px' }, posteos, historias)),
      el('div.campo', {}, el('label', {}, '¿Algo puntual?'),
        el('span.ayuda', {}, 'Opcional. Si hay una promoción, una novedad o algo que querés contar, escribilo acá.'),
        pedido),
      el('div.acciones-paso', {}, pedir, el('button.btn.texto', { onclick: abrirDashboard }, '← Volver al Dashboard')),
      salida
    )
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
    } catch {
      // Si la cuenta no existe en el backend, la sincronizamos
      await sincronizarUsuario(u)
    }
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
  mostrarLanding()
}

/* ── Carrusel dinámico de pantallas de salida ──────────────── */

function iniciarCarruselPantallas() {
  const container = $('#carrusel-pantallas')
  const track = $('#carrusel-track')
  const btnPrev = $('#carrusel-prev')
  const btnNext = $('#carrusel-next')
  const dotsContainer = $('#carrusel-dots')

  if (!container || !track) return

  const items = Array.from(track.querySelectorAll('.placa-mockup'))
  const total = items.length
  if (total === 0) return

  let indiceActual = 0
  let timerAutoplay = null
  let pausado = false
  let translateActual = 0

  // Generar dots interactivos
  vaciar(dotsContainer)
  items.forEach((_, i) => {
    const dot = el('button.carrusel-dot', {
      'aria-label': `Ir a placa ${i + 1}`,
      class: i === 0 ? 'is-active' : '',
    })
    dot.addEventListener('click', () => irAPlaca(i))
    dotsContainer.append(dot)
  })

  const dots = Array.from(dotsContainer.querySelectorAll('.carrusel-dot'))

  function calcularTranslate(idx) {
    // Usamos getBoundingClientRect con el track en su posición actual
    const containerRect = container.getBoundingClientRect()
    const containerMid = containerRect.left + containerRect.width / 2

    const item = items[idx]
    // getBoundingClientRect del item incluye el transform actual
    // Para tener la posición "natural", temporalmente quitamos el transform
    const currentTransform = track.style.transform
    track.style.transition = 'none'
    track.style.transform = `translateX(${translateActual}px)`
    const itemRect = item.getBoundingClientRect()
    const itemMid = itemRect.left + itemRect.width / 2
    const delta = containerMid - itemMid
    track.style.transform = currentTransform
    // Force reflow para restaurar transition en el siguiente frame
    requestAnimationFrame(() => {
      track.style.transition = ''
    })
    return translateActual + delta
  }

  function actualizarPosicion() {
    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === indiceActual)
    })
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === indiceActual)
    })

    translateActual = calcularTranslate(indiceActual)
    track.style.transform = `translateX(${translateActual}px)`
  }

  function irAPlaca(idx) {
    indiceActual = ((idx % total) + total) % total
    actualizarPosicion()
    reiniciarTimer()
  }

  function siguiente() { irAPlaca(indiceActual + 1) }
  function anterior() { irAPlaca(indiceActual - 1) }

  function iniciarTimer() {
    detenerTimer()
    timerAutoplay = setInterval(() => { if (!pausado) siguiente() }, 3000)
  }

  function detenerTimer() {
    if (timerAutoplay) { clearInterval(timerAutoplay); timerAutoplay = null }
  }

  function reiniciarTimer() { iniciarTimer() }

  if (btnPrev) btnPrev.addEventListener('click', () => anterior())
  if (btnNext) btnNext.addEventListener('click', () => siguiente())

  items.forEach((item, i) => {
    item.addEventListener('click', () => irAPlaca(i))
  })

  container.addEventListener('mouseenter', () => { pausado = true })
  container.addEventListener('mouseleave', () => { pausado = false })

  window.addEventListener('resize', () => {
    translateActual = 0
    track.style.transition = 'none'
    track.style.transform = 'translateX(0)'
    requestAnimationFrame(() => {
      track.style.transition = ''
      actualizarPosicion()
    })
  }, { passive: true })

  // Inicializar — esperamos que el DOM esté pintado
  setTimeout(() => {
    actualizarPosicion()
    iniciarTimer()
  }, 150)
}


arrancar()

