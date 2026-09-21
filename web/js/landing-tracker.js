// Tracker ligero y autónomo de visitas y clics para la landing page de Alquimia.
// No bloquea la UI, tolera desconexión de red y respeta la privacidad del visitante.

(function () {
  if (typeof window === 'undefined') return

  // Identificador anónimo y persistente de visitante
  function obtenerVisitanteId() {
    try {
      let vid = localStorage.getItem('cm_vid')
      if (!vid) {
        vid = 'v_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
        localStorage.setItem('cm_vid', vid)
      }
      return vid
    } catch {
      return 'v_anonimo'
    }
  }

  // Identificador de sesión (expira al cerrar pestaña)
  function obtenerSessionId() {
    try {
      let sid = sessionStorage.getItem('cm_sid')
      if (!sid) {
        sid = 's_' + Math.random().toString(36).slice(2, 10)
        sessionStorage.setItem('cm_sid', sid)
      }
      return sid
    } catch {
      return 's_anonima'
    }
  }

  const visitanteId = obtenerVisitanteId()
  const sessionId = obtenerSessionId()
  const esMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '')
  const dispositivo = esMobile ? 'mobile' : 'desktop'

  function enviarEvento(datos) {
    const payload = JSON.stringify({
      visitanteId,
      sessionId,
      dispositivo,
      path: window.location.pathname + window.location.hash,
      referrer: document.referrer || '',
      ...datos,
    })

    // Intentar sendBeacon primero (óptimo para analytics) o fetch con keepalive
    try {
      if (navigator.sendBeacon) {
        const enviado = navigator.sendBeacon('/landing/evento', new Blob([payload], { type: 'application/json' }))
        if (enviado) return
      }
    } catch { /* fallback a fetch */ }

    try {
      fetch('/landing/evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    } catch { /* silencioso */ }
  }

  // 1. Registrar visita al cargar la landing
  let visitaEnviada = false
  function registrarVisita() {
    if (visitaEnviada) return
    // Si la app ya arrancó con sesión activa, no cuenta como visita de landing
    if (document.documentElement.classList.contains('con-sesion')) {
      const appEl = document.getElementById('app')
      if (appEl && !appEl.classList.contains('oculto')) return
    }
    visitaEnviada = true
    enviarEvento({ tipo: 'visita' })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registrarVisita)
  } else {
    registrarVisita()
  }

  // 2. Interceptar y registrar clics en botones y enlaces de la landing
  document.addEventListener('click', (e) => {
    // Si la landing está oculta y se está en el dashboard/editor, no trackeamos landing
    const landingEl = document.getElementById('landing')
    if (landingEl && landingEl.classList.contains('oculto')) return

    const cta = e.target.closest('[data-track-cta], [data-ir], #btn-entrar, #btn-login-nav, .plan .btn, .acciones .btn, .carrusel-btn, .carrusel-dot, a.apunte[data-solo-landing], .logotipo')
    if (!cta) return

    let botonId = cta.dataset.trackCta || cta.id
    let seccion = cta.dataset.trackSeccion

    if (!botonId) {
      if (cta.dataset.ir) {
        botonId = 'ir_' + cta.dataset.ir
      } else if (cta.classList.contains('carrusel-btn') || cta.classList.contains('carrusel-dot')) {
        botonId = 'carrusel_control'
      } else if (cta.classList.contains('logotipo')) {
        botonId = 'nav_logo'
      } else {
        const txt = (cta.textContent || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)
        botonId = 'cta_' + (txt || 'boton')
      }
    }

    if (!seccion) {
      const parentSec = cta.closest('section')
      const parentHeader = cta.closest('header')
      const parentFooter = cta.closest('footer')
      if (parentSec) seccion = parentSec.id || parentSec.className.split(' ')[0] || 'seccion'
      else if (parentHeader) seccion = 'Navegación'
      else if (parentFooter) seccion = 'Pie'
      else seccion = 'General'
    }

    // Limpiar texto para legibilidad
    const texto = (cta.innerText || cta.textContent || botonId)
      .replace(/[→↓‹›·\n\r\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60)

    enviarEvento({
      tipo: 'click',
      botonId,
      texto,
      seccion,
    })
  }, { capture: true, passive: true })

  // Exponer API global opcional
  window.__alquimiaTracker = {
    registrarVisita,
    registrarClick: (botonId, texto, seccion) => enviarEvento({ tipo: 'click', botonId, texto, seccion }),
  }
})()
