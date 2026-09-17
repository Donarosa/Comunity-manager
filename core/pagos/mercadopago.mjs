// Integración con Mercado Pago para Suscripciones Mensuales Recurrentes.
// Basado en la API oficial de PreApproval (Suscripciones sin plan asociado con pago pendiente).

import { MercadoPagoConfig, PreApproval } from 'mercadopago'

let clienteMp = null
let mockHandler = null

export function _setMock(mock) {
  mockHandler = mock
}

export function _restaurarMock() {
  mockHandler = null
}

export function obtenerClienteMercadoPago() {
  if (mockHandler) return mockHandler
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) return null
  if (!clienteMp) {
    clienteMp = new MercadoPagoConfig({
      accessToken: token,
      options: { timeout: 10000 },
    })
  }
  return clienteMp
}

export function estaConfigurado() {
  return Boolean(mockHandler || process.env.MP_ACCESS_TOKEN)
}

export function precioMensualARS() {
  const v = Number(process.env.MP_PRECIO_MENSUAL_ARS || 15000)
  return Number.isFinite(v) && v > 0 ? v : 15000
}

function obtenerPreapprovalApi(client) {
  return mockHandler?.preapproval || new PreApproval(client)
}

/**
 * Crea una suscripción mensual en Mercado Pago para una cuenta.
 * Devuelve el `init_point` donde redirigir al usuario.
 */
export async function crearSuscripcionPreapproval({ cuentaId, email, backUrl, nombre = 'Plan Community' }) {
  const client = obtenerClienteMercadoPago()
  if (!client) {
    throw new Error('Mercado Pago no está configurado (falta MP_ACCESS_TOKEN en el entorno)')
  }

  const emailValido = email && String(email).includes('@') ? email.trim() : null
  if (!emailValido) {
    throw new Error('Se requiere un email válido para iniciar la suscripción de Mercado Pago')
  }

  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '') || 'http://localhost:8787'
  const urlRetorno = backUrl || `${appUrl}/?pago=completado`
  const monto = precioMensualARS()

  const preapprovalApi = obtenerPreapprovalApi(client)

  const payload = {
    body: {
      reason: `Suscripción mensual - ${nombre}`,
      external_reference: String(cuentaId),
      payer_email: emailValido,
      back_url: urlRetorno,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: monto,
        currency_id: 'ARS',
      },
      status: 'pending',
    },
  }

  const respuesta = await preapprovalApi.create(payload)

  return {
    id: respuesta.id,
    init_point: respuesta.init_point,
    monto,
    moneda: 'ARS',
    frecuencia: '1 mes',
  }
}

/**
 * Consulta el estado actual de una suscripción en Mercado Pago.
 */
export async function consultarSuscripcion(preapprovalId) {
  const client = obtenerClienteMercadoPago()
  if (!client) throw new Error('Mercado Pago no está configurado')

  const preapprovalApi = obtenerPreapprovalApi(client)
  return await preapprovalApi.get({ id: preapprovalId })
}

/**
 * Cancela una suscripción en Mercado Pago para que no se vuelva a debitar.
 */
export async function cancelarSuscripcion(preapprovalId) {
  const client = obtenerClienteMercadoPago()
  if (!client) throw new Error('Mercado Pago no está configurado')

  const preapprovalApi = obtenerPreapprovalApi(client)
  return await preapprovalApi.update({
    id: preapprovalId,
    body: { status: 'cancelled' },
  })
}

/**
 * Procesa notificaciones webhook recibidas desde Mercado Pago.
 * Maneja tanto 'subscription_preapproval' (alta, pausa, baja)
 * como 'subscription_authorized_payment' (cobro periódico mensual).
 */
export async function procesarNotificacionWebhook(body) {
  const client = obtenerClienteMercadoPago()
  if (!client) return { ignorado: true, motivo: 'MP no configurado' }

  const tipo = body.type || body.topic || ''
  const dataId = body.data?.id || body.id

  if (!dataId) {
    return { ignorado: true, motivo: 'Sin ID en notificación' }
  }

  if (tipo === 'subscription_preapproval') {
    const preapprovalApi = obtenerPreapprovalApi(client)
    const detalle = await preapprovalApi.get({ id: dataId })

    return {
      tipo: 'suscripcion',
      preapprovalId: detalle.id,
      cuentaId: detalle.external_reference || null,
      status: detalle.status, // 'authorized' | 'paused' | 'cancelled' | 'pending'
      payerEmail: detalle.payer_email,
      proximoCobro: detalle.next_payment_date || null,
      fechaCreacion: detalle.date_created,
      detalle,
    }
  }

  // Notificación de cobro recurrente ejecutado
  if (tipo === 'subscription_authorized_payment' || tipo === 'payment') {
    return {
      tipo: 'cobro',
      paymentId: dataId,
      detalle: body,
    }
  }

  return { ignorado: true, tipo, id: dataId }
}
