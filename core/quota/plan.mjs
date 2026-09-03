// El plan y sus límites.
//
// Un solo plan a propósito: para una micro pyme, elegir entre tres opciones es
// fricción antes de haber visto el producto funcionar. Cuando haya datos reales
// de consumo, abrir tiers es agregar entradas acá y un campo en la cuenta —
// el resto del código ya lee los límites de este archivo.
//
// Los límites son dos, y hacen cosas distintas: el mensual define qué compró la
// persona, el diario evita que se queme el mes entero en una tarde (y evita que
// un bug o un abuso dispare la factura de API en una noche).

export const PLANES = {
  unico: {
    id: 'unico',
    nombre: 'Community',
    precioARS: null, // definir antes de conectar el cobro
    descripcion: 'Contenido de Instagram listo para publicar, con tu marca aplicada.',
    limites: {
      piezasMes: 120,   // placas renderizadas (una placa de carrusel cuenta una)
      piezasDia: 24,
      planesMes: 12,    // llamadas al generador de contenido
      planesDia: 3,
      logosMes: 1,      // generaciones de logo por IA
      marcas: 1,
    },
  },

  // Cuenta interna, sin límites. Para pruebas y demos.
  interno: {
    id: 'interno',
    nombre: 'Interno',
    precioARS: 0,
    descripcion: 'Sin límites. No asignar a clientes.',
    limites: {
      piezasMes: Infinity, piezasDia: Infinity,
      planesMes: Infinity, planesDia: Infinity,
      logosMes: Infinity, marcas: Infinity,
    },
  },
}

export const PLAN_POR_DEFECTO = 'unico'

/**
 * Las cuentas internas, por variable de entorno.
 *
 * `CUENTAS_INTERNAS` lleva los ids separados por coma. Va por entorno y no
 * guardado en la cuenta a propósito: así el plan interno no se puede otorgar
 * desde ninguna ruta de la aplicación —ni por error ni a mano por alguien que
 * consiguió un token— y para sacarlo alcanza con editar una variable, sin tocar
 * datos de nadie.
 */
const internas = () => new Set(
  (process.env.CUENTAS_INTERNAS || '').split(',').map(s => s.trim()).filter(Boolean)
)

/** ¿Esta cuenta corre sin límites? */
export const esInterna = id => Boolean(id) && internas().has(String(id))

export function resolverPlan(id) {
  const p = PLANES[id || PLAN_POR_DEFECTO]
  if (!p) throw new Error(`plan desconocido: "${id}"`)
  return p
}

/**
 * El plan que le toca a una cuenta.
 *
 * Se resuelve por el id y no por lo que diga `cuenta.plan`, porque la cuenta la
 * escribe la aplicación y la lista la escribe quien opera el servidor.
 */
export function planDeCuenta(cuenta) {
  return resolverPlan(esInterna(cuenta?.id) ? 'interno' : cuenta?.plan)
}

// Qué recurso consume cada acción, y contra qué límites se mide.
export const RECURSOS = {
  piezas: { mes: 'piezasMes', dia: 'piezasDia', etiqueta: 'placas' },
  planes: { mes: 'planesMes', dia: 'planesDia', etiqueta: 'planes de contenido' },
  logos: { mes: 'logosMes', dia: null, etiqueta: 'generaciones de logo' },
}
