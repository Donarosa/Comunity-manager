// Las pantallas del flujo de "Sugerime", sacadas de la aplicación de verdad.
//
//   npm run web            (en otra terminal)
//   node video/capturar-flujo.mjs
//     → video/assets/flujo-1-inicio.png
//     → video/assets/flujo-2-tema.png
//     → video/assets/flujo-3-forma.png
//     → video/assets/flujo-4-armando.png
//     → video/assets/flujo-5-listo.png
//
// Se abre la aplicación, se la opera y se le saca una foto a cada paso. No son
// maquetas: es la pantalla que va a ver quien toque el aviso. El día que cambie
// un botón de lugar, se vuelve a correr esto y el comercial se actualiza.
//
// Lo único simulado es la respuesta del modelo: acá no hay clave de IA, así que
// se intercepta esa única llamada y se devuelve un plan armado a mano que apunta
// a placas de verdad —las que genera `video/piezas-demo.mjs` con el motor—. El
// resto del camino, incluida la ruta que sirve las placas, es el de producción.

import { writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
import { findChrome } from '../core/render/engine.mjs'

const SITIO = process.env.SITIO || 'http://localhost:8787'
const SESION = process.env.SESION || 'loc_1964'
const TEMA = process.env.TEMA || 'los inflables tapan el filtro de la pileta'

const PLAN = {
  resumen: 'Un carrusel que explica por qué los inflables ensucian el filtro y qué hacer después de cada uso.',
  carpeta: `data/piezas/${SESION}/demo-video`,
  estado: { valor: { usadas: 4, tope: 120 } },
  pendientes: [],
  publicaciones: [{
    id: 'demo', dia: 'Jueves', canal: 'feed',
    objetivo: 'Explicar por qué los inflables afectan la filtración y qué hacer después de cada uso.',
    caption: 'Los inflables son los infaltables del verano 🏖 Pero si los dejás flotando días enteros, el filtro empieza a trabajar de más y el agua se pone turbia.\n\nSacalos, enjuagalos y guardalos secos. Tres minutos que te ahorran una semana de agua verde.\n\n¿Tenés dudas con tu filtro? Escribinos y te decimos qué revisar.',
    hashtags: ['#piletas', '#piletasdefibra', '#mantenimiento', '#verano', '#cordoba'],
    archivos: [
      `/piezas/${SESION}/demo-video/carrusel-01.png`,
      `/piezas/${SESION}/demo-video/carrusel-02.png`,
      `/piezas/${SESION}/demo-video/carrusel-03.png`,
      `/piezas/${SESION}/demo-video/carrusel-04.png`,
    ],
  }],
}

const navegador = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none', '--force-color-profile=srgb'],
})
const p = await navegador.newPage()
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })

await p.evaluateOnNewDocument((sesion, plan) => {
  localStorage.setItem('cm.auth.token', sesion)
  localStorage.setItem('cm.cuenta', sesion)
  localStorage.setItem('cm.auth.usuario', JSON.stringify({
    id: sesion, email: 'hola@piletassol.com', nombre: 'Piletas SOL',
    proveedor: 'local', metodo: 'local',
  }))
  // La única llamada que se simula, y se simula porque no hay clave de IA en
  // esta máquina — no porque la pantalla sea de mentira.
  const real = window.fetch
  window.fetch = (url, opts) => {
    if (!String(url?.url || url).includes('/contenido')) return real(url, opts)
    // Con la respuesta instantánea no hay pantalla de espera que fotografiar, y
    // el frasco burbujeando es uno de los momentos del aviso. Tres segundos es
    // más o menos lo que tarda de verdad.
    return new Promise(ok => setTimeout(
      () => ok(new Response(JSON.stringify(plan), { status: 200, headers: { 'content-type': 'application/json' } })),
      3000))
  }
}, SESION, PLAN)

const esperar = ms => new Promise(r => setTimeout(r, ms))

/* Dónde cae cada toque, medido y no estimado.
 *
 * El comercial dibuja un dedo sobre la pantalla del teléfono, y si la posición
 * la pongo yo a ojo, el día que un botón se mueva el dedo queda tocando el
 * aire. Se guarda en fracciones del alto y el ancho para que no dependa del
 * tamaño de la captura. */
const toques = {}
const tocar = async (texto, paso) => {
  const caja = await p.evaluate(t => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(t))
    if (!b) return null
    const r = b.getBoundingClientRect()
    b.click()
    return {
      x: (r.left + r.width / 2) / innerWidth,
      y: (r.top + r.height / 2) / innerHeight,
    }
  }, texto)
  if (!caja) throw new Error(`no encontré el botón "${texto}"`)
  if (paso) toques[paso] = caja
}
const limpiar = () => p.evaluate(() => {
  // Ni el correo de la cuenta ni la salida de sesión van en un aviso.
  for (const n of document.querySelectorAll('p, span, div')) {
    if (!n.children.length && /@/.test(n.textContent) && n.textContent.length < 40) n.textContent = ''
  }
  const salir = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Cerrar sesión'))
  if (salir) salir.style.visibility = 'hidden'
  // El botón que se va a tocar, congelado arriba de su flotado.
  const s = document.querySelector('.btn-sugerime')
  s?.getAnimations().forEach(a => { a.currentTime = 900 + 0.5 * 2200; a.pause() })
  s?.querySelector('.chispa')?.getAnimations().forEach(a => { a.currentTime = 900 + 0.72 * 3400; a.pause() })
  window.scrollTo(0, 0)
})
const foto = async nombre => {
  await limpiar()
  await esperar(350)
  await p.screenshot({ path: `video/assets/flujo-${nombre}.png` })
  console.log('  ✓', nombre)
}

await p.goto(SITIO, { waitUntil: 'networkidle2' })
await esperar(3500)
await foto('1-inicio')

await tocar('Sugerime', '1-inicio')
await esperar(1200)
// El tema, escrito como lo escribiría una persona.
await p.evaluate(t => {
  const ta = document.querySelector('textarea')
  ta.value = t
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}, TEMA)
await foto('2-tema')

await tocar('Seguir', '2-tema')
await esperar(900)
await foto('3-forma')

// Elegir carrusel y arrancar: la pantalla de espera dura poco, así que se la
// atrapa antes de que el plan simulado conteste.
toques['3-forma'] = await p.evaluate(() => {
  const c = [...document.querySelectorAll('button, .opcion')].find(x => /Un carrusel/.test(x.textContent))
  const r = c.getBoundingClientRect()
  c.click()
  return { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight }
})
await esperar(500)
await tocar('Armar la publicación')
await esperar(1400)
await foto('4-armando')

await esperar(3200)
await p.evaluate(() => window.scrollTo(0, 0))
await foto('5-listo')

writeFileSync('video/assets/flujo.json', JSON.stringify({ toques, tema: TEMA }, null, 2))
await navegador.close()
console.log('\nlisto · video/assets/flujo-*.png + flujo.json')
