// Disposiciones: cómo se acomoda el texto dentro de la placa.
//
// El problema que resuelve: la marca aporta color, tipografía y logo, pero la
// composición era siempre la misma. Cinco negocios distintos con la plantilla
// "texto" sacaban cinco placas con el mismo esqueleto — kicker arriba, título
// grande, párrafo debajo, todo alineado a la izquierda y centrado en vertical.
// El color no alcanza para que se vean distintas.
//
// Son cinco opciones cerradas y no un editor libre a propósito. Arrastrar cajas
// deja que el usuario rompa la placa: textos pisados, cosas fuera de la zona
// segura, jerarquías invertidas. Cinco composiciones diseñadas y probadas dan
// variedad real sin que nadie pueda arruinar el resultado.
//
// La disposición vive en la marca, no en la placa: el sentido es que un negocio
// se vea siempre igual a sí mismo y distinto de los demás. Una placa puntual
// puede pisarla con el campo `disposicion`.
//
// Las escalas son multiplicadores sobre el tamaño base del formato, no píxeles
// fijos: así una disposición se comporta igual en feed, historia y cuadrado.

export const DISPOSICIONES = {
  clasica: {
    id: 'clasica',
    label: 'Clásica',
    descripcion: 'Kicker, título y párrafo alineados a la izquierda, centrados en la placa. La más neutra.',
    titulo: 1,
    cuerpo: 1,
    css: () => '',
  },

  titular: {
    id: 'titular',
    label: 'Titular',
    descripcion: 'El título ocupa casi toda la placa y el párrafo queda chico al pie. Como una tapa de revista.',
    titulo: 1.5,
    cuerpo: 0.84,
    // El vacío de arriba es el recurso, no un descuido: así funciona una tapa.
    // Lo que sí hay que separar es el pie, que si no queda pegado al párrafo.
    css: () => `
body.disp-titular .content{justify-content:flex-end;padding-bottom:10px}
body.disp-titular .kick{margin-bottom:22px}
body.disp-titular .title{letter-spacing:-.05em;line-height:.96;margin-bottom:22px}
body.disp-titular .title.big{line-height:1.02}
body.disp-titular .body{max-width:740px}
body.disp-titular .foot{margin-top:34px}
`,
  },

  centrada: {
    id: 'centrada',
    label: 'Centrada',
    descripcion: 'Todo al centro, con el título entre dos líneas. Sobria y con aire; sirve para anuncios.',
    titulo: 0.94,
    cuerpo: 0.96,
    css: () => `
body.disp-centrada .content{align-items:center;text-align:center}
body.disp-centrada .kick::before{display:none}
body.disp-centrada .kick{margin-bottom:26px}
body.disp-centrada .title{border-top:2px solid var(--accent);border-bottom:2px solid var(--accent);padding:24px 0;margin-bottom:26px}
body.disp-centrada.dark .title{border-color:var(--accent-dark)}
body.disp-centrada .body{max-width:700px}
body.disp-centrada .chips,body.disp-centrada .steps{justify-content:center}
body.disp-centrada .step{text-align:left}
`,
  },

  bloque: {
    id: 'bloque',
    label: 'Bloque',
    descripcion: 'El kicker va en un recuadro de color pleno y el texto se apoya arriba. Más afiche que posteo.',
    titulo: 1.02,
    cuerpo: 0.96,
    // `align-self:flex-start` es lo que hace que el recuadro abrace al texto:
    // sin eso el contenedor en columna lo estira a todo el ancho y parece una
    // barra de encabezado en vez de una etiqueta. Y va centrado en vertical: si
    // se ancla arriba, un texto corto deja medio lienzo vacío.
    css: () => `
body.disp-bloque .kick{align-self:flex-start;background:var(--accent);color:#fff;padding:11px 18px;border-radius:2px;margin-bottom:26px;gap:0}
body.disp-bloque .kick::before{display:none}
body.disp-bloque.dark .kick{background:var(--accent-dark);color:var(--dark-bg)}
body.disp-bloque .body{text-align:justify;text-justify:inter-word}
body.disp-bloque .title{margin-bottom:26px}
`,
  },

  ficha: {
    id: 'ficha',
    label: 'Ficha',
    descripcion: 'Título chico arriba de una línea y el párrafo grande como protagonista. Para explicar algo.',
    titulo: 0.62,
    cuerpo: 1.22,
    css: () => `
body.disp-ficha .title{letter-spacing:-.02em;line-height:1.1;padding-bottom:22px;border-bottom:1px solid var(--hair);margin-bottom:26px}
body.disp-ficha.dark .title{border-bottom-color:rgba(255,255,255,.2)}
body.disp-ficha .body{color:var(--ink);font-weight:500;line-height:1.36}
body.disp-ficha.dark .body{color:#fff}
body.disp-ficha .body b{color:var(--accent)}
body.disp-ficha.dark .body b{color:var(--accent-dark)}
`,
  },
}

export const DISPOSICION_POR_DEFECTO = 'clasica'

export function resolverDisposicion(id) {
  const d = DISPOSICIONES[id || DISPOSICION_POR_DEFECTO]
  if (!d) {
    throw new Error(
      `disposición desconocida: "${id}". Disponibles: ${Object.keys(DISPOSICIONES).join(', ')}`
    )
  }
  return d
}

/** Todas las reglas juntas. Se inyectan siempre; la clase del body elige. */
export function cssDeDisposiciones() {
  return Object.values(DISPOSICIONES).map(d => d.css()).join('')
}

export const catalogoDisposiciones = () =>
  Object.values(DISPOSICIONES).map(({ id, label, descripcion }) => ({ id, label, descripcion }))
