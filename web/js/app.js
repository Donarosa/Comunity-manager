// Armado de la aplicación: qué pantalla se ve y cómo se pasa de una a otra.

import { api } from './api.js'
import { el, $, $$, vaciar, aviso } from './ui.js'
import { iniciarWizard } from './wizard.js'
import { iniciarEditor } from './editor.js'

const LLAVE = 'cm.cuenta'
const landing = $('#landing')
const app = $('#app')
const cuerpo = $('#app-cuerpo')
const chip = $('#chip-cuenta')

let catalogo = null
let cuenta = null
let estadoCuota = null

/* ── navegación ──────────────────────────────────────────── */

function mostrarLanding() {
  app.classList.add('oculto')
  landing.classList.remove('oculto')
  $$('[data-solo-landing]').forEach(n => n.classList.remove('oculto'))
  $('#btn-entrar').textContent = cuenta ? 'Entrar' : 'Empezar'
}

function mostrarApp(pintar) {
  landing.classList.add('oculto')
  app.classList.remove('oculto')
  $$('[data-solo-landing]').forEach(n => n.classList.add('oculto'))
  $('#btn-entrar').textContent = 'Inicio'
  vaciar(cuerpo)
  pintar(cuerpo)
}

function actualizarChip(estado) {
  if (estado) estadoCuota = estado
  if (!estadoCuota) return chip.classList.add('oculto')
  const r = estadoCuota.restante
  chip.classList.remove('oculto')
  chip.innerHTML = `<b>${r.piezas.mes}</b> placas este mes · <b>${r.piezas.dia}</b> hoy`
}

/* ── pantallas ───────────────────────────────────────────── */

function inicio() {
  mostrarApp(cont => {
    const marca = cuenta.marca
    cont.append(
      el('div', { style: 'padding:44px 0 20px' },
        el('span.rotulo', {}, 'Tu marca'),
        el('h2', { style: 'margin:6px 0 4px' }, marca?.nombre || cuenta.nombre),
        el('p.apunte', {}, marca ? `${marca.handle} · logo ${marca.logo === 'default' ? 'genérico' : marca.logo}` : 'Todavía sin marca cargada.')
      )
    )

    if (!marca) {
      cont.append(
        aviso('Antes de publicar hay que cargar la marca.', ''),
        el('div', { style: 'margin-top:16px' },
          el('button.btn', { onclick: abrirWizard }, 'Armar mi marca'))
      )
      return
    }

    // El panel de valor solo aparece cuando hay algo que contar. Un tablero que
    // dice "0 placas · equivalen a US$0" no informa nada y desanima.
    const v = estadoCuota?.valor
    if (v?.placasTotal > 0) cont.append(panelDeValor(v))

    const tarjeta = (titulo, texto, etiquetaBoton, onClick, principal = false) =>
      el('section', { style: 'padding:24px 0;border-top:1px solid var(--linea)' },
        el('h3', {}, titulo),
        el('p.apunte', { style: 'margin:4px 0 14px' }, texto),
        el(`button.btn${principal ? '' : '.fantasma'}`, { onclick: onClick }, etiquetaBoton))

    cont.append(
      el('div', { style: v?.placasTotal ? '' : 'margin-top:26px' },
        tarjeta('Nueva publicación',
          'Elegís el formato, escribís el texto y bajás el PNG. Podés subir tu foto o buscar una con licencia libre.',
          'Empezar una placa', abrirEditor, true),
        tarjeta('Plan de contenido',
          'Te proponemos qué publicar esta semana —posteos e historias, con el texto del posteo y los hashtags— y sale todo renderizado.',
          'Pedir un plan', vistaPlan),
        tarjeta('Mi marca',
          'Cambiar el color, la tipografía o el logo. Se aplica a todo lo que generes de acá en adelante.',
          'Editar la marca', abrirWizard)
      ),
      estadoCuota ? el('p.medidor', { style: 'margin-top:26px' },
        `Plan ${estadoCuota.plan.nombre} · quedan ${estadoCuota.restante.piezas.mes} placas y ` +
        `${estadoCuota.restante.planes.mes} planes de contenido este mes.`) : null
    )
  })
}

/**
 * Cuánto viene generando el cliente, en placas y en su equivalente en plata.
 *
 * La aclaración del precio de referencia va impresa al lado del número, no en un
 * globito al pasar el mouse: un monto sin la referencia que lo produjo es una
 * cifra inventada, y el cliente lo huele.
 */
function panelDeValor(v) {
  const cifra = (rotulo, valor, pie) =>
    el('div', {},
      el('span.rotulo', { style: 'display:block;margin-bottom:4px' }, rotulo),
      el('strong.cifra', {}, valor),
      el('span.apunte.chico', { style: 'display:block;margin-top:2px' }, pie))

  return el('section.panel-valor', {},
    cifra('Placas hechas', String(v.placasTotal),
      v.placasMes ? `${v.placasMes} este mes` : 'ninguna este mes todavía'),
    cifra(v.referencia.modo === 'ahorro' ? 'Te ahorraste' : 'Equivalen a',
      formatearMonto(v.equivalenteTotal, v.referencia),
      v.texto.aclaracion)
  )
}

const formatearMonto = (n, ref) => ref.simbolo + Math.round(n).toLocaleString('es-AR')

function abrirEditor() {
  mostrarApp(cont => iniciarEditor({
    contenedor: cont,
    cuenta,
    catalogo,
    alVolver: inicio,
    alCambiarCuota: actualizarChip,
  }))
}

function abrirWizard() {
  mostrarApp(cont => iniciarWizard({
    contenedor: cont,
    catalogo,
    cuentaId: cuenta.id,
    alTerminar: async () => { await recargarCuenta(); inicio() },
  }))
}

/* ── plan de contenido ───────────────────────────────────── */

function vistaPlan() {
  mostrarApp(cont => {
    const panel = el('div', { style: 'padding:40px 0 80px;max-width:760px' })
    cont.append(panel)

    const posteos = el('select', {}, [1, 2, 3, 4].map(n => el('option', { value: n, selected: n === 3 }, `${n} posteo${n > 1 ? 's' : ''}`)))
    const historias = el('select', {}, [0, 1, 2, 3].map(n => el('option', { value: n, selected: n === 2 }, `${n} historia${n === 1 ? '' : 's'}`)))
    const pedido = el('textarea', { rows: 3, placeholder: 'Ej: quiero promocionar el combo del fin de semana y contar que ahora hacemos delivery.' })

    const salida = el('div', { style: 'margin-top:26px' })
    const pedir = el('button.btn', {
      onclick: async () => {
        pedir.disabled = true
        vaciar(salida).append(el('p.cargando-txt', {}, 'Escribiendo el contenido y renderizando las placas'))
        try {
          const r = await api.contenido(cuenta.id, {
            posteos: Number(posteos.value),
            historias: Number(historias.value),
            pedido: pedido.value.trim(),
          })
          actualizarChip(r.estado)
          mostrarPlan(salida, r)
        } catch (e) {
          vaciar(salida).append(aviso(e.message, 'malo'))
        } finally {
          pedir.disabled = false
        }
      },
    }, 'Armar el plan')

    panel.append(
      el('span.rotulo', {}, 'Plan de contenido'),
      el('h2', { style: 'margin:6px 0 8px' }, '¿Qué publicamos esta semana?'),
      el('p.intro', {}, 'Proponemos los posteos, escribimos el texto de las placas y el del posteo, y renderizamos todo. Vos revisás y subís.'),
      el('div.campo', {}, el('label', {}, 'Cuánto'),
        el('div', { style: 'display:flex;gap:10px' }, posteos, historias)),
      el('div.campo', {}, el('label', {}, '¿Algo puntual?'),
        el('span.ayuda', {}, 'Opcional. Si hay una promoción, una novedad o algo que querés contar, escribilo acá y tiene prioridad.'),
        pedido),
      el('div.acciones-paso', {}, pedir, el('button.btn.texto', { onclick: inicio }, '← Volver')),
      salida
    )
  })
}

function mostrarPlan(cont, r) {
  vaciar(cont)
  cont.append(el('div.aviso.bien', {}, r.resumen))

  for (const pub of r.publicaciones) {
    const bloque = el('section', { style: 'padding:22px 0;border-top:1px solid var(--linea)' })
    bloque.append(
      el('span.rotulo', {}, `${pub.dia} · ${pub.canal}`),
      el('h3', { style: 'margin:3px 0 8px' }, pub.objetivo)
    )
    if (pub.archivos.length) {
      bloque.append(el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px' },
        pub.archivos.map(a => {
          const url = `/piezas/${cuenta.id}/${r.carpeta.split('/').pop()}/${a}`
          return el('a', { href: url, target: '_blank', download: a },
            el('img', { src: url, style: 'width:88px;border:1px solid var(--linea-fuerte);border-radius:2px;display:block' }))
        })))
    }
    bloque.append(
      el('div', { style: 'background:#fff;border:1px solid var(--linea);border-radius:var(--r);padding:14px' },
        el('div.rotulo', { style: 'margin-bottom:6px' }, 'Texto del posteo'),
        el('p', { style: 'white-space:pre-wrap;font-size:0.94rem' }, pub.caption),
        el('p.credito', { style: 'margin-top:8px' }, pub.hashtags.join(' '))
      )
    )
    cont.append(bloque)
  }

  if (r.pendientes?.length) {
    cont.append(el('div.aviso', { style: 'margin-top:20px' },
      'Faltan fotos para algunas placas: ' + r.pendientes.map(p => p.notaFoto).join(' · ') +
      '. Armalas desde "Nueva publicación" con la plantilla Sobre una foto.'))
  }
}

/* ── arranque ────────────────────────────────────────────── */

async function recargarCuenta() {
  const r = await api.cuenta(cuenta.id)
  cuenta = r.cuenta
  actualizarChip(r.estado)
}

async function entrar() {
  try {
    if (!cuenta) {
      const r = await api.crearCuenta({ nombre: 'Mi negocio' })
      cuenta = r.cuenta
      localStorage.setItem(LLAVE, cuenta.id)
      actualizarChip(r.estado)
      abrirWizard()
      return
    }
    await recargarCuenta()
    cuenta.marca ? inicio() : abrirWizard()
  } catch (e) {
    mostrarApp(cont => cont.append(
      el('div', { style: 'padding:60px 0' },
        aviso(`No pudimos entrar: ${e.message}`, 'malo'),
        el('button.btn.fantasma', {
          style: 'margin-top:14px',
          onclick: () => { localStorage.removeItem(LLAVE); location.reload() },
        }, 'Empezar de cero'))
    ))
  }
}

async function arrancar() {
  catalogo = await api.catalogo().catch(() => ({ tipografias: [], formatos: [], planes: [] }))

  const guardada = localStorage.getItem(LLAVE)
  if (guardada) {
    try {
      const r = await api.cuenta(guardada)
      cuenta = r.cuenta
      actualizarChip(r.estado)
    } catch {
      localStorage.removeItem(LLAVE) // la cuenta ya no existe en el servidor
    }
  }

  $('#btn-entrar').addEventListener('click', () => {
    if (!app.classList.contains('oculto') && cuenta?.marca) return mostrarLanding()
    entrar()
  })
  $$('[data-ir="wizard"]').forEach(b => b.addEventListener('click', entrar))
  mostrarLanding()
}

arrancar()
