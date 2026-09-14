// ¿Existen de verdad las tipografías que declaramos?
//
// No va en las pruebas de humo porque necesita red, y `npm run prueba` tiene que
// andar sin conexión. Se corre a mano el día que se agrega una familia.
//
// El error que atrapa es silencioso y caro: un nombre de familia mal escrito
// forma igual una URL válida de Google Fonts, la hoja vuelve vacía, y la placa
// se renderiza con la tipografía de respaldo. No falla nada; sale la marca
// equivocada y nadie se entera hasta que el cliente la ve publicada.
//
//   node pruebas/fuentes.mjs

import { FONT_PRESETS, LOGO_FONTS } from '../core/brand/fonts.mjs'

// Google devuelve una hoja distinta según el navegador que pide: sin un agente
// moderno manda formatos viejos y el recuento de archivos engaña.
const AGENTE = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

let fallas = 0

async function comprobar(etiqueta, familias, url) {
  const res = await fetch(url, { headers: { 'user-agent': AGENTE } })
  const css = res.ok ? await res.text() : ''
  const declaradas = new Set([...css.matchAll(/font-family: '([^']+)'/g)].map(m => m[1]))
  const archivos = (css.match(/url\(/g) || []).length
  const faltan = familias.filter(f => !declaradas.has(f))

  if (!res.ok || archivos === 0 || faltan.length) {
    fallas++
    console.log(`  ✗ ${etiqueta}`)
    if (!res.ok) console.log(`      Google respondió ${res.status}`)
    else if (!archivos) console.log('      la hoja vino sin un solo archivo de fuente')
    else console.log(`      no las sirve: ${faltan.join(', ')}`)
    console.log(`      ${url}`)
    return
  }
  console.log(`  ✓ ${etiqueta.padEnd(34)} ${archivos} archivos`)
}

console.log('\ntipografías de texto')
for (const p of FONT_PRESETS) {
  await comprobar(`${p.id} · ${p.sans} / ${p.serif} / ${p.mono}`,
    [p.sans, p.serif, p.mono].filter(Boolean), p.importUrl)
}

console.log('\ntipografías de logotipo')
for (const f of LOGO_FONTS.filter(f => f.family)) {
  await comprobar(`${f.id} · ${f.family}`, [f.family], f.importUrl)
}

console.log(fallas
  ? `\n${fallas} familia(s) que no se sirven — la placa saldría en la tipografía de respaldo\n`
  : '\ntodas las familias se sirven\n')
process.exitCode = fallas ? 1 : 0
