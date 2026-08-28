// Modal de Autenticación (Google + OTP por Email).

import { el, $, vaciar, aviso } from './ui.js'
import { loginConGoogle, solicitarCodigoOtp, validarCodigoOtp, iniciarComoInvitado } from './auth.js'

export function abrirModalAuth({ alAutenticar = () => {} } = {}) {
  // Evitar modales duplicados
  const existente = $('#modal-auth')
  if (existente) existente.remove()

  const overlay = el('div.modal-overlay', { id: 'modal-auth' })
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

  let emailIngresado = ''
  let codigoDevDetectado = null

  function renderPasoEmail() {
    vaciar(caja)

    const msgError = el('p.aviso.malo.oculto', { style: 'margin-bottom:12px' })

    const inpEmail = el('input', {
      type: 'email',
      placeholder: 'nombre@ejemplo.com',
      required: true,
      style: 'margin-bottom:12px;font-size:1rem;padding:10px 12px;',
    })

    const inpNombre = el('input', {
      type: 'text',
      placeholder: 'Nombre o nombre del negocio (opcional)',
      style: 'margin-bottom:16px;font-size:0.92rem;padding:9px 12px;',
    })

    const btnGoogle = el('button.btn.btn-google', {
      type: 'button',
      onclick: async () => {
        btnGoogle.disabled = true
        btnGoogle.textContent = 'Iniciando con Google...'
        try {
          const usuario = await loginConGoogle()
          cerrar()
          alAutenticar(usuario)
        } catch (e) {
          msgError.textContent = e.message || 'Error al autenticar con Google'
          msgError.classList.remove('oculto')
        } finally {
          btnGoogle.disabled = false
          btnGoogle.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg> Continuar con Google`
        }
      },
    },
      `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg> Continuar con Google`
    )

    const btnEnviarOtp = el('button.btn', {
      style: 'width:100%;margin-top:8px;',
      onclick: async () => {
        const mail = inpEmail.value.trim()
        if (!mail || !mail.includes('@')) {
          msgError.textContent = 'Ingresá un correo electrónico válido'
          msgError.classList.remove('oculto')
          return
        }
        btnEnviarOtp.disabled = true
        btnEnviarOtp.textContent = 'Enviando código...'
        msgError.classList.add('oculto')

        try {
          const res = await solicitarCodigoOtp(mail)
          emailIngresado = mail
          codigoDevDetectado = res.codigoDev || null
          renderPasoOtp(inpNombre.value.trim())
        } catch (e) {
          msgError.textContent = e.message
          msgError.classList.remove('oculto')
        } finally {
          btnEnviarOtp.disabled = false
          btnEnviarOtp.textContent = 'Enviar código por email (OTP)'
        }
      },
    }, 'Enviar código por email (OTP)')

    const btnSaltear = el('button.btn.fantasma', {
      type: 'button',
      style: 'width:100%;margin-top:12px;border:1px dashed var(--linea-fuerte, #ccc);color:var(--tinta-suave, #666);font-weight:600',
      onclick: () => {
        const u = iniciarComoInvitado(inpNombre.value.trim() || 'Mi Negocio')
        cerrar()
        alAutenticar(u)
      },
    }, '⚡ Probar como invitado (Saltear registro por ahora)')

    caja.append(
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px' },
        el('h2', { style: 'font-size:1.4rem;margin:0' }, 'Ingresar a tu cuenta'),
        el('button.btn-cerrar-modal', { onclick: cerrar }, '✕')
      ),
      el('p.apunte', { style: 'margin-bottom:18px' }, 'Accedé a tu dashboard personal, tu marca y todas tus placas.'),
      btnGoogle,
      el('div.separador-o', {}, el('span', {}, 'o con código por correo')),
      msgError,
      el('label.rotulo', { style: 'display:block;margin-bottom:6px' }, 'Tu correo electrónico'),
      inpEmail,
      inpNombre,
      btnEnviarOtp,
      el('div.separador-o', { style: 'margin:14px 0 6px' }, el('span', {}, 'o también')),
      btnSaltear
    )

    setTimeout(() => inpEmail.focus(), 100)
  }

  function renderPasoOtp(nombreIngresado = '') {
    vaciar(caja)

    const inpCodigo = el('input.input-otp', {
      type: 'text',
      maxlength: '6',
      placeholder: '000000',
      autocomplete: 'one-time-code',
      style: 'letter-spacing:0.35em;font-size:1.8rem;text-align:center;font-family:var(--mono);font-weight:700;padding:12px;margin:16px 0;',
    })

    const msgError = el('p.aviso.malo.oculto', { style: 'margin-bottom:12px' })

    const btnVerificar = el('button.btn', {
      style: 'width:100%;',
      onclick: async () => {
        const cod = inpCodigo.value.trim()
        if (cod.length < 6) {
          msgError.textContent = 'El código debe tener 6 dígitos'
          msgError.classList.remove('oculto')
          return
        }
        btnVerificar.disabled = true
        btnVerificar.textContent = 'Verificando...'
        msgError.classList.add('oculto')

        try {
          const resultado = await validarCodigoOtp(emailIngresado, cod, nombreIngresado)
          cerrar()
          alAutenticar(resultado.usuario)
        } catch (e) {
          msgError.textContent = e.message || 'Código incorrecto o expirado'
          msgError.classList.remove('oculto')
        } finally {
          btnVerificar.disabled = false
          btnVerificar.textContent = 'Verificar e Ingresar'
        }
      },
    }, 'Verificar e Ingresar')

    const btnReenviar = el('button.btn.texto.chico', {
      onclick: async () => {
        try {
          btnReenviar.textContent = 'Reenviando...'
          const res = await solicitarCodigoOtp(emailIngresado)
          codigoDevDetectado = res.codigoDev || null
          avisoReenvio.textContent = 'Código reenviado con éxito.'
          avisoReenvio.classList.remove('oculto')
          setTimeout(() => avisoReenvio.classList.add('oculto'), 4000)
        } catch (e) {
          msgError.textContent = e.message
          msgError.classList.remove('oculto')
        } finally {
          btnReenviar.textContent = '¿No te llegó? Reenviar código'
        }
      },
    }, '¿No te llegó? Reenviar código')

    const avisoReenvio = el('p.apunte.chico.oculto', { style: 'color:var(--ok);margin-top:6px' })

    const infoDev = codigoDevDetectado ? el('div.aviso.bien', { style: 'margin-top:14px;font-size:0.85rem' },
      `Código de prueba: `, el('strong', { style: 'font-family:var(--mono);letter-spacing:0.1em;font-size:1.1rem' }, codigoDevDetectado)
    ) : null

    caja.append(
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px' },
        el('h2', { style: 'font-size:1.3rem;margin:0' }, 'Ingresá el código'),
        el('button.btn-cerrar-modal', { onclick: cerrar }, '✕')
      ),
      el('p.apunte', {}, `Te enviamos un código de 6 dígitos a `, el('strong', {}, emailIngresado)),
      inpCodigo,
      msgError,
      btnVerificar,
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:16px' },
        el('button.btn.texto.chico', { onclick: renderPasoEmail }, '← Cambiar correo'),
        btnReenviar
      ),
      avisoReenvio,
      infoDev
    )

    // Si detectamos código dev, lo auto-completamos para conveniencia en pruebas locales
    if (codigoDevDetectado) {
      inpCodigo.value = codigoDevDetectado
    }

    setTimeout(() => inpCodigo.focus(), 100)
  }

  renderPasoEmail()
}
