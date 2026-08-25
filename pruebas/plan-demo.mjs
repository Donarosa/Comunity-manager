// Renderiza las placas de un plan de contenido plausible con el motor REAL.
// El texto lo escribí yo imitando lo que produciría el generador; las placas
// que salen son verdaderas, hechas con la marca del vivero.
import { leerCuenta } from '../core/store/store.mjs'
import { renderSpec } from '../core/render/engine.mjs'
import { planToSpec } from '../core/content/plan.mjs'

const cuenta = leerCuenta('977d8fb6-1438-4dc4-b9b0-a477caddaa27')
const marca = cuenta.marca

const plan = {
  resumen: 'Esta semana apuntamos a la gente con balcón que no sabe qué poner. Dos posteos de oficio —lo que sabés y nadie más cuenta— y una historia para mostrar que las plantas salen del predio.',
  publicaciones: [
    {
      dia: 'lunes', canal: 'feed',
      objetivo: 'Mostrar que criamos lo que vendemos, y que eso se nota en la planta.',
      caption: 'La diferencia entre una planta criada acá y una de reventa se ve a los dos meses.\n\nNosotros la vimos crecer: sabemos con cuánta luz se hizo, cuándo la trasplantamos y qué aguanta. Eso es lo que te contamos cuando venís a preguntar.\n\nEstamos de lunes a sábado, de 9 a 18.',
      hashtags: ['#vivero', '#laplata', '#plantasdeinterior', '#jardineria', '#balcon'],
      notaFoto: '',
      placas: [
        { plantilla: 'portada', kicker: 'Del predio', titulo: 'Por qué una planta de vivero <span class="acc">aguanta más</span>', cuerpo: 'La criamos nosotros. Sabemos con cuánta luz se hizo y qué le va a pasar en tu casa.', pasos: [], chips: [], emoji: '', fuente: '', linea2: '' },
        { plantilla: 'pasos', kicker: 'Antes de comprar', titulo: 'Tres cosas que <span class="acc">hay que mirar</span>', cuerpo: '', chips: [], emoji: '', fuente: '', linea2: '',
          pasos: [
            { numero: '1', etiqueta: 'Primero', titulo: 'De dónde viene la luz', detalle: 'Una ventana al sur no es lo mismo que una al norte.' },
            { numero: '2', etiqueta: 'Después', titulo: 'Tocá la tierra', detalle: 'Si está compacta y seca, la planta viene sufriendo.' },
            { numero: '3', etiqueta: 'Al final', titulo: 'Dala vuelta', detalle: 'Raíces asomando por abajo: le quedó chica la maceta.' },
          ] },
        { plantilla: 'cierre', kicker: 'Vení a ver', titulo: 'Te asesoramos <span class="acc">sin apuro</span>', cuerpo: 'Traé una foto de dónde la querés poner y te decimos qué va a andar ahí.', pasos: [], chips: [], emoji: '', fuente: '', linea2: '' },
      ],
    },
    {
      dia: 'jueves', canal: 'feed',
      objetivo: 'Empujar los plantines de tomate, que se plantan ahora o se pierde la temporada.',
      caption: 'Los plantines de tomate se plantan ahora para cosechar en diciembre. Después ya es tarde.\n\nVinieron de una sola tanda, así que quedan pocos. 🍅\n\nPasá esta semana.',
      hashtags: ['#huerta', '#tomate', '#laplata', '#vivero', '#huertaencasa'],
      notaFoto: '',
      placas: [
        { plantilla: 'oferta', kicker: 'Temporada', titulo: 'Plantines de <span class="acc">tomate</span>', cuerpo: 'Se plantan ahora para cosechar en diciembre. Vinieron de una sola tanda: quedan pocos.', emoji: '🍅', chips: ['Cherry', 'Perita', 'Redondo'], pasos: [], fuente: '', linea2: '' },
      ],
    },
    {
      dia: 'sábado', canal: 'historia',
      objetivo: 'Mostrar el predio un sábado a la mañana, que es cuando más gente pasa.',
      caption: 'Sábado a la mañana en el predio. Todo esto sale de acá.',
      hashtags: ['#vivero', '#laplata', '#detrasdeescena'],
      notaFoto: '',
      placas: [
        { plantilla: 'texto', kicker: 'Sábado', titulo: 'Todo lo que ves <span class="acc">sale de acá</span>', cuerpo: 'No revendemos. Cada planta que te llevás la criamos en el predio, y por eso sabemos qué necesita.', pasos: [], chips: [], emoji: '', fuente: '', linea2: '' },
      ],
    },
  ],
}

const outDir = 'data/piezas/977d8fb6-1438-4dc4-b9b0-a477caddaa27/plan-demo'
const { spec, publicaciones, resumen } = planToSpec(plan, { outDir })
await renderSpec({ spec, brand: marca })
console.log(JSON.stringify({ resumen, publicaciones, carpeta: outDir, pendientes: [] }, null, 0))
