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
import { resolveFonts, FONT_PRESETS, LOGO_FONTS, resolveLogoFont } from '../core/brand/fonts.mjs'
import { renderSpec, htmlFor } from '../core/render/engine.mjs'
import { DISPOSICIONES, resolverDisposicion, cssDeDisposiciones } from '../core/render/disposiciones.mjs'
import { TIPOS, resolverTipo, resolverEscudo, iniciales, tratamientosPara, monogramaHTML, monogramaCSS, descriptor, selloHTML } from '../core/brand/logotipo.mjs'
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
  assert.equal(brand.logo.origen, 'default')
  assert.ok(brand.fonts.importUrl.startsWith('https://fonts.googleapis.com/'))
})
test('sin usuario de IG no se inventa uno', () => {
  const { brand, warnings } = normalizeBrand({ nombre: 'Ferretería Sur' })
  assert.equal(brand.handle, null)
  // El pie tiene que decir algo cierto, no una dirección que no existe.
  assert.equal(brand.site, 'Ferretería Sur')
  assert.ok(!brand.site.includes('instagram.com'))
  assert.ok(warnings.some(w => /usuario de Instagram/i.test(w)))
})
test('con usuario de IG el pie es el perfil', () => {
  const { brand } = normalizeBrand({ nombre: 'Ferretería Sur', handle: '@ferresur' })
  assert.equal(brand.handle, '@ferresur')
  assert.equal(brand.site, 'instagram.com/ferresur')
})
test('el sitio propio le gana al usuario', () => {
  const { brand } = normalizeBrand({ nombre: 'Ferretería Sur', handle: 'ferresur', sitio: 'https://ferresur.com.ar' })
  assert.equal(brand.site, 'ferresur.com.ar')
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

console.log('\nlogotipo')
test('los cuatro tipos existen y uno inventado falla fuerte', () => {
  assert.deepEqual(TIPOS.map(t => t.id), ['palabra', 'palabra-simbolo', 'sello', 'simbolo'])
  assert.throws(() => resolverTipo('emblema'), /desconocido/)
})
test('las iniciales saltean los conectores', () => {
  assert.equal(iniciales('Vivero Las Acacias'), 'VA')
  assert.equal(iniciales('Estudio de las Artes'), 'EA')
  assert.equal(iniciales('Mendieta'), 'M')
  assert.equal(iniciales(''), '?')
})
test('apilado se ofrece solo si hay dos palabras', () => {
  const dos = tratamientosPara({ base: 'Vivero Las ', accent: 'Acacias' }).map(t => t.id)
  const una = tratamientosPara({ base: 'Mendieta', accent: '' }).map(t => t.id)
  assert.ok(dos.includes('apilado'))
  assert.ok(!una.includes('apilado'), 'con una palabra no hay nada que apilar')
})
test('un nombre de una palabra no rompe aunque pidan apilado', () => {
  const { brand } = normalizeBrand({ nombre: 'Mendieta', logotipoTratamiento: 'apilado' })
  assert.notEqual(brand.logotipo.tratamiento, 'apilado')
  assert.ok(brand.logotipo.tratamiento)
})
test('cada tipo produce un lockup distinto en la placa', () => {
  // Hay que mirar las clases del <body>, no todo el HTML: el CSS de los tres
  // tipos se inyecta siempre y la clase del body es la que elige cuál aplica.
  const clases = tipo => {
    const b = normalizeBrand({ nombre: 'Vivero Las Acacias', logotipoTipo: tipo }).brand
    const html = htmlFor({ name: 'p', style: 'flat', type: 'body', kick: 'k', title: 't', body: 'b' }, b, 'feed')
    return html.match(/<body class="([^"]*)"/)[1]
  }
  assert.ok(clases('palabra').includes('lg-solo-palabra'))
  assert.ok(clases('simbolo').includes('lg-solo-simbolo'))
  assert.ok(!clases('palabra-simbolo').includes('lg-solo-'), 'con ambos no se oculta ninguna parte')
})
test('sin logo propio el símbolo es el monograma, no un icono ajeno', () => {
  const b = normalizeBrand({ nombre: 'Vivero Las Acacias', logotipoTipo: 'palabra-simbolo' }).brand
  const html = htmlFor({ name: 'p', style: 'flat', type: 'body', kick: 'k', title: 't', body: 'b' }, b, 'feed')
  assert.match(html, /class="mono mono-\w+"/, 'debería usar monograma')
  assert.ok(html.includes('>VA<'), 'con las iniciales del negocio')
})
test('las variantes de símbolo producen marcas distintas entre sí', () => {
  // Con una sola forma, tres clientes que elijan "nombre y símbolo" terminan
  // con el mismo círculo y dos letras. Cada variante tiene que dar otra cosa.
  const html = escudo => monogramaHTML({ nombre: 'Vivero Las Acacias', escudo, px: 40 })
  const variantes = ['circulo', 'cuadrado', 'contorno', 'letra', 'barra']
  const salidas = variantes.map(html)
  assert.equal(new Set(salidas).size, variantes.length, 'dos variantes producen lo mismo')
  assert.ok(html('letra').includes('>V<'), 'la variante "letra" usa una sola inicial')
  // Sin fondo, la inicial tiene que pesar más que las de un círculo, no menos.
  const px = v => Number(/font-size:([\d.]+)px/.exec(monogramaHTML({ nombre: 'Vivero Las Acacias', escudo: v, px: 40 }))[1])
  assert.ok(px('letra') > px('circulo') * 1.5, `la inicial suelta salió chica: ${px('letra')}px`)
  // El font-size va inline: una regla en la hoja de estilo perdería contra él.
  assert.ok(!/\.mono-letra\{[^}]*font-size/.test(monogramaCSS()), 'el font-size del escudo no puede vivir en el CSS')
  assert.ok(html('barra').includes('></span>'), 'la barra no lleva letras')
  assert.throws(() => resolverEscudo('rombo'), /desconocido/)
})

console.log('\ncampos vacíos')
test('un campo opcional vacío no estampa "undefined"', () => {
  const { brand } = normalizeBrand({ nombre: 'Verdulería Mendoza', color: '#3F7A3A' })
  // Sin kick, sin body y sin hint: lo que falta no se dibuja.
  const html = htmlFor({ type: 'cover', format: 'feed', title: 'Tomates' }, brand)
  assert.ok(!/undefined/i.test(html), 'se coló un "undefined" en la placa')
  assert.ok(!html.includes('class="kick"'), 'dibujó el copete vacío')
  assert.ok(html.includes('Tomates'))
})
test('sin título la placa no se renderiza', () => {
  const { brand } = normalizeBrand({ nombre: 'Verdulería Mendoza' })
  assert.throws(() => htmlFor({ type: 'cover', format: 'feed', body: 'algo' }, brand), /título/)
  assert.throws(() => htmlFor({ style: 'vector', format: 'feed', eyebrow: 'x' }, brand), /titular/)
})
test('el pie sin usuario de IG no inventa una dirección', () => {
  const { brand } = normalizeBrand({ nombre: 'Verdulería Mendoza' })
  const html = htmlFor({ type: 'cover', format: 'feed', title: 'Tomates' }, brand)
  assert.ok(html.includes('Verdulería Mendoza'))
  assert.ok(!html.includes('instagram.com/'), 'estampó un perfil que puede no existir')
})

console.log('\ntipografía de logotipo')
test('el catálogo existe y un id inventado falla fuerte', () => {
  assert.ok(LOGO_FONTS.length >= 8)
  assert.throws(() => resolveLogoFont('comic'), /desconocida/)
})
test('"mismo" cae al palo seco del texto', () => {
  const f = resolveFonts('calido', 'mismo')
  assert.equal(f.logo.family, f.sans)
  assert.equal(f.importUrls.length, 1, 'no hace falta pedir una segunda familia')
})
test('una fuente propia de logotipo se pide aparte', () => {
  const f = resolveFonts('calido', 'script')
  assert.equal(f.logo.family, 'Kaushan Script')
  assert.notEqual(f.logo.family, f.sans)
  assert.equal(f.importUrls.length, 2)
  assert.ok(f.importUrls[1].includes('Kaushan+Script'))
})
test('las manuscritas no se usan en el monograma', () => {
  // Dos letras enlazadas en 40px no se leen; la sigla cae al palo seco.
  for (const id of ['script', 'caligrafica']) {
    const f = resolveFonts('calido', id)
    assert.equal(f.logo.monogramaFamily, f.sans, `${id} dejó el monograma en script`)
  }
  const anton = resolveFonts('calido', 'compacta')
  assert.equal(anton.logo.monogramaFamily, 'Anton', 'las de caja alta sí sirven')
})
test('la marca guarda la fuente de logotipo y la placa la usa', () => {
  const { brand } = normalizeBrand({ nombre: 'Panadería Mendieta', logotipoFuente: 'egipcia' })
  assert.equal(brand.fonts.logo.preset, 'egipcia')
  const html = htmlFor({ type: 'body', format: 'feed', title: 'x' }, brand)
  assert.ok(html.includes("--font-logo:'Alfa Slab One'"))
  assert.ok(/<link[^>]*Alfa\+Slab\+One/.test(html), 'no pidió la familia del logotipo')
})
test('las de caja alta se estampan en mayúsculas', () => {
  const { brand } = normalizeBrand({ nombre: 'Taller Sur', logotipoFuente: 'condensada' })
  assert.ok(brand.fonts.logo.caps)
  // Scopeado al <body>: la regla `body.lg-caps{...}` se inyecta siempre, así
  // que buscarla en el HTML entero da verdadero para cualquier marca.
  const clases = b => /<body class="([^"]*)"/.exec(htmlFor({ type: 'body', format: 'feed', title: 'x' }, b))[1]
  assert.ok(clases(brand).includes('lg-caps'))
  const { brand: b2 } = normalizeBrand({ nombre: 'Taller Sur', logotipoFuente: 'serif-alto' })
  assert.ok(!clases(b2).includes('lg-caps'))
})
test('las display anchas achican el monograma', () => {
  // Alfa Slab y Anton en 40px con tracking negativo se pegan y desbordan el
  // escudo. El ajuste va por familia; el palo seco queda en 1.
  const ancha = resolveFonts('moderno', 'egipcia').logo.mono
  const neutra = resolveFonts('moderno', 'mismo').logo.mono
  assert.ok(ancha.escala < 0.85, `Alfa Slab quedó en ${ancha.escala}`)
  assert.ok(!ancha.tracking.startsWith('-'), 'una display ancha no lleva tracking negativo')
  assert.equal(neutra.escala, 1)

  const px = a => Number(/font-size:([\d.]+)px/.exec(
    monogramaHTML({ nombre: 'Cervecería Fondo', escudo: 'circulo', px: 40, ajuste: a }))[1])
  assert.ok(px(ancha) < px(neutra), 'el ajuste no llegó al monograma')
  assert.ok(monogramaHTML({ nombre: 'X Y', px: 40, ajuste: ancha }).includes('letter-spacing:.01em'))
})

console.log('\nbajada, pastilla, marco y sello')
test('la bajada sale del rubro y la ciudad del alta', () => {
  const { brand } = normalizeBrand({ nombre: 'Café Botánico', rubro: 'cafetería de especialidad', ciudad: 'Buenos Aires' })
  assert.equal(descriptor(brand), 'CAFETERÍA DE ESPECIALIDAD · BUENOS AIRES')
  assert.ok(htmlFor({ type: 'body', format: 'feed', title: 'x' }, brand).includes('CAFETERÍA DE ESPECIALIDAD'))
})
test('sin rubro no se inventa una bajada', () => {
  // Una bajada genérica tipo "CALIDAD Y SERVICIO" es peor que ninguna.
  const { brand } = normalizeBrand({ nombre: 'Café Botánico' })
  assert.equal(descriptor(brand), '')
  assert.ok(!htmlFor({ type: 'body', format: 'feed', title: 'x' }, brand).includes('class="bajada"'))
})
test('solo la ciudad ya alcanza para una bajada', () => {
  const { brand } = normalizeBrand({ nombre: 'Café Botánico', ciudad: 'Rosario' })
  assert.equal(descriptor(brand), 'ROSARIO')
})
test('la pastilla y el marco existen', () => {
  const { brand } = normalizeBrand({ nombre: 'Panadería Mendieta', logotipoTratamiento: 'pastilla' })
  assert.equal(brand.logotipo.tratamiento, 'pastilla')
  assert.ok(/<body class="[^"]*lg-pastilla/.test(htmlFor({ type: 'body', format: 'feed', title: 'x' }, brand)))
  const { brand: b2 } = normalizeBrand({ nombre: 'Estudio Balcarce', logotipoEscudo: 'marco' })
  assert.ok(htmlFor({ type: 'body', format: 'feed', title: 'x' }, b2).includes('mono-marco'))
})
test('el sello lleva el nombre arqueado y el rubro abajo', () => {
  const { brand } = normalizeBrand({ nombre: 'Vivero Raíces', rubro: 'plantas & jardín', logotipoTipo: 'sello' })
  const html = htmlFor({ type: 'body', format: 'feed', title: 'x' }, brand)
  assert.ok(html.includes('VIVERO RAÍCES'))
  assert.ok(html.includes('PLANTAS &amp; JARDÍN') || html.includes('PLANTAS & JARDÍN'))
  assert.ok(html.includes('<textPath'))
  // El sello reemplaza el lockup: no va el nombre otra vez al lado.
  assert.ok(!html.includes('class="nom"'))
})
test('las banderas del arco de abajo son 0,0', () => {
  // Con large-arc 1 el semicírculo elige el otro camino y la leyenda sale
  // cabeza abajo. Se verificó renderizando las cuatro combinaciones.
  const svg = selloHTML({ nombre: 'Vivero Raíces', rubro: 'plantas', slug: 'vr' })
  const abajo = /<path id="arco-b-vr" d="([^"]+)"/.exec(svg)[1]
  assert.match(abajo, /0,0/, `el arco de abajo quedó en "${abajo}" y el texto sale invertido`)
})
test('dos sellos en una página no comparten los ids del arco', () => {
  const a = selloHTML({ nombre: 'Vivero Raíces', slug: 'vivero-raices' })
  const b = selloHTML({ nombre: 'Café Botánico', slug: 'cafe-botanico' })
  assert.ok(a.includes('arco-vivero-raices') && b.includes('arco-cafe-botanico'))
  assert.notEqual(/id="(arco-[^"]+)"/.exec(a)[1], /id="(arco-[^"]+)"/.exec(b)[1])
})

// El resumen va último: si se agrega un bloque abajo, tiene que contarlo.
console.log(`\n${ok} pruebas OK${process.exitCode ? ' — con fallas' : ''}\n`)
