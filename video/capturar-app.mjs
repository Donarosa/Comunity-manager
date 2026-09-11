// Captura de la aplicación para el comercial, al doble de resolución.
//
// La captura del navegador de pruebas sale a 390 píxeles de ancho, y en un
// lienzo de 1080 la pantalla del teléfono mide unos 560: estirada se ve blanda.
// Acá se abre con `deviceScaleFactor: 2` y sale nítida.
//
//   node video/capturar-app.mjs            (necesita `npm run web` levantado)

import puppeteer from 'puppeteer-core'
import { findChrome } from '../core/render/engine.mjs'

const SITIO = process.env.SITIO || 'http://localhost:8787'
const SESION = process.env.SESION || 'loc_1964'

const navegador = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none'],
})

const pagina = await navegador.newPage()
await pagina.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })

// La sesión de trabajo, escrita antes de que arranque la aplicación.
await pagina.evaluateOnNewDocument(sesion => {
  localStorage.setItem('cm.auth.token', sesion)
  localStorage.setItem('cm.cuenta', sesion)
  localStorage.setItem('cm.auth.usuario', JSON.stringify({
    id: sesion, email: 'hola@piletassol.com', nombre: 'Piletas SOL',
    proveedor: 'local', metodo: 'local',
  }))
}, SESION)

await pagina.goto(SITIO, { waitUntil: 'networkidle2' })
await new Promise(r => setTimeout(r, 3500))

// Lo que no va en un comercial: el correo de la cuenta y la salida de sesión.
await pagina.evaluate(() => {
  for (const n of document.querySelectorAll('p, span, div')) {
    if (!n.children.length && /@/.test(n.textContent) && n.textContent.length < 40) n.textContent = ''
  }
  const salir = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Cerrar sesión'))
  if (salir) salir.style.visibility = 'hidden'
  // El botón de sugerir, congelado arriba del flotado: es el que se va a tocar.
  const b = document.querySelector('.btn-sugerime')
  b?.getAnimations().forEach(a => { a.currentTime = 900 + 0.5 * 2200; a.pause() })
  b?.querySelector('.chispa')?.getAnimations().forEach(a => { a.currentTime = 900 + 0.72 * 3400; a.pause() })
  window.scrollTo(0, 0)
})
await new Promise(r => setTimeout(r, 500))
await pagina.screenshot({ path: 'video/assets/app-home.png' })

await navegador.close()
console.log('listo · video/assets/app-home.png')
