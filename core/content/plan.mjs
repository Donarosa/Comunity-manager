// Generador de contenido: de "tengo una panadería en Rosario" a placas
// renderizables, con caption y hashtags incluidos.
//
// La salida NO es un texto que después alguien acomoda a mano: es la estructura
// exacta que consume el motor. Por eso el schema es tan específico — cada campo
// cae en un lugar concreto de una placa.

import { pedirJSON } from '../ai/gemini.mjs'
import { soloCamposDe } from './plantillas.mjs'

export { CAMPOS_DE_PLANTILLA, clavesDePlantilla, soloCamposDe } from './plantillas.mjs'

/* ── reglas estables (se cachean; iguales para todas las cuentas) ── */

const REGLAS = `Sos el community manager de una micro o pequeña empresa argentina. Escribís el contenido de Instagram: las placas y los textos del posteo. No sos un redactor publicitario: sos alguien que conoce el negocio y le habla a sus clientes.

CÓMO SE LEE UNA PLACA
Una placa se lee en dos segundos, mientras la persona hace scroll. Eso manda sobre todo lo demás:
- El título es lo único que se lee seguro. Tiene que decir algo por sí solo, sin el cuerpo.
- Máximo 55 caracteres en un título, y que entre en dos renglones. Uno solo es mejor.
- El cuerpo va entre 90 y 200 caracteres. Arriba de eso nadie lo lee y además desborda la placa.
- Una idea por placa. Si tenés dos, son dos placas.

RESALTES Y FORMATO
- En los títulos de placa resaltás 1 o 2 palabras con <span class="acc">palabra</span>. Nunca una frase entera: si resaltás todo, no resaltaste nada. La palabra resaltada tiene que ser la que carga el significado.
- En las frases del estilo "frase" el resalte se marca con <em>palabra</em> en vez de span.
- En el cuerpo podés poner una parte en negrita con <b>texto</b>. Como mucho una vez por placa.
- No uses ninguna otra etiqueta HTML. No uses markdown: los asteriscos salen impresos tal cual en la placa.
- El kicker es una etiqueta corta en mayúsculas de imprenta chica, de 1 a 3 palabras. Va a ir con letterspacing, así que más largo se rompe.

CÓMO SE ESCRIBE
- Español rioplatense, con voseo: "tenés", "podés", "escribinos", "vení". Nunca "tienes" ni "puedes".
- Frases cortas. Verbo temprano. Si una oración necesita una coma para respirar, probablemente son dos oraciones.
- Concreto sobre abstracto: "salimos del horno a las 7" es contenido; "calidad y compromiso" es relleno.
- Nada de lenguaje de agencia: "potenciá tu marca", "soluciones a medida", "la mejor experiencia", "somos líderes", "en el mundo de hoy". Si una frase la podría decir cualquier negocio de cualquier rubro, está mal escrita.
- Cero emojis dentro de los títulos y cuerpos de las placas. En el caption del posteo sí, con moderación: dos o tres como mucho.
- No inventes datos: precios, horarios, direcciones, teléfonos, promociones, cantidades, premios ni años de trayectoria. Si no te los dieron, escribí la placa sin ese dato. Si una placa necesita un dato que no tenés, dejalo indicado entre corchetes en el caption —por ejemplo [poner precio]— y nunca dentro de la placa.
- Si afirmás un dato duro que sí te dieron, va con su fuente en el campo fuente.

LAS SIETE PLANTILLAS
- portada: primera placa de un carrusel. Fondo oscuro, título grande. Su trabajo es que la persona deslice. Usa kicker, titulo y cuerpo.
- texto: el caballo de batalla. Kicker, título y párrafo. Es la que más se usa.
- pasos: un proceso en 3 o 4 pasos. Cada paso tiene numero, etiqueta corta, título y descripción de una línea. Con más de 4 pasos la placa se aprieta y deja de leerse.
- oferta: presenta un producto o servicio. Emoji grande, título, cuerpo y chips con los datos duros (los chips son de 1 a 3 palabras cada uno).
- cierre: la placa final del carrusel, la que pide la acción. Pill corto arriba, título y cuerpo. Siempre termina en algo que la persona pueda hacer hoy.
- frase: una sola frase con peso, en serif, sobre color pleno. Sin cuerpo, sin explicación. Para lo aspiracional o la opinión.
- foto: la placa va sobre una foto que pone el negocio. Escribís dos líneas cortas (la segunda va en color) y una nota de qué foto sacar.

ESTRUCTURA DE UN POSTEO
- Un posteo con una sola placa es un posteo suelto.
- Un carrusel son entre 3 y 6 placas: siempre empieza con portada y siempre termina con cierre.
- Una historia es una sola placa, formato story. Las historias son más sueltas y directas que el feed: una pregunta, un detrás de escena, un recordatorio, una encuesta hablada.
- El caption es el texto que va debajo del posteo en Instagram: entre 2 y 5 renglones, arranca con la línea más fuerte (en el celular se corta a los ~125 caracteres) y cierra con una acción clara.
- Los hashtags van entre 4 y 8, en minúscula, mezclando rubro y ciudad. Nada de #amor #vida #instagood.

MEZCLA DE LA SEMANA
No todo es vender. Sobre el total del plan, apuntá a: la mitad contenido útil o de oficio (cómo se hace, qué mirar, un error común), un cuarto de negocio propiamente dicho (producto, servicio, promoción real), y un cuarto de humano (quién está atrás, el día a día, la respuesta a algo que preguntan seguido). Dos posteos seguidos no pueden tener la misma plantilla ni el mismo objetivo.`

/* ── schema de salida ────────────────────────────────────── */

// Todos los campos son requeridos a propósito: con structured outputs es más
// confiable pedir string vacío o array vacío que campos opcionales.
const PASO = {
  type: 'object',
  additionalProperties: false,
  required: ['numero', 'etiqueta', 'titulo'],
  properties: {
    numero: { type: 'string', description: 'El número del paso: "1", "2"…' },
    etiqueta: { type: 'string', description: 'Etiqueta de 1 o 2 palabras: "Primero", "Al final".' },
    titulo: { type: 'string', description: 'Qué se hace en este paso. Hasta 40 caracteres.' },
  },
}

const PLACA = {
  type: 'object',
  additionalProperties: false,
  required: ['plantilla', 'kicker', 'titulo', 'cuerpo', 'pasos', 'chips', 'emoji', 'fuente', 'linea2'],
  properties: {
    plantilla: {
      type: 'string',
      enum: ['portada', 'texto', 'pasos', 'oferta', 'cierre', 'frase', 'foto'],
    },
    kicker: {
      type: 'string',
      description: 'Etiqueta corta en mayúsculas, 1 a 3 palabras. En "frase" es el volanta. En "cierre" es el pill. Vacío solo si la plantilla no lo usa.',
    },
    titulo: {
      type: 'string',
      description: 'Hasta 55 caracteres. Con 1 o 2 palabras en <span class="acc">…</span>, salvo en "frase" que usa <em>…</em>. En "foto" es la primera línea, sin resaltes.',
    },
    cuerpo: {
      type: 'string',
      description: '90 a 200 caracteres. Vacío en "frase" y en "pasos".',
    },
    pasos: { type: 'array', items: PASO, description: 'Solo en la plantilla "pasos": 3 o 4. En el resto, array vacío.' },
    chips: {
      type: 'array',
      items: { type: 'string' },
      description: 'Solo en "oferta": 2 o 3 chips de 1 a 3 palabras. En el resto, array vacío.',
    },
    // Dibuja la cifra grande del recuadro, no un emoji: el nombre del campo
    // quedó de antes. Pedirle un emoji al modelo ponía un panecillo a 64px
    // donde el negocio esperaba su descuento.
    emoji: { type: 'string', description: 'Solo en "oferta": la cifra de la promoción tal como se anuncia — "2×1", "50%", "$4.500". Sin inventar: si el pedido no trae un número, vacío. En el resto de las plantillas, vacío.' },
    fuente: { type: 'string', description: 'De dónde sale el dato duro, si la placa afirma uno. Si no, vacío.' },
    linea2: { type: 'string', description: 'Solo en "foto": la segunda línea, la que va en color. En el resto, vacío.' },
  },
}

const PUBLICACION = {
  type: 'object',
  additionalProperties: false,
  required: ['dia', 'canal', 'objetivo', 'placas', 'caption', 'hashtags', 'notaFoto'],
  properties: {
    dia: { type: 'string', description: 'Día sugerido: "lunes", "martes"…' },
    canal: { type: 'string', enum: ['feed', 'historia'] },
    objetivo: { type: 'string', description: 'En una frase, para qué sirve este posteo al negocio.' },
    placas: { type: 'array', items: PLACA },
    caption: { type: 'string', description: 'El texto del posteo. 2 a 5 renglones.' },
    hashtags: { type: 'array', items: { type: 'string' }, description: '4 a 8, con # adelante.' },
    notaFoto: {
      type: 'string',
      description: 'Si alguna placa es "foto": qué foto tiene que sacar el negocio, concreto. Si no, vacío.',
    },
  },
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['resumen', 'publicaciones'],
  properties: {
    resumen: { type: 'string', description: 'Dos o tres frases: qué se propone y por qué, dirigido al dueño del negocio.' },
    publicaciones: { type: 'array', items: PUBLICACION },
  },
}

/* ── contexto de la marca ────────────────────────────────── */

export function contextoDeMarca(brand) {
  const n = brand.negocio || {}
  const lineas = [
    `Negocio: ${brand.nombre}`,
    n.rubro && `Rubro: ${n.rubro}`,
    n.ciudad && `Ciudad: ${n.ciudad}`,
    n.queVende && `Qué vende: ${n.queVende}`,
    n.publico && `A quién le vende: ${n.publico}`,
    n.diferencial && `Lo que lo diferencia: ${n.diferencial}`,
    n.tono && `Tono pedido: ${n.tono}`,
    brand.handle && `Instagram: ${brand.handle}`,
    n.noDecir?.length && `Nunca menciones: ${n.noDecir.join(', ')}`,
    n.voz && `\nCómo habla el negocio, en sus propias palabras:\n${n.voz}`,
  ].filter(Boolean)
  return lineas.join('\n')
}

/* ── generación ──────────────────────────────────────────── */

/**
 * @param {object}  o
 * @param {object}  o.brand
 * @param {number} [o.posteos]   posteos de feed a proponer
 * @param {number} [o.historias] historias a proponer
 * @param {string} [o.pedido]    pedido puntual del usuario ("promo del finde")
 * @param {string} [o.evitar]    temas ya usados, para no repetir
 */
export async function generarPlan({ brand, posteos = 3, historias = 2, pedido = '', evitar = '', forma = '' }) {
  const total = posteos + historias
  if (total < 1) throw new Error('pedí al menos una pieza')
  if (total > 14) throw new Error('máximo 14 piezas por plan; hacelo en dos tandas')

  // Cuando se pide una publicación puntual —y no un plan de la semana— quien
  // elige la forma es el usuario en la pantalla, no la IA.
  const FORMAS = {
    post: 'Una sola placa de feed, sin carrusel.',
    carrusel: 'Un único carrusel de feed de 3 a 5 placas: portada, desarrollo y cierre.',
    historia: 'Una sola historia, canal "historia".',
    cuadrado: 'Una sola placa cuadrada, canal "cuadrado".',
  }

  const instruccion = [
    FORMAS[forma]
      ? `Armá una sola publicación. ${FORMAS[forma]}`
      : `Armá un plan de contenido con ${posteos} posteo(s) de feed y ${historias} historia(s).`,
    !FORMAS[forma] && posteos > 0 && `De los posteos de feed, al menos uno tiene que ser un carrusel de 3 a 5 placas (portada + desarrollo + cierre). Los demás pueden ser placa suelta.`,
    !FORMAS[forma] && historias > 0 && `Cada historia es una sola placa, canal "historia".`,
    pedido && `\nPedido puntual del negocio, tiene prioridad sobre todo lo demás:\n${pedido}`,
    evitar && `\nYa se publicó esto hace poco, no lo repitas:\n${evitar}`,
  ].filter(Boolean).join('\n')

  const { data, usage, costo } = await pedirJSON({
    reglas: REGLAS,
    contexto: contextoDeMarca(brand),
    prompt: instruccion,
    schema: SCHEMA,
    effort: 'high',
    maxTokens: 12000,
  })

  return { plan: data, usage, costo }
}

/* ── plan → spec del motor ───────────────────────────────── */

const PAD = n => String(n).padStart(2, '0')

export function placaToSlide(placa, { nombre, idx = '', formato = 'feed', foto = null }) {
  // Se sanea antes de mapear: lo que la plantilla no declara no llega al motor.
  const p = soloCamposDe(placa)
  // `disposicion` va en el slide para que una placa pueda pisar la de la marca.
  // La foto de fondo es opcional y transversal: cualquier plantilla puede
  // llevarla —el editor la ofrece en las historias— y el template la dibuja
  // solo si viene. Su crédito la acompaña siempre: es la licencia del banco.
  const base = {
    name: nombre, format: formato,
    disposicion: p.disposicion || undefined,
    photo: foto || undefined,
    credito: (foto && p.credito) || undefined,
  }

  switch (p.plantilla) {
    case 'portada':
      return { ...base, style: 'flat', type: 'cover', kick: p.kicker, title: p.titulo, body: p.cuerpo, idx }
    case 'texto':
      return { ...base, style: 'flat', type: 'body', kick: p.kicker, title: p.titulo, body: p.cuerpo, fuente: p.fuente || undefined, idx }
    case 'pasos':
      return {
        ...base, style: 'flat', type: 'steps', kick: p.kicker, title: p.titulo, idx,
        // Sin `d`: el paso quedó en etiqueta y qué se hace. El motor sigue
        // sabiendo dibujar esa línea —el spec la admite— pero ni el editor ni
        // el modelo la producen, así que las placas de los dos caminos salen
        // iguales.
        steps: (p.pasos || []).map(s => ({ n: s.numero, k: s.etiqueta, t: s.titulo })),
      }
    case 'oferta':
      // Nada de valores de relleno acá. Un "2 × 1" o un "BENEFICIO EXCLUSIVO"
      // puestos por defecto no son un placeholder feo que se note: son una
      // promesa comercial que el negocio nunca hizo y que igual se publica.
      // Si el campo está vacío, el bloque no se dibuja.
      return {
        ...base, style: 'flat', type: 'promo', idx,
        badge: p.kicker || undefined, title: p.titulo, cifra: p.emoji || undefined,
        body: p.cuerpo, chips: p.chips || [],
      }
    case 'cierre':
      return { ...base, style: 'flat', type: 'trial', pill: p.kicker, title: p.titulo, body: p.cuerpo, idx }
    case 'frase':
      return { ...base, style: 'flat', type: 'quote', title: p.titulo, body: p.cuerpo, idx }
    // El estilo "vector": titular serif sobre color pleno, con las palabras
    // marcadas en itálica y en el acento de la marca.
    case 'manifiesto':
      return { ...base, style: 'vector', eyebrow: p.kicker || '', headline: p.titulo }
    case 'foto':
      // La volanta va en una sola ranura —el eyebrow, arriba del título— y el
      // crédito en una sola —el pie—. Mandar el mismo dato a dos lugares hacía
      // que "OFICIO" y el crédito de la foto salieran duplicados en la placa.
      return {
        ...base, style: 'foto',
        eyebrow: p.kicker || '', line1: p.titulo, line2: p.linea2,
        photo: foto || null, src: p.credito || p.fuente || '',
      }
    default:
      throw new Error(`plantilla desconocida: ${p.plantilla}`)
  }
}

/**
 * Convierte un plan en un spec renderizable.
 * Las placas de tipo "foto" que no tengan imagen asignada quedan afuera del
 * spec y se devuelven en `pendientes`, para pedírselas al usuario.
 *
 * @param {object} plan
 * @param {object} o { outDir, fotos?: {"<idPublicacion>": "ruta.jpg"} }
 */
export function planToSpec(plan, { outDir, fotos = {} } = {}) {
  const slides = []
  const pendientes = []
  const publicaciones = []

  ;(plan.publicaciones || []).forEach((pub, i) => {
    const id = `${PAD(i + 1)}-${pub.canal === 'historia' ? 'historia' : 'post'}`
    const formato = pub.canal === 'historia' ? 'story' : 'feed'
    const total = pub.placas.length
    const archivos = []

    pub.placas.forEach((p, j) => {
      const nombre = total > 1 ? `${id}-${PAD(j + 1)}` : id
      const idx = total > 1 ? `${PAD(j + 1)}/${PAD(total)}` : ''
      const foto = fotos[id] || fotos[nombre] || null

      if (p.plantilla === 'foto' && !foto) {
        pendientes.push({ publicacion: id, placa: nombre, notaFoto: pub.notaFoto, linea1: p.titulo, linea2: p.linea2 })
        return
      }
      slides.push(placaToSlide(p, { nombre, idx, formato, foto }))
      archivos.push(`${nombre}.png`)
    })

    publicaciones.push({
      id, dia: pub.dia, canal: pub.canal, objetivo: pub.objetivo,
      caption: pub.caption, hashtags: pub.hashtags, notaFoto: pub.notaFoto || '',
      archivos,
    })
  })

  return { spec: { outDir, slides }, publicaciones, pendientes, resumen: plan.resumen }
}
