#!/usr/bin/env node
// CLI del community manager. Es la forma más rápida de usar el producto
// mientras no exista la web, y sirve de referencia de qué hace cada caso de uso.
//
//   node cm.mjs ayuda

import { readFileSync } from 'fs'
import * as svc from './core/service.mjs'
import { QuotaError } from './core/quota/ledger.mjs'

/* ── argumentos ──────────────────────────────────────────── */

const argv = process.argv.slice(2)
const comando = argv[0]
const posicionales = argv.slice(1).filter(a => !a.startsWith('--'))
const flags = Object.fromEntries(
  argv.filter(a => a.startsWith('--')).map(a => {
    const i = a.indexOf('=')
    return i === -1 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]
  })
)

const num = (v, def) => (v === undefined ? def : Number(v))
const lista = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : [])

/* ── salida ──────────────────────────────────────────────── */

const dim = s => `\x1b[2m${s}\x1b[0m`
const bold = s => `\x1b[1m${s}\x1b[0m`

function mostrarEstado(e) {
  const r = e.restante
  console.log(dim(`  Plan ${e.plan.nombre} · quedan ${r.piezas.mes} placas y ${r.planes.mes} planes este mes ` +
    `(hoy: ${r.piezas.dia} placas) · API gastada este mes: US$${e.costoMesUSD.toFixed(3)}`))
  const v = e.valor
  if (v?.placasTotal) {
    console.log(dim(`  ${v.placasTotal} placas hechas · ${v.texto.total} (${v.texto.aclaracion})`))
  }
}

const AYUDA = `
${bold('cm')} — community manager para micro pymes

  ${bold('node cm.mjs alta')} --nombre="Panadería Mendieta" [--email=...]
      Crea una cuenta y devuelve su id.

  ${bold('node cm.mjs marca')} <cuentaId> --nombre=".." --color="#8C1D2F" [opciones]
      Carga o actualiza la marca. Acepta datos parciales.
      Opciones: --tipografia (moderno|editorial|calido|tecnico|clasico|geometrico)
                --handle --sitio --colorSecundario
                --rubro --ciudad --publico --queVende --diferencial --tono
                --noDecir="a,b,c"  --voz="cómo habla el negocio"

  ${bold('node cm.mjs logo')} <cuentaId>
      Genera 3 propuestas de isotipo y una placa de muestra con cada una.
      Consume la cuota de logos (1 por mes).

  ${bold('node cm.mjs logo:elegir')} <cuentaId> <opcion-1|opcion-2|opcion-3>

  ${bold('node cm.mjs logo:subir')} <cuentaId> --svg=archivo.svg
      Usa el logo propio del negocio. Tiene que estar hecho de trazos.

  ${bold('node cm.mjs contenido')} <cuentaId> [--posteos=3] [--historias=2]
      [--pedido="promocionar el combo del finde"] [--fotos=archivo.json]
      El camino principal: propone el contenido y lo deja renderizado.

  ${bold('node cm.mjs placa')} <cuentaId> --json=placa.json [--canal=feed|historia|cuadrado]
      El texto lo escribís vos. No usa IA, solo cuota de placas.

  ${bold('node cm.mjs estado')} <cuentaId>
  ${bold('node cm.mjs cuentas')}
  ${bold('node cm.mjs catalogo')}
`

/* ── comandos ────────────────────────────────────────────── */

async function main() {
  switch (comando) {
    case undefined:
    case 'ayuda':
    case '--help':
      console.log(AYUDA)
      return

    case 'catalogo': {
      const c = svc.catalogo()
      console.log(bold('\nTipografías'))
      for (const t of c.tipografias) console.log(`  ${t.id.padEnd(12)} ${t.label.padEnd(12)} ${dim(t.vibe)}`)
      console.log(bold('\nFormatos'))
      for (const f of c.formatos) console.log(`  ${f.id.padEnd(12)} ${f.w}×${f.h} ${dim(f.label)}`)
      console.log(bold('\nPlanes'))
      for (const p of c.planes) {
        console.log(`  ${p.id.padEnd(12)} ${p.nombre}`)
        console.log(dim(`               ${p.limites.piezasMes} placas/mes · ${p.limites.piezasDia}/día · ` +
          `${p.limites.planesMes} planes/mes · ${p.limites.logosMes} logo/mes`))
      }
      console.log()
      return
    }

    case 'cuentas': {
      const cs = svc.listarCuentas()
      if (!cs.length) return console.log('No hay cuentas todavía. Creá una con: node cm.mjs alta --nombre="..."')
      for (const c of cs) console.log(`${c.id}  ${(c.marca || c.nombre).padEnd(28)} ${dim(c.plan)}`)
      return
    }

    case 'alta': {
      const { cuenta, estado } = svc.altaCuenta({
        nombre: flags.nombre, email: flags.email, plan: flags.plan,
      })
      console.log(`Cuenta creada: ${bold(cuenta.id)}`)
      mostrarEstado(estado)
      console.log(dim('\nSiguiente paso:'))
      console.log(dim(`  node cm.mjs marca ${cuenta.id} --nombre="..." --color="#8C1D2F" --rubro="..." --ciudad="..."`))
      return
    }

    case 'marca': {
      const id = requiereId()
      const { marca, avisos } = svc.configurarMarca(id, {
        nombre: flags.nombre, handle: flags.handle, sitio: flags.sitio, altSitio: flags.altSitio,
        color: flags.color, colorSecundario: flags.colorSecundario, tipografia: flags.tipografia,
        rubro: flags.rubro, ciudad: flags.ciudad, publico: flags.publico,
        queVende: flags.queVende, diferencial: flags.diferencial, tono: flags.tono,
        voz: flags.voz, noDecir: lista(flags.noDecir),
      })
      console.log(`Marca: ${bold(marca.nombre)}  ${marca.handle}`)
      console.log(`Tipografía: ${marca.fonts.preset} (${marca.fonts.sans} / ${marca.fonts.serif})`)
      console.log('Paleta derivada:')
      for (const [k, v] of Object.entries(marca.colors.flat)) console.log(`  ${k.padEnd(14)} ${v}`)
      for (const a of avisos) console.log(dim(`  ! ${a}`))
      return
    }

    case 'logo': {
      const id = requiereId()
      console.log('Diseñando 3 propuestas…')
      const r = await svc.proponerLogos(id)
      for (const p of r.propuestas) {
        console.log(`\n  ${bold(p.id)} — ${p.concepto}`)
        console.log(dim(`  muestra: ${p.preview}`))
      }
      console.log(dim(`\n  costo de esta generación: US$${r.costoUSD.toFixed(4)}`))
      mostrarEstado(r.estado)
      console.log(dim(`\n  Para adoptar una: node cm.mjs logo:elegir ${id} opcion-1`))
      return
    }

    case 'logo:elegir': {
      const id = requiereId()
      const opcion = posicionales[1]
      if (!opcion) throw new Error('decime qué opción: opcion-1, opcion-2 u opcion-3')
      svc.elegirLogo(id, opcion)
      console.log(`Listo. La marca ahora usa ${opcion}.`)
      return
    }

    case 'logo:subir': {
      const id = requiereId()
      if (!flags.svg) throw new Error('pasá --svg=archivo.svg')
      const svg = readFileSync(flags.svg, 'utf8')
      const viewBox = svg.match(/viewBox\s*=\s*"([^"]+)"/)?.[1] || '0 0 100 100'
      const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '')
      const { logo } = svc.subirLogo(id, { viewBox, inner, strokeWidth: num(flags.grosor, 8) })
      console.log(`Logo cargado. ${logo.inner.split('<').length - 1} forma(s) útiles, viewBox ${logo.viewBox}.`)
      return
    }

    case 'contenido': {
      const id = requiereId()
      const fotos = flags.fotos ? JSON.parse(readFileSync(flags.fotos, 'utf8')) : {}
      console.log('Escribiendo el contenido…')
      const r = await svc.generarContenido(id, {
        posteos: num(flags.posteos, 3),
        historias: num(flags.historias, 2),
        pedido: flags.pedido || '',
        etiqueta: flags.etiqueta || '',
        fotos,
      })
      console.log(`\n${r.resumen}\n`)
      for (const p of r.publicaciones) {
        console.log(`${bold(p.id)}  ${p.dia} · ${p.canal}`)
        console.log(dim(`  ${p.objetivo}`))
        for (const a of p.archivos) console.log(`  · ${a}`)
        console.log(`\n  ${p.caption.split('\n').join('\n  ')}`)
        console.log(dim(`  ${p.hashtags.join(' ')}\n`))
      }
      if (r.pendientes.length) {
        console.log(bold('Faltan fotos:'))
        for (const p of r.pendientes) console.log(`  ${p.publicacion}: ${p.notaFoto}`)
        console.log(dim('  Pasá las rutas con --fotos=archivo.json y volvé a generar esa pieza.\n'))
      }
      console.log(dim(`Carpeta: ${r.carpeta}`))
      console.log(dim(`Costo de API de este plan: US$${r.costoUSD.toFixed(4)}`))
      mostrarEstado(r.estado)
      return
    }

    case 'placa': {
      const id = requiereId()
      if (!flags.json) throw new Error('pasá --json=archivo.json con las placas')
      const entrada = JSON.parse(readFileSync(flags.json, 'utf8'))
      const r = await svc.renderizarPieza(id, {
        canal: flags.canal || 'feed',
        nombre: flags.nombre || '',
        foto: flags.foto || null,
        placas: Array.isArray(entrada) ? entrada : entrada.placas,
      })
      for (const a of r.archivos) console.log(`  ✓ ${a.name}.png (${a.format})`)
      console.log(dim(`Carpeta: ${r.carpeta}`))
      mostrarEstado(r.estado)
      return
    }

    case 'estado': {
      const id = requiereId()
      const { cuenta, estado } = svc.estadoCuenta(id)
      console.log(`${bold(cuenta.nombre)}  ${dim(cuenta.id)}`)
      console.log(cuenta.marca
        ? `Marca: ${cuenta.marca.nombre} ${cuenta.marca.handle} · logo: ${cuenta.marca.logo}`
        : dim('Sin marca cargada.'))
      mostrarEstado(estado)
      return
    }

    default:
      console.error(`No conozco el comando "${comando}".`)
      console.log(AYUDA)
      process.exit(1)
  }
}

function requiereId() {
  const id = posicionales[0]
  if (!id) throw new Error('falta el id de cuenta. Listalas con: node cm.mjs cuentas')
  return id
}

try {
  await main()
} catch (e) {
  if (e instanceof QuotaError) {
    console.error(`\n${e.message}`)
    process.exit(2)
  }
  console.error(`\nError: ${e.message}`)
  process.exit(1)
}
