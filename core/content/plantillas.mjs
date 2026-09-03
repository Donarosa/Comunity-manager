// Qué campos tiene cada plantilla.
//
// Vive acá y no en el editor porque las dos puntas necesitan la misma lista: el
// formulario pinta estos campos y `placaToSlide` no lee ningún otro. Con dos
// listas separadas se despegaban, y el síntoma no era un error sino texto de
// más en la placa: el estado de la placa es uno solo y sobrevive al cambio de
// plantilla, así que el cuerpo de una "oferta" seguía saliendo en la "frase",
// invisible en el formulario —que ya no muestra ese campo— y visible en el PNG
// que el cliente publica.
//
// Este módulo se sirve al navegador (`MODULOS_WEB` en api/server.mjs): no puede
// importar nada de Node.

/** Los campos de cada plantilla, en el orden en que se muestran. */
export const CAMPOS_DE_PLANTILLA = {
  portada: ['kicker', 'titulo', 'cuerpo'],
  texto: ['kicker', 'titulo', 'cuerpo', 'fuente'],
  pasos: ['kicker', 'titulo', 'pasos'],
  oferta: ['emoji', 'kicker', 'titulo', 'cuerpo', 'chips'],
  cierre: ['kicker', 'titulo', 'cuerpo'],
  // La frase se dibuja con título y cuerpo. Antes pedía una volanta que el
  // render descartaba y no pedía el cuerpo, que el render sí dibuja.
  frase: ['titulo', 'cuerpo'],
  foto: ['kicker', 'titulo', 'linea2', 'imagen', 'fuente'],
  // Manifiesto es el estilo "vector" del motor, que estaba terminado y probado
  // pero no tenía forma de pedirse desde la aplicación.
  manifiesto: ['kicker', 'titulo'],
}

/**
 * Los campos que se muestran de entrada. El resto queda detrás de un botón.
 *
 * De los cinco campos de la plantilla más usada, solo el título es
 * obligatorio; los otros cuatro salían con el mismo peso visual, así que el
 * formulario se leía como cinco cosas para completar antes de poder publicar.
 * Quien necesita la etiqueta la encuentra; quien no, ve dos campos.
 */
export const CAMPOS_PRINCIPALES = {
  portada: ['titulo', 'cuerpo'],
  texto: ['titulo', 'cuerpo'],
  pasos: ['titulo', 'pasos'],
  // La oferta abre entera. Tres de sus cinco campos estaban detrás de un botón
  // —incluida la cifra, que es lo más grande de la placa— así que al elegir la
  // plantilla el recuadro salía casi vacío y se armaba con lo que sobrara. El
  // orden es el del recuadro: primero qué es la oferta, después cómo se rotula.
  oferta: ['titulo', 'emoji', 'kicker', 'cuerpo', 'chips'],
  cierre: ['titulo', 'cuerpo'],
  frase: ['titulo', 'cuerpo'],
  foto: ['titulo', 'imagen'],
  manifiesto: ['titulo'],
}

/** Los que van plegados: los que la plantilla usa y no son principales. */
export function camposSecundarios(plantilla) {
  const todos = CAMPOS_DE_PLANTILLA[plantilla] || []
  const abiertos = new Set(CAMPOS_PRINCIPALES[plantilla] || [])
  return todos.filter(c => !abiertos.has(c))
}

/**
 * Qué plantilla usar de verdad, según dónde cae la placa.
 *
 * Portada, texto y cierre piden exactamente los mismos tres campos: lo único
 * que cambia es la estética, y esa estética depende de la posición —la portada
 * es la primera de un carrusel y el cierre el último—. Preguntárselo al usuario
 * era pedirle que resolviera algo que el sistema ya sabe.
 *
 * Solo se reasigna "texto": si eligió pasos, oferta o frase para la primera
 * placa, es una decisión suya y se respeta.
 */
export function plantillaSegunPosicion(plantilla, i, total) {
  if (plantilla !== 'texto' || total < 2) return plantilla
  if (i === 0) return 'portada'
  if (i === total - 1) return 'cierre'
  return 'texto'
}

/**
 * De qué claves del estado se ocupa cada campo.
 *
 * "imagen" es un campo solo en la pantalla: en el estado son dos cosas, el
 * archivo y su crédito. El resto se llama igual que el campo.
 */
const CLAVES_DE_CAMPO = { imagen: ['foto', 'credito'] }

/**
 * Lo que es de la placa y no de la plantilla: sobrevive al cambio.
 *
 * La foto de fondo es opcional en cualquier plantilla de historia, así que no
 * pertenece a ninguna en particular; y su crédito viaja con ella porque una
 * licencia de banco no se puede perder por cambiar de plantilla.
 */
const EXTRAS = ['disposicion', 'foto', 'credito']

/** Las claves del estado que una plantilla realmente usa. */
export function clavesDePlantilla(plantilla) {
  const campos = CAMPOS_DE_PLANTILLA[plantilla]
  if (!campos) return new Set()
  return new Set([...campos.flatMap(c => CLAVES_DE_CAMPO[c] || [c]), ...EXTRAS])
}

/** Deja en la placa solo los campos que su plantilla declara, más los extras. */
export function soloCamposDe(p) {
  if (!CAMPOS_DE_PLANTILLA[p?.plantilla]) return p
  const limpia = { plantilla: p.plantilla }
  for (const k of clavesDePlantilla(p.plantilla)) {
    if (p[k] !== undefined) limpia[k] = p[k]
  }
  return limpia
}
