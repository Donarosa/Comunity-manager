// Modal de ingreso: Google, o probar como invitado.
//
// El código por correo estuvo acá y se sacó: no hay nada en el servidor que
// mande mails —enviarOtp() genera el código y lo escribe en la consola—, así
// que el botón prometía un correo que nunca salía y dejaba a la persona
// esperando en la pantalla de los seis dígitos. Una puerta que no abre es peor
// que una puerta menos.
//
// El backend sigue entero (/auth/otp/enviar, /auth/otp/verificar y las dos
// funciones en auth.js): cuando haya un proveedor de correo conectado, volver
// a prenderlo es reponer el botón y el paso del código.

import { el, $, vaciar, aviso } from './ui.js'
import { loginConGoogle, iniciarComoInvitado } from './auth.js'

export function abrirModalAuth({ alAutenticar = () => {} } = {}) {
  // Evitar modales duplicados
  const existente = $('#modal-auth')
  if (existente) existente.remove()

  // La regla del fondo del modal se llama .modal-fondo en app.css. Con
  // .modal-overlay el contenedor quedaba position:static y sin z-index: la caja
  // de ingreso caía al final de la página, abajo a la izquierda.
  const overlay = el('div.modal-fondo', { id: 'modal-auth' })
  const caja = el('div.modal-caja')
  overlay.append(caja)
  document.body.append(overlay)

  // Cerrar al hacer clic afuera
  overlay.addEventListener('click', e => {
    if (e.target === overlay) cerrar()
  })

  function cerrar() {
    overlay.remove()
  }

  function renderIngreso() {
    vaciar(caja)

    const msgError = el('p.aviso.malo.oculto', { style: 'margin-bottom:12px' })

    const inpNombre = el('input', {
      type: 'text',
      placeholder: 'Nombre o nombre del negocio (opcional)',
      style: 'margin-bottom:16px;font-size:0.92rem;padding:9px 12px;',
    })

    // El helper el() mete los hijos como nodos de texto, así que un SVG pasado
    // como hijo se escapa y el botón imprime el markup crudo. Va por `html`.
    const ICONO_GOOGLE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>'
    const ROTULO_GOOGLE = `${ICONO_GOOGLE}<span>Continuar con Google</span>`

    const btnGoogle = el('button.btn.btn-google', {
      type: 'button',
      html: ROTULO_GOOGLE,
      onclick: async () => {
        btnGoogle.disabled = true
        btnGoogle.textContent = 'Entrando…'
        try {
          const usuario = await loginConGoogle()
          cerrar()
          alAutenticar(usuario)
        } catch (e) {
          msgError.textContent = e.message || 'No se pudo entrar con Google. Probá de nuevo, o entrá como invitado.'
          msgError.classList.remove('oculto')
        } finally {
          btnGoogle.disabled = false
          btnGoogle.innerHTML = ROTULO_GOOGLE
        }
      },
    })

    const btnSaltear = el('button.btn.fantasma', {
      type: 'button',
      style: 'width:100%;margin-top:12px;border:1px dashed var(--linea-fuerte, #ccc);color:var(--tinta-suave, #666);font-weight:600',
      onclick: () => {
        const u = iniciarComoInvitado(inpNombre.value.trim() || 'Mi Negocio')
        cerrar()
        alAutenticar(u)
      },
    }, 'Probar como invitado')

    caja.append(
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px' },
        el('h2', { style: 'font-size:1.4rem;margin:0' }, 'Ingresar a tu cuenta'),
        el('button.btn-cerrar-modal', { onclick: cerrar }, '✕')
      ),
      el('p.apunte', { style: 'margin-bottom:18px' }, 'Accedé a tu dashboard personal, tu marca y todas tus placas.'),
      msgError,
      btnGoogle,
      el('div.separador-o', { style: 'margin:16px 0 10px' }, el('span', {}, 'o probá sin cuenta')),
      inpNombre,
      btnSaltear,
      // El invitado puede escribir y renderizar; lo que pide cuenta son las
      // sugerencias con IA y el banco de fotos. Decirlo acá evita que se
      // entere recién cuando la función le responde que no.
      el('p.apunte.chico', { style: 'margin-top:10px;text-align:center' },
        'Como invitado podés armar y descargar placas. Las sugerencias de contenido y el banco de fotos piden cuenta.')
    )

    setTimeout(() => btnGoogle.focus(), 100)
  }

  renderIngreso()
}
