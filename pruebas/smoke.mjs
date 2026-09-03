// Prueba de humo: todo lo que no necesita la API de Claude.
//
//   node pruebas/smoke.mjs
//
// Cubre lo que se rompe en silencio: la derivación de paleta, el saneado del
// logo, los contadores de cuota y que los tres formatos rendericen.

import { strict as assert } from 'assert'
import { rmSync, existsSync, readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { normalizeBrand, sanitizeLogoInner, deriveWordmark } from '../core/brand/schema.mjs'
import { derivePalette } from '../core/brand/palette.mjs'
import { contrast, hexToOklch, oklchToHex } from '../core/brand/color.mjs'
import { resolveFonts, FONT_PRESETS, LOGO_FONTS, resolveLogoFont } from '../core/brand/fonts.mjs'
import { renderSpec, htmlFor, esServerless } from '../core/render/engine.mjs'
import { DISPOSICIONES, resolverDisposicion, cssDeDisposiciones } from '../core/render/disposiciones.mjs'
import { TIPOS, resolverTipo, resolverEscudo, iniciales, tratamientosPara, monogramaHTML, monogramaCSS, descriptor, selloHTML } from '../core/brand/logotipo.mjs'
import { verificar, consumir, estado, QuotaError } from '../core/quota/ledger.mjs'
import { planToSpec, placaToSlide, soloCamposDe, CAMPOS_DE_PLANTILLA } from '../core/content/plan.mjs'
import { CAMPOS_PRINCIPALES, camposSecundarios, plantillaSegunPosicion } from '../core/content/plantillas.mjs'
import { temasLocales } from '../core/content/temas.mjs'
import { esquemaParaGemini, costoUSD, MODEL, textoDe, usoDe } from '../core/ai/gemini.mjs'
import { valorGenerado, REFERENCIA } from '../core/valor.mjs'
import { intercalar, estadoBanco, guardarDelBanco } from '../core/media/imagenes.mjs'
import { altaCuenta, subirLogo, renderizarPieza } from '../core/service.mjs'
import { MODULOS_WEB, obtenerUsuarioAutenticado } from '../core/api/server.mjs'
import { hayAlmacen as estaActivoElAlmacen } from '../core/store/firestore.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

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

console.log('\nnada de relleno en la placa')
test('una oferta a medio llenar no inventa una promoción', () => {
  // Un "2 × 1" o un "BENEFICIO EXCLUSIVO" por defecto no son un placeholder
  // que se note y se corrija: son una promesa comercial que el negocio nunca
  // hizo y que igual se publica.
  const { brand } = normalizeBrand({ nombre: 'Bicicletería El Rayo' })
  const slide = placaToSlide(
    { plantilla: 'oferta', titulo: 'Cambio de cubiertas', kicker: '', emoji: '', cuerpo: '' },
    { nombre: 'x', formato: 'feed' })
  const html = htmlFor(slide, brand)
  for (const relleno of ['2 × 1', 'BENEFICIO EXCLUSIVO', 'FILOSOFÍA DE MARCA']) {
    assert.ok(!html.includes(relleno), `la placa salió con "${relleno}" sin que nadie lo escribiera`)
  }
})
test('los datos duros de una oferta llegan a la placa', () => {
  const { brand } = normalizeBrand({ nombre: 'Bicicletería El Rayo' })
  const slide = placaToSlide(
    { plantilla: 'oferta', titulo: 'Service', chips: ['$28.000', 'En el día'] },
    { nombre: 'x', formato: 'feed' })
  assert.deepEqual(slide.chips, ['$28.000', 'En el día'])
  const html = htmlFor(slide, brand)
  assert.ok(html.includes('$28.000') && html.includes('En el día'), 'los chips no se dibujaron')
})
test('cambiar de plantilla no arrastra el texto de la anterior', () => {
  // El estado de la placa es uno solo: sin saneo, el cuerpo de la oferta
  // seguía saliendo en la frase, invisible en el formulario y visible en el PNG.
  const conBasura = { plantilla: 'frase', titulo: 'La frase', cuerpo: 'La bajada', chips: ['$9.500'], emoji: '🚲', linea2: 'sobra' }
  const limpia = soloCamposDe(conBasura)
  assert.deepEqual(Object.keys(limpia).sort(), ['cuerpo', 'plantilla', 'titulo'])
})
test('la foto de fondo y su crédito sobreviven al cambio de plantilla', () => {
  // La foto es de la placa, no de la plantilla: el editor la ofrece en
  // cualquier historia. Y el crédito viaja con ella — perderlo por cambiar de
  // plantilla dejaría una foto de banco publicada sin su licencia.
  const p = { plantilla: 'texto', titulo: 'x', foto: 'f.jpg', credito: 'Foto: A / Unsplash' }
  const limpia = soloCamposDe(p)
  assert.equal(limpia.foto, 'f.jpg')
  assert.equal(limpia.credito, 'Foto: A / Unsplash')
})
test('una historia con foto de fondo la dibuja, y con su crédito', () => {
  const { brand } = normalizeBrand({ nombre: 'Bicicletería El Rayo' })
  const slide = placaToSlide(
    { plantilla: 'texto', kicker: 'Novedad', titulo: 'Con foto', cuerpo: 'x', credito: 'Foto: A / Unsplash' },
    { nombre: 'x', formato: 'story', foto: 'data:image/png;base64,iVBOR' })
  const html = htmlFor(slide, brand, 'story')
  assert.ok(html.includes('class="bg-foto"'), 'la foto de fondo no llegó a la placa')
  assert.ok(html.includes('Foto: A / Unsplash'), 'la foto salió sin su crédito')
})
test('sin foto, la placa flat queda exactamente como antes', () => {
  // El CSS del fondo se inyecta siempre —igual que el de las disposiciones— y
  // la clase del body elige. Lo que se comprueba es el markup, no la hoja.
  const { brand } = normalizeBrand({ nombre: 'Bicicletería El Rayo' })
  const html = htmlFor(placaToSlide(
    { plantilla: 'texto', titulo: 'Sin foto', cuerpo: 'x' },
    { nombre: 'x', formato: 'feed' }), brand)
  const cuerpo = html.slice(html.indexOf('<body'))
  assert.ok(!cuerpo.includes('<img class="bg-foto"'), 'dibujó una foto que nadie cargó')
  assert.ok(!/<body class="[^"]*con-foto/.test(cuerpo), 'quedó en el tema de foto sin tener foto')
})
test('la placa con foto no repite la volanta ni el crédito', () => {
  const slide = placaToSlide(
    { plantilla: 'foto', kicker: 'Oficio', titulo: 'Tu bici', credito: 'Foto: X / Pexels', foto: 'f.jpg' },
    { nombre: 'x', formato: 'feed', foto: 'f.jpg' })
  assert.equal(slide.eyebrow, 'Oficio')
  assert.ok(!slide.kick, 'la volanta salía dos veces: arriba a la derecha y sobre el título')
  assert.equal(slide.src, 'Foto: X / Pexels')
  assert.ok(!slide.cta, 'el crédito salía dos veces: en la pastilla y en el pie')
})

console.log('\nla firma es la misma en las tres plantillas')
test('foto y vector respetan el tipo de firma que eligió el cliente', () => {
  // La identidad va en el objeto brand. Un template que arma su propio lockup
  // le pasa por encima a los cuatro tipos × cinco tratamientos del alta.
  const { brand } = normalizeBrand({
    nombre: 'Vivero Raíces', rubro: 'plantas', logotipoTipo: 'sello',
  })
  const foto = htmlFor({ style: 'foto', format: 'feed', line1: 'x', photoData: 'data:image/png;base64,iVBOR' }, brand)
  const vector = htmlFor({ style: 'vector', format: 'feed', headline: 'x' }, brand)
  for (const [nombre, html] of [['foto', foto], ['vector', vector]]) {
    assert.ok(html.includes('class="sello"'), `${nombre}: no dibujó el sello que eligió la marca`)
    assert.ok(html.includes('<textPath'), `${nombre}: el sello salió sin el nombre arqueado`)
  }
})
test('el nombre largo entra en el arco del sello y no se corta', () => {
  // Un semicírculo mide π·r y no más: sin ajuste, el navegador se comía las
  // letras de las puntas — "BICICLETERÍA EL RAYO" salía "ICICLETERÍA EL RAY".
  const largo = selloHTML({ nombre: 'Bicicletería El Rayo', rubro: 'bicicletería y taller', slug: 'l' })
  assert.ok(largo.includes('BICICLETERÍA EL RAYO'), 'el nombre no está entero en el SVG')
  assert.match(largo, /textLength=/, 'un nombre que no entra tiene que declarar textLength')
  const corto = selloHTML({ nombre: 'Ana', slug: 'c' })
  assert.ok(!/textLength=/.test(corto), 'un nombre corto no necesita comprimirse')
})

console.log('\nla web y el núcleo no se despegan')
test('toda clase que usa el JS tiene una regla CSS', () => {
  // Se encontraron dos por casualidad —el modal de ingreso salía sin fondo y
  // la barra del carrusel como "010203" pegado— y el barrido devolvió 25 más.
  const css = readFileSync(join(RAIZ, 'web/css/app.css'), 'utf8') +
    [...readFileSync(join(RAIZ, 'web/index.html'), 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
      .map(m => m[1]).join('\n')
  const definidas = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]))

  const huerfanas = new Map()
  for (const archivo of readdirSync(join(RAIZ, 'web/js')).filter(f => f.endsWith('.js'))) {
    const js = readFileSync(join(RAIZ, 'web/js', archivo), 'utf8')
    const usadas = [
      ...[...js.matchAll(/el\(\s*[`'"]([a-zA-Z][\w-]*(?:\.[\w-]+)+)[`'"]/g)]
        .flatMap(m => m[1].split('.').slice(1)),
      ...[...js.matchAll(/classList\.(?:add|toggle|remove)\(\s*['"]([\w-]+)['"]/g)].map(m => m[1]),
    ]
    for (const c of usadas) if (!definidas.has(c)) huerfanas.set(c, archivo)
  }
  assert.equal(huerfanas.size, 0,
    `clases sin regla CSS: ${[...huerfanas].map(([c, f]) => `.${c} (${f})`).join(', ')}`)
})
test('los módulos que se sirven al navegador no importan nada de Node', () => {
  const NODE = /from\s+['"](node:|fs|path|crypto|http|url|os|child_process|@google\/)/
  for (const mod of MODULOS_WEB) {
    const src = readFileSync(join(RAIZ, 'core', mod), 'utf8')
    assert.ok(!NODE.test(src), `${mod} importa algo de Node y el navegador no lo puede cargar`)
  }
})
test('el editor y el motor usan la misma lista de campos', () => {
  const js = readFileSync(join(RAIZ, 'web/js/editor.js'), 'utf8')
  assert.match(js, /from '\/nucleo\/content\/plantillas\.mjs'/,
    'el editor volvió a declarar sus campos aparte del núcleo')
  for (const id of Object.keys(CAMPOS_DE_PLANTILLA)) {
    assert.ok(js.includes(`${id}: {`), `el editor no tiene rótulo para la plantilla "${id}"`)
  }
})
test('cada plantilla tiene campos principales, y son suyos', () => {
  for (const [id, campos] of Object.entries(CAMPOS_DE_PLANTILLA)) {
    const abiertos = CAMPOS_PRINCIPALES[id]
    assert.ok(abiertos?.length, `la plantilla "${id}" no declara campos principales`)
    assert.ok(abiertos.includes('titulo'), `"${id}": el título es lo único obligatorio, tiene que ir abierto`)
    for (const c of abiertos) {
      assert.ok(campos.includes(c), `"${id}": el campo principal "${c}" no está entre los suyos`)
    }
  }
})
test('ningún campo del formulario se pide sin un ejemplo', () => {
  // "La fuente del dato" era el único sin placeholder, y es el más abstracto de
  // todos: sin ver qué se espera, lo que se escribe ahí no es una fuente.
  const js = readFileSync(join(RAIZ, 'web/js/editor.js'), 'utf8')
  const bloque = /const CAMPOS = \{([\s\S]*?)\n\}/.exec(js)[1]
  for (const linea of bloque.split('\n')) {
    const campo = /^\s{2}(\w+): \{/.exec(linea)
    if (!campo || !linea.includes('ej:')) continue
    assert.ok(!/ej: ''/.test(linea), `el campo "${campo[1]}" se pide sin ejemplo`)
  }
})
test('el formulario abre dos campos, no cinco', () => {
  // La razón de todo esto: con los cinco pintados igual, la placa más usada se
  // leía como cinco cosas para completar antes de poder publicar.
  assert.equal(CAMPOS_DE_PLANTILLA.texto.length, 4)
  assert.equal(CAMPOS_PRINCIPALES.texto.length, 2)
  assert.deepEqual(camposSecundarios('texto'), ['kicker', 'fuente'])
})

console.log('\nportada y cierre salen de la posición')
test('la primera y la última de un carrusel se dibujan distinto', () => {
  assert.equal(plantillaSegunPosicion('texto', 0, 3), 'portada')
  assert.equal(plantillaSegunPosicion('texto', 1, 3), 'texto')
  assert.equal(plantillaSegunPosicion('texto', 2, 3), 'cierre')
})
test('una placa suelta nunca es portada ni cierre', () => {
  assert.equal(plantillaSegunPosicion('texto', 0, 1), 'texto')
})
test('lo que el usuario eligió a mano se respeta', () => {
  // Si puso "pasos" en la primera placa, es una decisión suya.
  assert.equal(plantillaSegunPosicion('pasos', 0, 3), 'pasos')
  assert.equal(plantillaSegunPosicion('oferta', 2, 3), 'oferta')
})
test('el editor ya no ofrece portada ni cierre como plantilla', () => {
  const js = readFileSync(join(RAIZ, 'web/js/editor.js'), 'utf8')
  const rotulos = /const ROTULOS = \{([\s\S]*?)\n\}/.exec(js)[1]
  for (const id of ['portada', 'cierre']) {
    assert.ok(!rotulos.includes(`${id}:`), `"${id}" volvió al selector: es una posición, no una elección`)
  }
})

await testAsync('sin marca, el error dice qué falta y no es una falla del servidor', async () => {
  // Se llegaba al editor sin marca, se escribía la placa entera y recién al
  // generar volvía un 500 con un mensaje de sistema.
  const { cuenta } = altaCuenta({ nombre: 'Sin Marca' })
  try {
    await renderizarPieza(cuenta.id, { placas: [{ plantilla: 'texto', titulo: 'x' }] })
    assert.fail('tendría que haber avisado que falta la marca')
  } catch (e) {
    assert.equal(e.codigo, 'sin_marca', 'sin código, el servidor lo trata como error interno')
    assert.match(e.message, /marca/i)
    assert.ok(!/cuenta todavía no tiene marca cargada/i.test(e.message), 'el mensaje sigue siendo de sistema')
  } finally {
    rmSync(join(RAIZ, 'data/cuentas', cuenta.id + '.json'), { force: true })
  }
})

console.log('\nel render sobrevive fuera de esta máquina')
test('en serverless no se buscan binarios de escritorio', () => {
  // puppeteer-core no trae Chrome, y las rutas candidatas son todas de
  // escritorio: en una función de Vercel ninguna existe y no salía ni una placa.
  const js = readFileSync(join(RAIZ, 'core/render/engine.mjs'), 'utf8')
  assert.match(js, /@sparticuz\/chromium/, 'no hay Chromium para el entorno serverless')
  assert.match(js, /process\.env\.VERCEL/, 'no se detecta el entorno serverless')
  assert.ok(!/executablePath: findChrome\(\)[\s\S]{0,80}renderSpec/.test(js),
    'renderSpec volvió a llamar a findChrome() sin mirar el entorno')
})
test('la detección de serverless mira las variables del entorno', () => {
  const previo = process.env.VERCEL
  try {
    delete process.env.VERCEL
    assert.equal(esServerless(), false)
    process.env.VERCEL = '1'
    assert.equal(esServerless(), true)
  } finally {
    if (previo === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previo
  }
})
test('sin bucket configurado, las placas siguen yendo al disco', () => {
  // El almacén remoto es para producción: en una máquina no tiene que
  // cambiar nada de lo que ya funcionaba.
  assert.equal(estaActivoElAlmacen(), false)
})

console.log('\nde qué publicar')
test('los temas locales no le inventan un verbo al negocio', () => {
  // Una plantilla del tipo "Cómo hacemos X" le proponía a una bicicletería
  // hablar de "cómo hacemos bicicletas urbanas", que es falso sobre su propio
  // negocio. Una panadería hace su producto, un vivero lo cría y una
  // bicicletería lo vende: sin saber el rubro no se puede conjugar.
  const casos = [
    { rubro: 'bicicletería y taller', queVende: 'bicicletas urbanas, service completo', diferencial: 'service en el día' },
    { rubro: 'vivero y jardinería', queVende: 'plantas de interior, macetas', diferencial: 'criamos todo en el predio' },
  ]
  for (const negocio of casos) {
    for (const t of temasLocales(negocio)) {
      assert.ok(!/\b(hacemos|fabricamos|producimos|cultivamos|amasamos)\b/i.test(t),
        `"${t}" le atribuye un proceso que el alta no dice`)
    }
  }
})
test('los temas locales salen de lo que el negocio escribió', () => {
  const temas = temasLocales({
    rubro: 'panadería', ciudad: 'Rosario',
    queVende: 'pan de masa madre, facturas',
    diferencial: 'masa madre propia',
  })
  assert.ok(temas.some(t => /masa madre propia/i.test(t)), 'no usó el diferencial')
  assert.ok(temas.some(t => /facturas/i.test(t)), 'no usó lo que vende')
  assert.ok(temas.some(t => /Rosario/.test(t)), 'no usó la ciudad')
  assert.ok(temas.length <= 5)
})
test('no se repite un tema que ya se publicó', () => {
  const negocio = { diferencial: 'masa madre propia', queVende: 'facturas', ciudad: 'Rosario' }
  const todos = temasLocales(negocio)
  const sinElPrimero = temasLocales(negocio, { evitar: [todos[0]] })
  assert.ok(!sinElPrimero.includes(todos[0]), 'volvió a proponer algo ya publicado')
})
test('un negocio sin datos no se queda sin nada que ofrecer', () => {
  const temas = temasLocales({})
  assert.ok(temas.length >= 1, 'la pantalla quedaría vacía')
  assert.ok(temas.every(t => t && t.length > 3))
})
test('las dos acciones viven en el dock, no sueltas en la página', () => {
  const js = readFileSync(join(RAIZ, 'web/js/dashboard.js'), 'utf8')
  assert.match(js, /dock-acciones/, 'el dashboard dejó de usar el dock flotante')
  assert.ok(!js.includes('Plan semanal con IA'),
    'quedó el botón viejo: el plan semanal es ahora una forma dentro del flujo de sugerencia')
  const css = readFileSync(join(RAIZ, 'web/css/app.css'), 'utf8')
  assert.match(css, /\.dock-acciones\s*\{[^}]*position:\s*fixed/, 'el dock dejó de ser fijo')
})

console.log('\nmanifiesto: el estilo vector ya tiene puerta')
test('la plantilla manifiesto produce una placa vector', () => {
  const { brand } = normalizeBrand({ nombre: 'Panadería Santa Rosa', color: '#8C1D2F' })
  const slide = placaToSlide(
    { plantilla: 'manifiesto', kicker: 'Desde 1998', titulo: 'El pan <em>se espera</em>.' },
    { nombre: 'x', formato: 'feed' })
  assert.equal(slide.style, 'vector')
  assert.equal(slide.headline, 'El pan <em>se espera</em>.')
  const html = htmlFor(slide, brand)
  assert.ok(html.includes('class="slide"'), 'no salió por el template vector')
  assert.ok(html.includes('<em>se espera</em>'), 'perdió el resalte en bastardilla')
})

console.log('\nquién puede entrar')

const pedidoCon = token => ({ headers: token ? { authorization: `Bearer ${token}` } : {} })

// Sin Firebase configurado, la rama de desarrollo aceptaba cualquier cadena
// como sesión. En una máquina eso es comodidad; en el servidor era la API
// abierta con un paso extra, porque `Bearer loquesea` entraba como el usuario
// "loquesea" y desde ahí le leía la cuenta.
await testAsync('en el servidor una cadena cualquiera no es una sesión', async () => {
  const previo = process.env.VERCEL
  try {
    process.env.VERCEL = '1'
    assert.equal(await obtenerUsuarioAutenticado(pedidoCon('loquesea')), null)
  } finally {
    if (previo === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previo
  }
})

await testAsync('en una máquina esa misma cadena sigue sirviendo para trabajar', async () => {
  const previo = process.env.VERCEL
  try {
    delete process.env.VERCEL
    const u = await obtenerUsuarioAutenticado(pedidoCon('loquesea'))
    assert.equal(u?.tipo, 'local')
  } finally {
    if (previo === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previo
  }
})

await testAsync('sin cabecera no hay sesión', async () => {
  assert.equal(await obtenerUsuarioAutenticado(pedidoCon(null)), null)
})

// El modo invitado se sacó: dejaba entrar con un id inventado en el navegador,
// y del lado del servidor obligaba a aceptar un token que cualquiera se
// fabrica. Nadie que no venga de Firebase entra.
await testAsync('un token de invitado ya no abre nada', async () => {
  const previo = process.env.VERCEL
  try {
    process.env.VERCEL = '1'
    assert.equal(await obtenerUsuarioAutenticado(pedidoCon('inv_a1b2c3')), null)
  } finally {
    if (previo === undefined) delete process.env.VERCEL
    else process.env.VERCEL = previo
  }
})

// altaCuenta con un id que ya existe actualiza nombre, correo y foto. La ruta
// tiene que comparar contra quién pide, y mirar las dos llaves, porque
// altaCuenta resuelve `id || userId`: chequear solo `id` deja pasar `userId`.
test('el alta compara el dueño por las dos llaves', () => {
  const fuente = readFileSync(join(RAIZ, 'core/api/server.mjs'), 'utf8')
  const bloqueAlta = fuente.slice(fuente.indexOf("url.pathname === '/cuentas'"))
  assert.ok(/cuerpo\.id \|\| cuerpo\.userId/.test(bloqueAlta),
    'el alta mira solo una de las dos llaves: con la otra se pisa la cuenta de otro')
})

// El modal ofrecía "enviar código por email" y no hay nada en el servidor que
// mande correos: enviarOtp() escribe el código en la consola y devuelve ok. La
// persona quedaba esperando en la pantalla de los seis dígitos. Si algún día se
// conecta un proveedor, esta prueba es la que hay que actualizar para volver a
// prender el botón.
test('no se ofrece una puerta de ingreso que el servidor no pueda abrir', () => {
  const hayCorreo = ['nodemailer', 'resend', 'sendgrid', 'mailgun', 'postmark']
    .some(lib => readFileSync(join(RAIZ, 'package.json'), 'utf8').includes(lib))
  const modal = readFileSync(join(RAIZ, 'web/js/modal-auth.js'), 'utf8')
  const ofreceOtp = /solicitarCodigoOtp|validarCodigoOtp/.test(modal.replace(/\/\/.*$/gm, ''))
  if (!hayCorreo) {
    assert.ok(!ofreceOtp,
      'el modal ofrece el código por correo y no hay proveedor de mail: nadie recibe nada')
  }
})

// altaCuenta con un id que ya existe no falla: actualiza la cuenta. Pero busca
// con leerCuenta(), que solo mira el disco, y el disco de la función arranca
// vacío: sin traerla antes de Firestore no la encuentra y crea una nueva
// encima. El cliente entraba y su marca desaparecía. Se arregló en /cuentas y
// en /cuentas/:id, y quedó sin arreglar en /auth/firebase-login, que es
// justamente por donde entra todo el mundo.
test('toda ruta que da de alta una cuenta la trae primero de Firestore', () => {
  const fuente = readFileSync(join(RAIZ, 'core/api/server.mjs'), 'utf8')
  const sinHidratar = []
  for (const m of fuente.matchAll(/svc\.altaCuenta\(/g)) {
    const antes = fuente.slice(Math.max(0, m.index - 700), m.index)
    if (!antes.includes('hidratarCuenta')) {
      sinHidratar.push(fuente.slice(0, m.index).split('\n').length)
    }
  }
  assert.deepEqual(sinHidratar, [],
    `hay altas sin hidratar antes, en la línea ${sinHidratar}: van a pisar la marca del cliente`)
})

console.log('\nel esquema que se le manda al modelo')

// responseSchema es un subconjunto de OpenAPI, no JSON Schema: ante una clave
// que no conoce devuelve 400 y se cae la funcionalidad entera. Con
// `additionalProperties: false` —que en JSON Schema es lo correcto— la
// sugerencia de contenido no armaba nada, y el error no nombra la causa.
test('el esquema sale sin claves que Gemini no conoce', () => {
  // El 400 venía de un items dentro de un items dentro de un items, así que la
  // prueba tiene que llegar igual de hondo.
  const limpio = esquemaParaGemini({
    type: 'object',
    additionalProperties: false,
    $schema: 'http://json-schema.org/draft-07/schema#',
    required: ['placas'],
    properties: {
      placas: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          properties: {
            chips: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { t: { type: 'string' } } } },
          },
        },
      },
    },
  })
  const plano = JSON.stringify(limpio)
  for (const prohibida of ['additionalProperties', '$schema', '$ref', 'definitions', 'allOf', 'oneOf']) {
    assert.ok(!plano.includes(prohibida), `el esquema todavía lleva ${prohibida}`)
  }
  // Y no se le puede comer la estructura al limpiarla.
  assert.equal(limpio.properties.placas.items.properties.chips.items.properties.t.type, 'string')
  assert.deepEqual(limpio.required, ['placas'])
})

// Que exista el saneador no sirve si el pedido no lo usa.
test('el pedido a Gemini pasa el esquema por el saneador', () => {
  const fuente = readFileSync(join(RAIZ, 'core/ai/gemini.mjs'), 'utf8')
  assert.ok(/responseSchema:\s*esquemaParaGemini\(/.test(fuente),
    'responseSchema manda el esquema crudo: Gemini va a devolver 400')
})

// Los esquemas del producto llevan additionalProperties porque en JSON Schema
// corresponde. Esta prueba no pide sacarlo: comprueba que sigan pasando por el
// saneador, que es lo que lo vuelve inofensivo.
test('los esquemas del producto siguen escritos como JSON Schema', () => {
  const conEsquema = ['core/content/plan.mjs', 'core/brand/identidad.mjs']
  for (const ruta of conEsquema) {
    const fuente = readFileSync(join(RAIZ, ruta), 'utf8')
    assert.ok(/const SCHEMA = \{/.test(fuente), `${ruta} ya no define su esquema`)
  }
})

// El costo que reporta la app es el insumo del precio de la suscripción. Antes,
// un modelo que no estaba en la tabla caía al precio de gemini-2.0-flash, el
// más barato: se reportaba de menos y nadie se enteraba. Cuando Google retiró
// ese modelo, el reemplazo habría heredado ese precio en silencio.
test('un modelo sin precio conocido se estima de más, no de menos', () => {
  const uso = { inputTokenCount: 1e6, outputTokenCount: 1e6 }
  const barato = costoUSD(uso, 'gemini-2.0-flash')
  const desconocido = costoUSD(uso, 'modelo-que-no-existe-todavia')
  assert.ok(desconocido > barato,
    'un modelo desconocido cuesta menos que el más barato de la tabla: se está subestimando')
})

test('el modelo por defecto no es uno que Google haya retirado', () => {
  assert.notEqual(MODEL, 'gemini-2.0-flash', 'gemini-2.0-flash está retirado: devuelve 404')
})

// En el SDK `text` es una propiedad, no un método. Llamarla como función tiraba
// "response.text is not a function" y se caía la generación entera.
test('el texto se saca venga como venga', () => {
  assert.equal(textoDe({ text: 'hola' }), 'hola')
  assert.equal(textoDe({ text: () => 'hola' }), 'hola')
  assert.equal(textoDe({ candidates: [{ content: { parts: [{ text: 'ho' }, { text: 'la' }] } }] }), 'hola')
  assert.equal(textoDe({}), '')
})

// El SDK los llama promptTokenCount y candidatesTokenCount. costoUSD buscaba
// inputTokenCount y outputTokenCount, que no existen: no fallaba, leía cero, y
// el costo daba siempre $0. Un contador que reporta cero es peor que no
// tenerlo, porque se lee como "sale gratis" y sobre eso se fija un precio.
test('los tokens del SDK llegan al contador de costo', () => {
  const uso = usoDe({ usageMetadata: { promptTokenCount: 800, candidatesTokenCount: 900 } })
  assert.equal(uso.inputTokenCount, 800)
  assert.equal(uso.outputTokenCount, 900)
  assert.ok(costoUSD(uso) > 0, 'con tokens contados el costo no puede dar cero')
})

test('una llamada real no reporta costo cero', () => {
  // La forma exacta que devuelve el SDK, sin normalizar a mano.
  const respuesta = { usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 900, totalTokenCount: 2100 } }
  assert.ok(costoUSD(usoDe(respuesta)) > 0)
})

// El render manual archivaba y el generador de plan no. Las placas del plan
// quedaban en el /tmp de la instancia que las hizo: el navegador pide las tres
// miniaturas del carrusel a la vez, cada pedido puede caer en otra instancia, y
// las que no tocaron la que las generó daban 404. Cargaba una sola.
test('toda placa renderizada se archiva', () => {
  const fuente = readFileSync(join(RAIZ, 'core/service.mjs'), 'utf8')
  const sinArchivar = []
  for (const m of fuente.matchAll(/renderSpec\(/g)) {
    const despues = fuente.slice(m.index, m.index + 500)
    if (!despues.includes('archivarPiezas')) {
      sinArchivar.push(fuente.slice(0, m.index).split('\n').length)
    }
  }
  assert.deepEqual(sinArchivar, [],
    `hay renders que no se archivan, en la línea ${sinArchivar}: esas placas desaparecen al reciclarse la instancia`)
})

// El error más repetido de este proyecto: se escribe la lectura que consulta
// Firestore, se exporta, y nadie la llama. Pasó con leerCuentaAsync, con el alta
// de Firebase, y con las publicaciones, los planes y las estadísticas del
// dashboard. El síntoma es siempre el mismo y siempre confuso: los datos
// aparecen el día que se generaron y desaparecen al siguiente, sin ningún error.
// Peor todavía cuando el contador de cuota —que vive en la cuenta, y esa sí se
// hidrataba— seguía diciendo "10 placas este mes" con la grilla vacía abajo.
test('no hay lecturas de Firestore escritas que nadie llame', () => {
  const fs = readFileSync(join(RAIZ, 'core/store/firestore.mjs'), 'utf8')
  const store = readFileSync(join(RAIZ, 'core/store/store.mjs'), 'utf8')
  const huerfanas = [...fs.matchAll(/export async function (\w+DeFirestore)\b/g)]
    .map(m => m[1])
    .filter(nombre => !store.includes(nombre))
  assert.deepEqual(huerfanas, [],
    `estas lecturas existen y nadie las usa: ${huerfanas.join(', ')} — los datos se van a perder al reciclarse la instancia`)
})

test('las lecturas que hidratan llegan hasta el service', () => {
  const store = readFileSync(join(RAIZ, 'core/store/store.mjs'), 'utf8')
  const service = readFileSync(join(RAIZ, 'core/service.mjs'), 'utf8')
  const huerfanas = [...store.matchAll(/export async function (\w+Async)\b/g)]
    .map(m => m[1])
    .filter(nombre => !service.includes(nombre))
  assert.deepEqual(huerfanas, [], `el service no usa: ${huerfanas.join(', ')}`)
})

// Y que las rutas no se salteen la hidratación volviendo a la lectura de disco.
test('las rutas del dashboard no leen del disco', () => {
  const server = readFileSync(join(RAIZ, 'core/api/server.mjs'), 'utf8')
  for (const sincronica of ['svc.listarPublicaciones(', 'svc.listarPlanes(', 'svc.obtenerEstadisticas(']) {
    assert.ok(!server.includes(sincronica),
      `${sincronica} solo mira el disco de la función: al día siguiente devuelve vacío`)
  }
})

// El texto que devuelve el modelo es un borrador y hay que poder corregirlo
// antes de publicarlo. Si el bloque vuelve a ser un párrafo, deja de editarse
// sin que nada falle.
test('el texto del posteo se puede editar', () => {
  const app = readFileSync(join(RAIZ, 'web/js/app.js'), 'utf8')
  assert.ok(/textarea\.posteo-texto/.test(app), 'el texto del posteo volvió a ser de solo lectura')
  assert.ok(/api\.editarPublicacion\(/.test(app), 'se edita pero no se guarda')
})

// El nombre interno de la placa aparece en letra grande en la hoja de compartir
// de iOS: 'feed-mtk6bc67' no dice ni de qué negocio es ni de cuándo, y con
// varias guardadas no se distinguen.
test('el archivo que se guarda lleva un nombre que se entiende', () => {
  const editor = readFileSync(join(RAIZ, 'web/js/editor.js'), 'utf8')
  assert.ok(/function nombreDeArchivo\(/.test(editor), 'no hay nombre para el archivo')
  // No puede volver a usarse el nombre interno para lo que baja el usuario.
  const usosCrudos = editor.match(/download: `\$\{a\.name\}\.png`/g) || []
  assert.deepEqual(usosCrudos, [], 'una descarga sigue usando el nombre interno')
  assert.ok(!/new File\(\[blob\], `\$\{a\.name\}\.png`/.test(editor),
    'lo que se comparte sigue con el nombre interno')
})

// La disposición se elegía en un desplegable con los nombres sueltos: nadie
// sabe qué es "Bloque" o "Ficha" hasta aplicarlo, así que había que abrir,
// elegir, mirar el resultado y volver a abrir, una vez por opción.
test('la disposición se elige viendo un esquema, no leyendo un nombre', () => {
  const editor = readFileSync(join(RAIZ, 'web/js/editor.js'), 'utf8')
  assert.ok(/function esquemaDeDisposicion\(/.test(editor), 'no hay esquema para cada disposición')
  assert.ok(/disp-grilla/.test(editor), 'la grilla de disposiciones desapareció')
  // La primera opción tiene que seguir siendo la de la marca: es la que ya está
  // puesta y la que queda en la gran mayoría de las placas.
  const i = editor.indexOf('const opciones = [')
  assert.ok(/La de tu marca/.test(editor.slice(i, i + 320)), 'la de la marca dejó de ir primera')
})

// La primera tarjeta dibujaba siempre el esquema de Clásica. Con una marca que
// usa otra disposición mostraba una que no era la suya, y con Clásica quedaban
// dos tarjetas idénticas sin explicar por qué.
test('la tarjeta de la marca dibuja la disposición de la marca', () => {
  const editor = readFileSync(join(RAIZ, 'web/js/editor.js'), 'utf8')
  assert.ok(/marca\?\.disposicion/.test(editor),
    'la tarjeta de la marca no mira qué disposición tiene la marca')
  assert.ok(/disp-pie/.test(editor), 'no dice cuál es la disposición de la marca')
})

// La aplicación vive en una sola URL, así que sin esto la flecha de volver del
// navegador saca del sitio entero, aunque estés en el tercer paso de armar una
// placa. En el teléfono volver es el gesto natural para deshacer un paso.
test('la flecha de volver del navegador retrocede dentro de la app', () => {
  const app = readFileSync(join(RAIZ, 'web/js/app.js'), 'utf8')
  assert.ok(/history\.pushState/.test(app), 'ninguna pantalla deja entrada en el historial')
  assert.ok(/addEventListener\('popstate'/.test(app), 'nadie escucha el botón de atrás')
  const editor = readFileSync(join(RAIZ, 'web/js/editor.js'), 'utf8')
  assert.ok(/alPaso\?\.\(/.test(editor), 'el editor no informa en qué paso está: la flecha se saltea sus pantallas')
})

// El resumen va último: si se agrega un bloque abajo, tiene que contarlo.
console.log(`\n${ok} pruebas OK${process.exitCode ? ' — con fallas' : ''}\n`)
