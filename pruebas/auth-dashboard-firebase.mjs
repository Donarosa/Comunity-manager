// Pruebas para Autenticación (Google / OTP), Firestore y Dashboard de Usuario.

import assert from 'node:assert/strict'
import * as svc from '../core/service.mjs'

function test(nombre, fn) {
  try {
    fn()
    console.log(`  ✓ ${nombre}`)
  } catch (e) {
    console.log(`  ✗ ${nombre}`)
    console.error(e)
    process.exit(1)
  }
}

async function testAsync(nombre, fn) {
  try {
    await fn()
    console.log(`  ✓ ${nombre}`)
  } catch (e) {
    console.log(`  ✗ ${nombre}`)
    console.error(e)
    process.exit(1)
  }
}

console.log('\nAutenticación OTP')

await testAsync('generación y verificación de código OTP por email', async () => {
  const email = 'test_user_otp@ejemplo.com'
  const envio = await svc.enviarOtp(email)
  assert.equal(envio.ok, true)
  assert.ok(envio.codigoDev)

  // Verificación con código correcto
  const verif = await svc.verificarOtp(email, envio.codigoDev, 'Negocio de Prueba OTP')
  assert.equal(verif.ok, true)
  assert.equal(verif.cuenta.email, email)
  assert.equal(verif.cuenta.nombre, 'Negocio de Prueba OTP')

  // Reintento con código ya consumido debe fallar
  await assert.rejects(async () => {
    await svc.verificarOtp(email, envio.codigoDev)
  }, /No se solicitó ningún código|expiró|incorrecto/)
})

console.log('\nGestión de Cuentas aisladas por Usuario (Firebase Auth UID)')

test('alta y recuperación de cuenta por UID de Firebase', () => {
  const uid = 'fb_usr_test_' + Date.now()
  const res = svc.altaCuenta({
    id: uid,
    userId: uid,
    email: 'firebase.user@test.com',
    nombre: 'Café & Panadería Test',
    foto: 'https://ejemplo.com/avatar.jpg',
  })

  assert.equal(res.cuenta.id, uid)
  assert.equal(res.cuenta.nombre, 'Café & Panadería Test')

  const cuentaLeida = svc.leerCuenta(uid)
  assert.equal(cuentaLeida.id, uid)
  assert.equal(cuentaLeida.userId, uid)
})

console.log('\nDashboard y Métricas Personales')

test('el dashboard agrupa publicaciones, planes, métricas y estado', () => {
  const uid = 'fb_usr_dash_' + Date.now()
  svc.altaCuenta({
    id: uid,
    userId: uid,
    email: 'dash.user@test.com',
    nombre: 'Negocio Dashboard',
  })

  // Configurar marca básica
  svc.configurarMarca(uid, {
    nombre: 'Negocio Dashboard',
    color: '#8C1D2F',
    tipografia: 'editorial',
    handle: '@negocio_dash',
  })

  // Obtener dashboard
  const dash = svc.dashboardUsuario(uid)
  assert.equal(dash.cuenta.id, uid)
  assert.equal(dash.marca.nombre, 'Negocio Dashboard')
  assert.ok(Array.isArray(dash.publicaciones))
  assert.ok(Array.isArray(dash.planes))
  assert.ok(Array.isArray(dash.estadisticas))
  assert.ok(dash.resumenMetricas)
})

console.log('\nTodas las pruebas de Auth, Firebase y Dashboard pasaron correctamente.')
