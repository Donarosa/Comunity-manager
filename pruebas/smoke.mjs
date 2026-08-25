// Prueba de humo: todo lo que no necesita la API de Claude.
//
//   node pruebas/smoke.mjs
//
// Cubre lo que se rompe en silencio: la derivación de paleta, el saneado del
// logo, los contadores de cuota y que los tres formatos rendericen.

import { strict as assert } from 'assert'
import { rmSync, existsSync } from 'fs'
import { normalizeBrand, sanitizeLogoInner, deriveWordmark } from '../core/brand/schema.mjs'
import { derivePalette } from '../core/brand/palette.mjs'
import { contrast, hexToOklch, oklchToHex } from '../core/brand/color.mjs'
import { resolveFonts, FONT_PRESETS } from '../core/brand/fonts.mjs'
import { renderSpec, htmlFor } from '../core/render/engine.mjs'
import { DISPOSICIONES, resolverDisposicion, cssDeDisposiciones } from '../core/render/disposiciones.mjs'
import { verificar, consumir, estado, QuotaError } from '../core/quota/ledger.mjs'
import { planToSpec } from '../core/content/plan.mjs'
import { valorGenerado, REFERENCIA } from '../core/valor.mjs'
import { intercalar, estadoBanco, guardarDelBanco } from '../core/media/imagenes.mjs'
import { altaCuenta, subirLogo } from '../core/service.mjs'

let ok = 0
const test = (nombre, fn) => {
  try { fn(); ok++; console.log('  ✓', nombre) }
  catch (e) { console.error('  ✗', nombre, '\n     ', e.message); process.exitCode = 1 }
}
const testAsync = async (nombre, fn) => {
  try { await fn(); ok++; console.log('  ✓', nombre) }
  catch (e) { console.error('  ✗', nombre, '\n     ', e.message); process.exitCode = 1 }
}

console.log('\ncolor')
test('ida y vuelta sRGB ↔ OKLCH', () => {
  for (const hex of ['#8C1D2F', '#4F46E5', '#FFFFFF', '#000000', '#12B886']) {
    assert.equal(oklchToHex(hexToOklch(hex)), hex.toUpperCase())
  }
})

console.log('\npaleta')
test('un color amarillo flúor no produce texto ilegible', () => {
  const { flat, warnings } = derivePalette({ accent: '#FFE600' })
  assert.ok(contrast(flat.accent, flat.bg) >= 4.4, `contraste ${contrast(flat.accent, flat.bg)}`)
  assert.ok(warnings.length > 0, 'debería avisar que bajó el color')
})
test('todos los pares críticos pasan el mínimo, en varios tonos', () => {
  for (const c of ['#8C1D2F', '#12B886', '#1D4ED8', '#F97316', '#111827', '#E11D48']) {
    const { flat, vector } = derivePalette({ accent: c })
    assert.ok(contrast(flat.ink, flat.bg) >= 7, `${c}: ink/bg`)
    assert.ok(contrast(flat.muted, flat.bg) >= 4.5, `${c}: muted/bg`)
    assert.ok(contrast(flat.accentOnDark, flat.darkBg) >= 4.5, `${c}: accentOnDark/darkBg`)
    assert.ok(contrast(vector.paper, vector.bg) >= 7, `${c}: paper/vector.bg`)
  }
})

console.log('\nlogo')
test('saneado: se caen los atributos de presentación y los tags raros', () => {
  const sucio = '<path d="M 10 10 L 90 90" fill="#f00" stroke="blue" stroke-width="4"/>' +
    '<script>alert(1)</script><image href="http://x/y.png"/><rect x="0" y="0"/>' +
    '<circle cx="50" cy="50" r="10" style="fill:red"/>'
  const limpio = sanitizeLogoInner(sucio)
  assert.ok(!/fill|stroke|script|image|rect|style|href/.test(limpio), limpio)
  assert.ok(limpio.includes('d="M 10 10 L 90 90"'))
  assert.ok(limpio.includes('cx="50"') && limpio.includes('r="10"'))
})
test('saneado: un SVG sin geometría usable devuelve vacío', () => {
  assert.equal(sanitizeLogoInner('<text>ACME</text><g><rect/></g>'), '')
})
test('wordmark de dos tonos', () => {
  assert.deepEqual(deriveWordmark('Panadería Mendieta'), { base: 'Panadería ', accent: 'Mendieta' })
  assert.deepEqual(deriveWordmark('Mendieta'), { base: 'Mendieta', accent: '' })
})

console.log('\ntipografías')
test('cada preset declara sus tres familias en la importUrl', () => {
  for (const p of FONT_PRESETS) {
    const u = decodeURIComponent(p.importUrl).replace(/\+/g, ' ')
    for (const fam of [p.sans, p.serif, p.mono]) {
      assert.ok(u.includes(`family=${fam}:`), `${p.id}: falta ${fam} en importUrl`)
    }
  }
})
test('preset inexistente falla fuerte', () => {
  assert.throws(() => resolveFonts('comic'), /desconocida/)
})

console.log('\nmarca')
test('normalización mínima: solo nombre', () => {
  const { brand } = normalizeBrand({ nombre: 'Ferretería Sur' })
  assert.equal(brand.handle, '@ferreteriasur')
  assert.equal(brand.logo.origen, 'default')
  assert.ok(brand.fonts.importUrl.startsWith('https://fonts.googleapis.com/'))
})
test('sin nombre no hay marca', () => {
  assert.throws(() => normalizeBrand({ color: '#000' }), /nombre/)
})

console.log('\ncuotas')
test('el tope diario corta antes que el mensual', () => {
  const c = { id: 'x', plan: 'unico', consumo: {}, diario: {} }
  consumir(c, 'piezas', 24)
  assert.throws(() => verificar(c, 'piezas', 1), QuotaError)
  const e = estado(c)
  assert.equal(e.restante.piezas.dia, 0)
  assert.equal(e.restante.piezas.mes, 96)
})
test('el error de cuota dice cuánto queda', () => {
  const c = { id: 'x', plan: 'unico', consumo: {}, diario: {} }
  consumir(c, 'piezas', 20)
  try { verificar(c, 'piezas', 10); assert.fail('debió lanzar') }
  catch (e) {
    assert.equal(e.detalle.restante, 4)
    assert.match(e.message, /te quedan 4/)
  }
})
test('el logo tiene tope mensual y no diario', () => {
  const c = { id: 'x', plan: 'unico', consumo: {}, diario: {} }
  consumir(c, 'logos', 1)
  assert.throws(() => verificar(c, 'logos', 1), QuotaError)
  assert.equal(estado(c).restante.logos.dia, null)
})
test('la cuenta interna no tiene techo', () => {
  const c = { id: 'x', plan: 'interno', consumo: {}, diario: {} }
  consumir(c, 'piezas', 5000)
  assert.doesNotThrow(() => verificar(c, 'piezas', 5000))
})

console.log('\nalta')
await testAsync('se puede subir el logo antes de que exista la marca', async () => {
  // Es el orden real del alta: el logo se carga en el paso 3 y la marca se
  // guarda al final de ese mismo paso. Exigir la marca acá rompía el alta de
  // todo negocio que sí tiene logo.
  const { cuenta } = altaCuenta({ nombre: 'Prueba alta' })
  const { logo } = subirLogo(cuenta.id, {
    viewBox: '0 0 100 100',
    inner: '<path d="M 20 20 L 80 80"/>',
    strokeWidth: 8,
  })
  assert.equal(logo.origen, 'usuario')
  assert.ok(logo.inner.includes('M 20 20 L 80 80'))
})
await testAsync('un SVG sin trazos usables se rechaza con un mensaje accionable', async () => {
  const { cuenta } = altaCuenta({ nombre: 'Prueba alta 2' })
  assert.throws(() => subirLogo(cuenta.id, { viewBox: '0 0 100 100', inner: '<text>ACME</text>' }),
    /trazos/)
})

console.log('\nbanco de imágenes')
test('los resultados se intercalan, no se concatenan', () => {
  // Concatenados, el usuario ve veinte de un banco y nunca llega a los otros.
  const mezcla = intercalar([['a1', 'a2', 'a3'], ['b1', 'b2'], ['c1']])
  assert.deepEqual(mezcla, ['a1', 'b1', 'c1', 'a2', 'b2', 'a3'])
})
test('intercalar aguanta listas vacías', () => {
  assert.deepEqual(intercalar([[], ['b1'], []]), ['b1'])
  assert.deepEqual(intercalar([]), [])
})
test('Openverse funciona sin clave; los demás quedan listados como faltantes', () => {
  const { activos, faltantes } = estadoBanco()
  assert.ok(activos.some(a => a.id === 'openverse'), 'openverse tiene que andar sin configurar nada')
  for (const f of faltantes) assert.ok(f.clave && f.alta, `${f.id} tiene que decir qué clave falta y dónde sacarla`)
})
await testAsync('un id de banco desconocido no llega a hacer un pedido', async () => {
  await assert.rejects(() => guardarDelBanco('x', 'imgur:123'), /no conozco el banco/)
})
await testAsync('un id malformado se rechaza antes de salir a la red', async () => {
  await assert.rejects(() => guardarDelBanco('x', 'openverse:../../etc/passwd'), /inválido/)
})

console.log('\nvalor generado')
test('suma las placas de todos los meses, no solo del actual', () => {
  const c = { id: 'x', plan: 'unico', consumo: { '2026-06': { piezas: 20 }, '2026-07': { piezas: 12 }, '2026-08': { piezas: 6 } } }
  const v = valorGenerado(c, '2026-08')
  assert.equal(v.placasTotal, 38)
  assert.equal(v.placasMes, 6)
  assert.equal(v.equivalenteTotal, 38 * REFERENCIA.precioPorPlaca)
})
test('una cuenta sin consumo no inventa números', () => {
  const v = valorGenerado({ id: 'x', plan: 'unico' }, '2026-08')
  assert.equal(v.placasTotal, 0)
  assert.equal(v.equivalenteTotal, 0)
})
test('el precio de referencia sale declarado en el texto', () => {
  const v = valorGenerado({ id: 'x', plan: 'unico', consumo: { '2026-08': { piezas: 5 } } }, '2026-08')
  assert.match(v.texto.aclaracion, /la placa/)
  assert.ok(v.texto.aclaracion.includes(String(REFERENCIA.precioPorPlaca)),
    'la aclaración tiene que decir a qué precio se hizo la cuenta')
})

console.log('\nplan → spec')
test('un carrusel numera las placas y una placa suelta no', () => {
  const plan = {
    resumen: 'x',
    publicaciones: [
      { dia: 'lunes', canal: 'feed', objetivo: 'o', caption: 'c', hashtags: [], notaFoto: '', placas: [
        { plantilla: 'portada', kicker: 'K', titulo: 'T', cuerpo: 'C', pasos: [], chips: [], emoji: '', fuente: '', linea2: '' },
        { plantilla: 'cierre', kicker: 'K', titulo: 'T', cuerpo: 'C', pasos: [], chips: [], emoji: '', fuente: '', linea2: '' },
      ] },
      { dia: 'martes', canal: 'historia', objetivo: 'o', caption: 'c', hashtags: [], notaFoto: '', placas: [
        { plantilla: 'texto', kicker: 'K', titulo: 'T', cuerpo: 'C', pasos: [], chips: [], emoji: '', fuente: '', linea2: '' },
      ] },
    ],
  }
  const { spec, publicaciones } = planToSpec(plan, { outDir: '/tmp/x' })
  assert.equal(spec.slides.length, 3)
  assert.equal(spec.slides[0].idx, '01/02')
  assert.equal(spec.slides[2].idx, '')
  assert.equal(spec.slides[2].format, 'story')
  assert.deepEqual(publicaciones[0].archivos, ['01-post-01.png', '01-post-02.png'])
})
test('una placa de foto sin imagen queda pendiente, no rompe el render', () => {
  const plan = { resumen: '', publicaciones: [
    { dia: 'lunes', canal: 'feed', objetivo: 'o', caption: 'c', hashtags: [], notaFoto: 'sacá el mostrador', placas: [
      { plantilla: 'foto', kicker: '', titulo: 'L1', cuerpo: '', pasos: [], chips: [], emoji: '', fuente: '', linea2: 'L2' },
    ] },
  ] }
  const { spec, pendientes } = planToSpec(plan, { outDir: '/tmp/x' })
  assert.equal(spec.slides.length, 0)
  assert.equal(pendientes.length, 1)
  assert.equal(pendientes[0].notaFoto, 'sacá el mostrador')
})

console.log('\nrender (abre Chrome)')
const { brand } = normalizeBrand({
  nombre: 'Panadería Mendieta', color: '#8C1D2F', tipografia: 'calido',
  handle: 'panaderiamendieta', rubro: 'panadería de barrio', ciudad: 'Rosario',
})
const dir = 'placas/prueba'
rmSync(dir, { recursive: true, force: true })

const slides = [
  { name: 'a-feed', format: 'feed', style: 'flat', type: 'cover', kick: 'Prueba', title: 'Formato <span class="acc">feed</span>', body: 'Mil ochenta por mil trescientos cincuenta. El de siempre, el que más espacio ocupa en el feed.' },
  { name: 'b-story', format: 'story', style: 'flat', type: 'body', kick: 'Prueba', title: 'Formato <span class="acc">historia</span>', body: 'Mil ochenta por mil novecientos veinte, con las zonas seguras de arriba y abajo respetadas.' },
  { name: 'c-story-vector', format: 'story', style: 'vector', eyebrow: 'Prueba', headline: 'La frase <em>que no</em> necesita explicación.' },
  { name: 'd-cuadrado', format: 'cuadrado', style: 'flat', type: 'pista', emoji: '🥖', kick: 'Prueba', title: 'Formato <span class="acc">cuadrado</span>', body: 'Mil ochenta por mil ochenta, para cuando el feed es una grilla.', chips: ['Chip uno', 'Chip dos'] },
  { name: 'e-story-cierre', format: 'story', style: 'flat', type: 'trial', pill: 'Oferta', title: 'Cierre en <span class="acc">historia</span>', body: 'La placa que pide la acción, en vertical.' },
]

const hechas = await renderSpec({ spec: { slides }, brand, outDir: dir })
for (const r of hechas) {
  test(`renderizó ${r.name} (${r.format})`, () => assert.ok(existsSync(r.file)))
}

console.log(`\n${ok} pruebas OK${process.exitCode ? ' — con fallas' : ''}\n`)

console.log('\ndisposiciones')
test('las cinco existen y una desconocida falla fuerte', () => {
  const ids = Object.keys(DISPOSICIONES)
  assert.equal(ids.length, 5)
  assert.ok(ids.includes('clasica'))
  assert.throws(() => resolverDisposicion('inventada'), /desconocida/)
})
test('cambian de verdad el tamaño del título, no solo el nombre', () => {
  const escalas = Object.values(DISPOSICIONES).map(d => d.titulo)
  assert.equal(new Set(escalas).size, escalas.length, 'dos disposiciones con la misma escala no se distinguen')
  assert.ok(Math.max(...escalas) / Math.min(...escalas) > 2, 'el rango de escalas es demasiado chico para notarse')
})
test('el CSS de todas se inyecta siempre; la clase del body elige', () => {
  const css = cssDeDisposiciones()
  for (const id of Object.keys(DISPOSICIONES)) {
    if (id === 'clasica') continue  // la clásica es la base, no agrega reglas
    assert.ok(css.includes(`disp-${id}`), `falta el CSS de ${id}`)
  }
})
test('la marca guarda la disposición y rechaza una inválida', () => {
  const { brand } = normalizeBrand({ nombre: 'X', disposicion: 'titular' })
  assert.equal(brand.disposicion, 'titular')
  assert.equal(normalizeBrand({ nombre: 'X' }).brand.disposicion, 'clasica')
  assert.throws(() => normalizeBrand({ nombre: 'X', disposicion: 'ninguna' }), /desconocida/)
})
test('una placa puede pisar la disposición de la marca', () => {
  const marca = normalizeBrand({ nombre: 'X', disposicion: 'clasica' }).brand
  const base = { name: 'p', style: 'flat', type: 'body', kick: 'k', title: 't', body: 'b' }
  assert.ok(htmlFor(base, marca, 'feed').includes('disp-clasica'))
  assert.ok(htmlFor({ ...base, disposicion: 'ficha' }, marca, 'feed').includes('disp-ficha'))
})
