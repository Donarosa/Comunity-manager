import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { manejador } from '../core/api/server.mjs'
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

console.log('\nMétricas de Landing — Servicio y Store')

await testAsync('registro de visita y cálculo de métricas', async () => {
  const vId = 'test_vid_' + Math.random().toString(36).slice(2)
  const eventoVisita = svc.registrarEventoDeLanding({
    tipo: 'visita',
    visitanteId: vId,
    dispositivo: 'desktop',
    path: '/',
  })
  assert.equal(eventoVisita.tipo, 'visita')
  assert.equal(eventoVisita.visitanteId, vId)

  const metricas = await svc.metricasLanding()
  assert.ok(metricas.resumen.totalVisitas > 0)
  assert.ok(metricas.resumen.visitasHoy > 0)
  assert.ok(metricas.dias.length === 14)
})

await testAsync('registro de clics por botón y tasa CTR', async () => {
  const vId = 'test_vid_click_' + Math.random().toString(36).slice(2)
  const eventoClick = svc.registrarEventoDeLanding({
    tipo: 'click',
    visitanteId: vId,
    dispositivo: 'mobile',
    botonId: 'hero_empezar',
    texto: 'Empezar con Alquimia',
    seccion: 'Hero',
  })
  assert.equal(eventoClick.tipo, 'click')
  assert.equal(eventoClick.botonId, 'hero_empezar')

  const metricas = await svc.metricasLanding()
  assert.ok(metricas.resumen.totalClicks > 0)
  assert.ok(metricas.resumen.clicksHoy > 0)
  const btnHero = metricas.clicksPorBoton.find(b => b.id === 'hero_empezar')
  assert.ok(btnHero)
  assert.ok(btnHero.clicks > 0)
  assert.ok(btnHero.pct > 0)
})

console.log('\nEndpoints HTTP de Landing y Admin')

await testAsync('servidor HTTP: registro público y panel admin protegido', async () => {
  const server = createServer(manejador)
  await new Promise(r => server.listen(0, r))
  const port = server.address().port
  const base = `http://localhost:${port}`

  try {
    // 1. Registro público de visita vía POST /landing/evento
    const resVisita = await fetch(`${base}/landing/evento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'visita',
        visitanteId: 'vid_http_test',
        dispositivo: 'mobile',
        path: '/#precios',
      }),
    })
    assert.equal(resVisita.status, 200)
    const jsonVisita = await resVisita.json()
    assert.equal(jsonVisita.ok, true)

    // 2. Registro público de clic vía POST /landing/evento
    const resClick = await fetch(`${base}/landing/evento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'click',
        visitanteId: 'vid_http_test',
        dispositivo: 'mobile',
        botonId: 'precios_plan_pro',
        texto: 'Probar 1 semana gratis',
        seccion: 'Precios',
      }),
    })
    assert.equal(resClick.status, 200)
    const jsonClick = await resClick.json()
    assert.equal(jsonClick.ok, true)

    // 3. GET /admin/landing sin token -> 401
    const resSinToken = await fetch(`${base}/admin/landing`)
    assert.equal(resSinToken.status, 401)

    // 4. Login admin
    const emailAdmin = process.env.ADMIN_EMAIL || 'santiagovillarruel@gmail.com'
    // Para testear creamos un token o probamos con las rutas autenticadas
    // Si conocemos el token o usamos handleLogin:
    // Probemos login o usemos token si coincide la contraseña, de lo contrario
    // generamos un token directamente con el secreto del entorno
    const { createHmac } = await import('node:crypto')
    const secret = process.env.ADMIN_JWT_SECRET
    assert.ok(secret, 'ADMIN_JWT_SECRET debe existir en .env')

    const b64 = buf => Buffer.from(buf).toString('base64url')
    const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const b = b64(JSON.stringify({ rol: 'admin', email: emailAdmin, exp: Date.now() + 3600000 }))
    const sig = createHmac('sha256', secret).update(`${h}.${b}`).digest()
    const token = `${h}.${b}.${b64(sig)}`

    // 5. GET /admin/landing con token -> 200
    const resAdminLanding = await fetch(`${base}/admin/landing`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(resAdminLanding.status, 200)
    const dataLanding = await resAdminLanding.json()
    assert.ok(dataLanding.resumen)
    assert.ok(dataLanding.resumen.totalVisitas > 0)
    assert.ok(dataLanding.resumen.totalClicks > 0)
    assert.ok(Array.isArray(dataLanding.dias))
    assert.ok(Array.isArray(dataLanding.clicksPorBoton))
    assert.ok(Array.isArray(dataLanding.eventosRecientes))

    // 6. GET /admin/analitica con token -> debe incluir métricas de landing en resumen
    const resAnalitica = await fetch(`${base}/admin/analitica`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(resAnalitica.status, 200)
    const dataAnalitica = await resAnalitica.json()
    assert.ok(dataAnalitica.resumen.visitasLanding !== undefined)
    assert.ok(dataAnalitica.resumen.clicksLanding !== undefined)
    assert.ok(dataAnalitica.resumen.ctrLanding !== undefined)

  } finally {
    server.close()
  }
})

console.log('\nTodas las pruebas de landing pasaron exitosamente.\n')
