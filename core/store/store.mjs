// Persistencia. Un archivo JSON por cuenta, bajo data/cuentas/.
//
// Deliberadamente simple: mientras el producto no tenga usuarios de verdad, una
// base de datos es infraestructura que hay que mantener sin que aporte nada.
// Todo el resto del código habla con este módulo y no con el sistema de
// archivos, así que el día que haga falta Postgres se cambia acá adentro.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const HERE = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = process.env.CM_DATA || resolve(HERE, '../../data')
const CUENTAS = join(DATA_DIR, 'cuentas')

function asegurarDirs() {
  mkdirSync(CUENTAS, { recursive: true })
}

const archivo = id => join(CUENTAS, `${id}.json`)

// Escritura atómica: si el proceso se cae a mitad de un guardado, la cuenta
// queda como estaba y no truncada a cero bytes.
function escribir(ruta, obj) {
  const tmp = `${ruta}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(obj, null, 2))
  renameSync(tmp, ruta)
}

const idValido = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id)

export function crearCuenta({ nombre, email, plan = 'unico' }) {
  asegurarDirs()
  const cuenta = {
    id: randomUUID(),
    nombre: nombre || email || 'sin nombre',
    email: email || null,
    plan,
    estado: 'activa',
    creada: new Date().toISOString(),
    marca: null,
    consumo: {},   // { "2026-08": { piezas: 12, planes: 2, logos: 1, costoUSD: 0.31 } }
    diario: {},    // { "2026-08-14": { piezas: 6, planes: 1 } }
    historial: [], // últimos temas publicados, para no repetir
  }
  escribir(archivo(cuenta.id), cuenta)
  return cuenta
}

export function leerCuenta(id) {
  if (!idValido(id)) throw new Error('id de cuenta inválido')
  const ruta = archivo(id)
  if (!existsSync(ruta)) throw new Error(`no existe la cuenta ${id}`)
  return JSON.parse(readFileSync(ruta, 'utf8'))
}

export function guardarCuenta(cuenta) {
  if (!idValido(cuenta?.id)) throw new Error('id de cuenta inválido')
  asegurarDirs()
  escribir(archivo(cuenta.id), cuenta)
  return cuenta
}

export function listarCuentas() {
  asegurarDirs()
  return readdirSync(CUENTAS)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const c = JSON.parse(readFileSync(join(CUENTAS, f), 'utf8'))
      return { id: c.id, nombre: c.nombre, plan: c.plan, marca: c.marca?.nombre || null, creada: c.creada }
    })
}

/** Carpeta de salida de las piezas de una cuenta. */
export function carpetaPiezas(cuentaId, sub = '') {
  if (!idValido(cuentaId)) throw new Error('id de cuenta inválido')
  const d = join(DATA_DIR, 'piezas', cuentaId, sub)
  mkdirSync(d, { recursive: true })
  return d
}
