// Cuánto vale lo que el cliente viene generando.
//
// La idea: una pyme no tiene forma de dimensionar lo que recibe. "38 placas"
// no le dice nada; "38 placas, que a precio de diseñador son US$152" sí.
//
// Dos decisiones sobre cómo se redacta, porque acá es fácil pasarse de rosca:
//
// 1. Por defecto dice "equivalen a", no "ahorraste". Afirmar un ahorro es
//    afirmar algo sobre un mundo paralelo en el que el negocio contrataba a
//    alguien — y para 120 placas mensuales, ese mundo no existe: ninguna
//    panadería iba a gastar US$480 por mes en un diseñador. Un número que el
//    cliente no se cree no es neutro, le hace dudar de todo lo demás que ve en
//    pantalla. La equivalencia dice lo mismo sin prometer nada falso.
//    Si querés el otro texto, cambiá MODO a 'ahorro'.
//
// 2. El precio de referencia se declara siempre en pantalla junto al número.
//    Un monto sin la referencia que lo generó es una cifra inventada.

const num = (v, def) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : def)

export const REFERENCIA = {
  precioPorPlaca: num(process.env.CM_PRECIO_PLACA, 4),
  simbolo: process.env.CM_SIMBOLO || 'US$',
  moneda: process.env.CM_MONEDA || 'USD',
  // Qué es ese precio. Va impreso al lado del número, no en un tooltip.
  fuente: process.env.CM_FUENTE_PRECIO || 'lo que cobra un diseñador por una placa suelta',
  // 'equivalencia' | 'ahorro'
  modo: process.env.CM_MODO_VALOR === 'ahorro' ? 'ahorro' : 'equivalencia',
}

/** Suma las placas de todos los meses registrados. */
function totalPlacas(consumo = {}) {
  return Object.values(consumo).reduce((t, m) => t + (m.piezas || 0), 0)
}

export function formatearMonto(n, ref = REFERENCIA) {
  const entero = Math.round(n)
  return ref.simbolo + entero.toLocaleString('es-AR')
}

/**
 * @param {object} cuenta
 * @param {string} mesActual  'YYYY-MM'
 */
export function valorGenerado(cuenta, mesActual) {
  const ref = REFERENCIA
  const consumo = cuenta.consumo || {}
  const delMes = consumo[mesActual]?.piezas || 0
  const total = totalPlacas(consumo)

  return {
    placasMes: delMes,
    placasTotal: total,
    equivalenteMes: delMes * ref.precioPorPlaca,
    equivalenteTotal: total * ref.precioPorPlaca,
    referencia: {
      precioPorPlaca: ref.precioPorPlaca,
      simbolo: ref.simbolo,
      moneda: ref.moneda,
      fuente: ref.fuente,
      modo: ref.modo,
    },
    // Textos ya armados: la redacción de esto es una decisión de producto y no
    // conviene que cada pantalla la reinvente por su cuenta.
    texto: {
      mes: ref.modo === 'ahorro'
        ? `Este mes te ahorraste ${formatearMonto(delMes * ref.precioPorPlaca)}`
        : `Este mes equivalen a ${formatearMonto(delMes * ref.precioPorPlaca)}`,
      total: ref.modo === 'ahorro'
        ? `${formatearMonto(total * ref.precioPorPlaca)} ahorrados desde que empezaste`
        : `${formatearMonto(total * ref.precioPorPlaca)} desde que empezaste`,
      aclaracion: `a ${formatearMonto(ref.precioPorPlaca)} la placa — ${ref.fuente}`,
    },
  }
}
