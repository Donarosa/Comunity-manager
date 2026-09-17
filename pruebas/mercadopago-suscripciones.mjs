// Prueba automatizada de integración de Mercado Pago (Suscripciones mensuales y Webhooks).

import assert from 'node:assert/strict'
import * as mp from '../core/pagos/mercadopago.mjs'
import * as svc from '../core/service.mjs'
import { crearCuenta, leerCuenta, eliminarCuenta } from '../core/store/store.mjs'

async function probar() {
  console.log('🧪 Iniciando pruebas de Mercado Pago y Suscripciones...')

  // 1. Configuración por defecto
  assert.equal(typeof mp.precioMensualARS(), 'number')
  assert.ok(mp.precioMensualARS() > 0)
  console.log(`✅ Configuración básica validada: precio mensual ARS = $${mp.precioMensualARS()}`)

  // 2. Creación de cuenta de prueba
  const testId = `test_mp_${Date.now()}`
  const cuenta = crearCuenta({
    id: testId,
    email: 'test_usuario@ejemplo.com',
    nombre: 'Usuario Prueba MP',
  })
  assert.equal(cuenta.id, testId)
  assert.equal(cuenta.suscripcion, undefined)
  console.log('✅ Cuenta de prueba creada localmente.')

  // 3. Mock de API de Mercado Pago para simular suscripciones
  const mockPreapproval = {
    create: async (payload) => ({
      id: 'mock_preapproval_12345',
      init_point: 'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=mock_preapproval_12345',
      ...payload.body,
    }),
    get: async ({ id }) => ({
      id,
      external_reference: testId,
      status: 'authorized',
      payer_email: 'test_usuario@ejemplo.com',
      next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      date_created: new Date().toISOString(),
    }),
    update: async ({ id, body }) => ({
      id,
      status: body.status,
    }),
  }

  mp._setMock({ preapproval: mockPreapproval })

  // 4. Iniciar suscripción desde el servicio
  const resInicio = await svc.iniciarSuscripcionParaCuenta(testId, {
    backUrl: 'http://localhost:8787/?pago=completado',
  })
  assert.equal(resInicio.id, 'mock_preapproval_12345')
  assert.ok(resInicio.init_point.includes('mock_preapproval_12345'))
  console.log('✅ Inicio de suscripción con PreApproval generó init_point correctamente.')

  // 5. Simular webhook de Mercado Pago informando 'authorized'
  const eventoSimulado = {
    type: 'subscription_preapproval',
    data: { id: 'mock_preapproval_12345' },
  }

  const resultadoWebhook = await svc.procesarWebhookMercadoPago(eventoSimulado)
  assert.equal(resultadoWebhook.ok, true)
  assert.equal(resultadoWebhook.status, 'authorized')

  const cuentaActualizada = leerCuenta(testId)
  assert.ok(cuentaActualizada.suscripcion)
  assert.equal(cuentaActualizada.suscripcion.activa, true)
  assert.equal(cuentaActualizada.suscripcion.estado, 'authorized')
  assert.equal(cuentaActualizada.suscripcion.id, 'mock_preapproval_12345')
  assert.ok(cuentaActualizada.suscripcion.proximoCobro)
  console.log('✅ Webhook de suscripción autorizada activó la suscripción en Firestore/Store.')

  // 6. Consultar estado desde el servicio
  const estadoSub = await svc.obtenerEstadoSuscripcion(testId)
  assert.equal(estadoSub.suscripcion.activa, true)
  assert.equal(estadoSub.suscripcion.estado, 'authorized')
  console.log('✅ Consulta de estado de suscripción exitosa.')

  // 7. Cancelación de suscripción
  const resCancel = await svc.cancelarSuscripcionDeCuenta(testId)
  assert.equal(resCancel.ok, true)

  const cuentaCancelada = leerCuenta(testId)
  assert.equal(cuentaCancelada.suscripcion.activa, false)
  assert.equal(cuentaCancelada.suscripcion.estado, 'cancelled')
  console.log('✅ Cancelación de suscripción procesada correctamente.')

  // Restaurar mock
  mp._restaurarMock()

  // Limpieza
  eliminarCuenta(testId)
  console.log('✅ Limpieza de datos completada.')
  console.log('\n🎉 ¡Todas las pruebas de suscripción y Mercado Pago pasaron exitosamente!')
}

probar().catch((err) => {
  console.error('❌ Error en las pruebas:', err)
  process.exit(1)
})
