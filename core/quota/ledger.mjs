// Contador de consumo por cuenta.
//
// El corte del día se calcula en hora argentina, no en UTC: si el límite diario
// se reseteara a las 21:00 hora local, el usuario vería un comportamiento que no
// puede explicarse.

import { resolverPlan, RECURSOS } from './plan.mjs'

const TZ = process.env.CM_TZ || 'America/Argentina/Buenos_Aires'

export function periodo(fecha = new Date()) {
  // en-CA da directamente YYYY-MM-DD.
  const dia = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(fecha)
  return { dia, mes: dia.slice(0, 7) }
}

export class QuotaError extends Error {
  constructor(mensaje, detalle) {
    super(mensaje)
    this.name = 'QuotaError'
    this.codigo = 'cuota_excedida'
    this.detalle = detalle
  }
}

function contadores(cuenta) {
  const { dia, mes } = periodo()
  cuenta.consumo ||= {}
  cuenta.diario ||= {}
  cuenta.consumo[mes] ||= { piezas: 0, planes: 0, logos: 0, costoUSD: 0 }
  cuenta.diario[dia] ||= { piezas: 0, planes: 0, logos: 0 }
  return { mes, dia, delMes: cuenta.consumo[mes], delDia: cuenta.diario[dia] }
}

export function estado(cuenta) {
  const plan = resolverPlan(cuenta.plan)
  const { mes, dia, delMes, delDia } = contadores(cuenta)
  const L = plan.limites

  const restante = {}
  for (const [nombre, r] of Object.entries(RECURSOS)) {
    restante[nombre] = {
      mes: L[r.mes] - (delMes[nombre] || 0),
      dia: r.dia ? L[r.dia] - (delDia[nombre] || 0) : null,
    }
  }

  return {
    plan: { id: plan.id, nombre: plan.nombre, limites: L },
    periodo: { mes, dia },
    usado: { mes: { ...delMes }, dia: { ...delDia } },
    restante,
    costoMesUSD: Number((delMes.costoUSD || 0).toFixed(4)),
  }
}

/** Lanza QuotaError si `cantidad` no entra. No modifica nada. */
export function verificar(cuenta, recurso, cantidad = 1) {
  const r = RECURSOS[recurso]
  if (!r) throw new Error(`recurso desconocido: ${recurso}`)
  const plan = resolverPlan(cuenta.plan)
  const { delMes, delDia } = contadores(cuenta)
  const L = plan.limites

  const restanteMes = L[r.mes] - (delMes[recurso] || 0)
  if (cantidad > restanteMes) {
    throw new QuotaError(
      restanteMes <= 0
        ? `Se agotaron las ${r.etiqueta} del mes en el plan ${plan.nombre}.`
        : `Pediste ${cantidad} ${r.etiqueta} y te quedan ${restanteMes} este mes.`,
      { recurso, alcance: 'mes', pedido: cantidad, restante: Math.max(0, restanteMes), limite: L[r.mes] }
    )
  }

  if (r.dia) {
    const restanteDia = L[r.dia] - (delDia[recurso] || 0)
    if (cantidad > restanteDia) {
      throw new QuotaError(
        restanteDia <= 0
          ? `Llegaste al tope de ${r.etiqueta} por día. Se renueva mañana.`
          : `Pediste ${cantidad} ${r.etiqueta} y te quedan ${restanteDia} hoy.`,
        { recurso, alcance: 'dia', pedido: cantidad, restante: Math.max(0, restanteDia), limite: L[r.dia] }
      )
    }
  }

  return true
}

/**
 * Descuenta consumo. Verifica primero, así nunca queda un contador en negativo.
 * El llamador es responsable de persistir la cuenta después.
 */
export function consumir(cuenta, recurso, cantidad = 1, { costoUSD = 0 } = {}) {
  verificar(cuenta, recurso, cantidad)
  const { delMes, delDia } = contadores(cuenta)
  delMes[recurso] = (delMes[recurso] || 0) + cantidad
  delDia[recurso] = (delDia[recurso] || 0) + cantidad
  delMes.costoUSD = Number(((delMes.costoUSD || 0) + costoUSD).toFixed(6))
  return estado(cuenta)
}

/** Suma costo de API sin tocar cuotas (por ejemplo, un reintento interno). */
export function registrarCosto(cuenta, costoUSD) {
  const { delMes } = contadores(cuenta)
  delMes.costoUSD = Number(((delMes.costoUSD || 0) + costoUSD).toFixed(6))
}
