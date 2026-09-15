// La música del aviso, sintetizada acá.
//
//   node video/musica.mjs          → video/musica.wav  (para escucharla sola)
//   node video/viral.mjs           la usa y la mezcla en el mp4
//
// Está escrita y no bajada. Un aviso comercial con música de otro es un
// problema de licencia esperando: las bibliotecas "libres de derechos" casi
// siempre piden atribución, prohíben el uso en publicidad pagada, o cambian de
// términos. Esto son senos, ruido y envolventes — no hay nada de nadie adentro.
//
// Y hay una segunda razón, que es la que la hace mejor que un tema comprado:
// **los golpes salen de los cortes del video**. `viral.html` publica sus
// tiempos en `window.HITOS` y `viral.mjs` se los pasa a `componer()`, así que
// el impacto cae exactamente donde el plano cambia. El día que se mueva un
// plano, la música se mueve con él sin que nadie la reedite.
//
// La armonía no cambia de tono en todo el aviso: es do mayor / la menor de
// punta a punta. Lo que cambia es el registro y qué grado suena — oscuro y
// grave mientras el problema, abierto y agudo desde que aparece la marca. Un
// cambio de tono se nota como un corte de música; esto se nota como que algo
// se acomodó, que es lo que el aviso está contando.

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 44100

/* La barra dura 1,75 s —137 negras por minuto—. No es un número lindo: es el
 * que hace que los tres primeros cortes del video (3,5 · 7,0 · 10,5) caigan
 * justo cada dos barras. */
const BARRA = 1.75

const hz = midi => 440 * Math.pow(2, (midi - 69) / 12)

/* Los acordes, en números de nota MIDI. La voz más grave es el bajo; las tres
 * de arriba son el colchón y de ahí sale el arpegio. */
const ACORDES = {
  Am: [45, 57, 60, 64, 69],
  Dm: [38, 50, 57, 62, 65],
  E:  [40, 52, 56, 59, 64],
  F:  [41, 53, 57, 60, 65],
  C:  [36, 48, 55, 60, 64],
  G:  [43, 55, 59, 62, 67],
}

/* Ruido con semilla propia: `Math.random()` daría un charles distinto en cada
 * corrida y la pista dejaría de ser reproducible. */
let semilla = 0x2f6e2b1
const azar = () => {
  semilla = (semilla * 1664525 + 1013904223) >>> 0
  return semilla / 4294967296 * 2 - 1
}

const sujeta = v => Math.max(0, Math.min(1, v))

/** Una pieza pulsada: armónicos con decaimiento exponencial. El arpegio. */
function pulsada(bus, t0, f, dur, amp, pan = 0) {
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR)
  if (i0 + n <= 0) return
  const izq = Math.sqrt((1 - pan) / 2), der = Math.sqrt((1 + pan) / 2)
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j * 2 + 1 >= bus.length) continue
    const t = i / SR
    // El ataque de 4 ms saca el chasquido de arrancar en seco.
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 7.5)
    let v = 0
    for (let h = 1; h <= 5; h++) v += Math.sin(2 * Math.PI * f * h * t) / (h * h)
    v *= env * amp
    bus[j * 2] += v * izq
    bus[j * 2 + 1] += v * der
  }
}

/** El colchón: dos senos desafinados entre sí, con entrada y salida lentas. */
function colchon(bus, t0, f, dur, amp, pan = 0) {
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR)
  const izq = Math.sqrt((1 - pan) / 2), der = Math.sqrt((1 + pan) / 2)
  const sube = Math.min(0.35, dur * 0.3), baja = Math.min(0.5, dur * 0.4)
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j * 2 + 1 >= bus.length) continue
    const t = i / SR
    const env = Math.min(1, t / sube) * Math.min(1, (dur - t) / baja)
    // El batido de las dos voces a 0,12 Hz es lo que hace que respire en vez de
    // quedarse quieto como un tono de prueba.
    const v = (Math.sin(2 * Math.PI * f * t) + 0.85 * Math.sin(2 * Math.PI * f * 1.0035 * t)
               + 0.3 * Math.sin(2 * Math.PI * f * 2 * t)) * env * amp
    bus[j * 2] += v * izq
    bus[j * 2 + 1] += v * der
  }
}

/** El bajo: seno grave con un poco de segundo armónico para que se oiga en un teléfono. */
function bajo(bus, t0, f, dur, amp) {
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR)
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j * 2 + 1 >= bus.length) continue
    const t = i / SR
    const env = Math.min(1, t / 0.012) * Math.min(1, (dur - t) / 0.08) * Math.exp(-t * 2.4)
    const v = (Math.sin(2 * Math.PI * f * t) + 0.22 * Math.sin(2 * Math.PI * f * 2 * t)) * env * amp
    bus[j * 2] += v; bus[j * 2 + 1] += v
  }
}

/** El bombo: un seno que cae de 130 a 46 Hz en cincuenta milisegundos. */
function bombo(bus, t0, amp) {
  const i0 = Math.round(t0 * SR), n = Math.round(0.34 * SR)
  let fase = 0
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j * 2 + 1 >= bus.length) continue
    const t = i / SR
    const f = 46 + 84 * Math.exp(-t * 22)
    fase += 2 * Math.PI * f / SR
    const v = Math.sin(fase) * Math.exp(-t * 9) * amp
    bus[j * 2] += v; bus[j * 2 + 1] += v
  }
}

/** El charles: ruido derivado —eso lo agudiza— con caída muy corta. */
function charles(bus, t0, amp, abierto = false) {
  const dur = abierto ? 0.17 : 0.048
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR)
  let previo = 0, anterior = 0, suave = 0
  const kb = 1 - Math.exp(-2 * Math.PI * 9000 / SR)
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j * 2 + 1 >= bus.length) continue
    const r = azar()
    const alto = (r - 2 * previo + anterior) * 0.5   // dos derivadas: pasaaltos de dos polos
    anterior = previo; previo = r
    suave += (alto - suave) * kb
    const v = suave * Math.exp(-(i / SR) * (abierto ? 22 : 90)) * amp
    bus[j * 2] += v * 0.86
    bus[j * 2 + 1] += v * 1.14   // apenas corrido a la derecha, para que no quede pegado al centro
  }
}

/** La palmada de los tiempos 2 y 4: ruido con un poco de cuerpo. */
function palmada(bus, t0, amp) {
  const i0 = Math.round(t0 * SR), n = Math.round(0.22 * SR)
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j * 2 + 1 >= bus.length) continue
    const t = i / SR
    const v = (azar() * 0.8 + Math.sin(2 * Math.PI * 190 * t) * 0.25) * Math.exp(-t * 26) * amp
    bus[j * 2] += v; bus[j * 2 + 1] += v
  }
}

/** El golpe de corte: un boom grave y un golpe de ruido que se abre. */
function impacto(bus, t0, amp) {
  const i0 = Math.round(t0 * SR), n = Math.round(1.6 * SR)
  let fase = 0
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j * 2 + 1 >= bus.length) continue
    const t = i / SR
    const f = 38 + 70 * Math.exp(-t * 14)
    fase += 2 * Math.PI * f / SR
    const golpe = azar() * Math.exp(-t * 16) * 0.5
    const v = (Math.sin(fase) * Math.exp(-t * 3.2) + golpe) * amp
    bus[j * 2] += v; bus[j * 2 + 1] += v
  }
}

/** La subida que anuncia un golpe: ruido filtrado que se abre y se acelera. */
function subida(bus, t0, dur, amp) {
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR)
  let filtrado = 0
  for (let i = 0; i < n; i++) {
    const j = i0 + i
    if (j < 0 || j * 2 + 1 >= bus.length) continue
    const p = i / n
    // El corte del filtro se abre con el tiempo: al principio sordo, al final brillante.
    const k = 0.02 + 0.5 * p * p
    filtrado += (azar() - filtrado) * k
    const v = filtrado * p * p * amp
    bus[j * 2] += v * 0.9
    bus[j * 2 + 1] += v * 1.1
  }
}

/* Una reverb de Schroeder: cuatro peines en paralelo y dos pasatodo en serie.
 * Va sólo en el colchón, el arpegio y los golpes; el bombo y el bajo quedan
 * secos o el grave se empasta y en un parlante de teléfono no se entiende nada. */
function reverb(bus, mezcla = 0.3) {
  const PEINES = [1557, 1617, 1491, 1422, 1277, 1356]
  const PASATODO = [225, 556, 441]
  const n = bus.length / 2
  for (let c = 0; c < 2; c++) {
    const seco = new Float32Array(n)
    for (let i = 0; i < n; i++) seco[i] = bus[i * 2 + c]
    const humedo = new Float32Array(n)
    for (const d0 of PEINES) {
      const d = d0 + c * 23   // las dos orillas con retardos distintos: así suena ancho
      const linea = new Float32Array(d)
      let p = 0
      for (let i = 0; i < n; i++) {
        const y = linea[p]
        humedo[i] += y / PEINES.length
        linea[p] = seco[i] + y * 0.805
        p = (p + 1) % d
      }
    }
    for (const d0 of PASATODO) {
      const d = d0 + c * 11
      const linea = new Float32Array(d)
      let p = 0
      for (let i = 0; i < n; i++) {
        const x = humedo[i], y = linea[p]
        humedo[i] = -0.5 * x + y
        linea[p] = x + y * 0.5
        p = (p + 1) % d
      }
    }
    for (let i = 0; i < n; i++) bus[i * 2 + c] = seco[i] * (1 - mezcla * 0.35) + humedo[i] * mezcla
  }
}

/**
 * La pista entera.
 *
 * `hitos` son los milisegundos en que el video cambia de plano, tal como los
 * publica `viral.html`. Si falta alguno, la sección que le corresponde no se
 * dibuja: la música sigue sonando, nada más que sin ese cambio.
 */
export function componer({ ms, hitos = {} }) {
  const dur = ms / 1000
  const n = Math.round((dur + 2.5) * SR)   // dos segundos de cola para la reverb
  const seco = new Float32Array(n * 2)
  const humedo = new Float32Array(n * 2)

  const h = k => (hitos[k] ?? null) === null ? null : hitos[k] / 1000

  /* El arreglo. Cada sección dice qué acordes giran, cuánta batería hay y si
   * corre el arpegio. Los tiempos son los del video, no los de la música. */
  const SECCIONES = [
    { t: 0,              acordes: ['Am', 'Am', 'F', 'Dm'], ritmo: 'nada',  arp: false, aire: 0.9 },
    { t: h('muro'),      acordes: ['Am', 'F', 'Dm', 'E'],  ritmo: 'medio', arp: false, aire: 0.9 },
    { t: h('costos'),    acordes: ['Dm', 'E', 'Dm', 'E'],  ritmo: 'medio', arp: false, aire: 0.9 },
    // Acá aparece la marca: el colchón se va arriba y entra el arpegio.
    { t: h('marca'),     acordes: ['C', 'G', 'Am', 'F'],   ritmo: 'poco',  arp: true,  aire: 1.25 },
    { t: h('flujo'),     acordes: ['C', 'G', 'Am', 'F'],   ritmo: 'lleno', arp: true,  aire: 1.25 },
    { t: h('formas'),    acordes: ['F', 'C', 'G', 'Am'],   ritmo: 'lleno', arp: true,  aire: 1.25 },
    // La espera: se cae todo menos el colchón. El silencio de la batería es lo
    // que hace que lo que viene después se sienta más grande.
    { t: h('frasco'),    acordes: ['Am', 'F'],             ritmo: 'nada',  arp: false, aire: 1.25 },
    { t: h('lluvia'),    acordes: ['C', 'G', 'Am', 'F'],   ritmo: 'lleno', arp: true,  aire: 1.4 },
    { t: h('posteo'),    acordes: ['F', 'C', 'G', 'C'],    ritmo: 'lleno', arp: true,  aire: 1.4 },
    { t: h('cierre'),    acordes: ['F', 'C'],              ritmo: 'nada',  arp: false, aire: 1.4 },
  ].filter(s => s.t !== null).sort((a, b) => a.t - b.t)

  const seccionEn = t => {
    let cual = SECCIONES[0]
    for (const s of SECCIONES) if (t >= s.t - 0.001) cual = s
    return cual
  }

  const DENSIDAD = {
    nada:  { bombo: 0,    charles: 0,    palmada: 0 },
    poco:  { bombo: 0.44, charles: 0,    palmada: 0 },
    medio: { bombo: 0.62, charles: 0.3,  palmada: 0 },
    lleno: { bombo: 0.68, charles: 0.36, palmada: 0.24 },
  }

  const barras = Math.ceil(dur / BARRA)
  let cambios = 0
  for (let b = 0; b < barras; b++) {
    const t0 = b * BARRA
    const s = seccionEn(t0)
    // La barra en la que arrancó la sección, para que el giro de acordes empiece
    // desde el primero y no desde donde quedó el reloj.
    const b0 = Math.ceil((s.t - 0.001) / BARRA)
    const acorde = ACORDES[s.acordes[(b - b0 + s.acordes.length * 8) % s.acordes.length]]
    const d = DENSIDAD[s.ritmo]

    // El colchón: las tres voces de arriba, una barra entera y un poco más para
    // que se pise con la siguiente y no queden huecos entre acordes.
    const voces = acorde.slice(2)
    voces.forEach((m, i) => {
      colchon(humedo, t0, hz(m + (s.aire > 1 ? 12 : 0)), BARRA * 1.12,
              0.115 * s.aire * (i === 0 ? 1 : 0.8), (i - 1) * 0.45)
    })

    // El bajo, a la fundamental, pulsando en los tiempos 1 y 3.
    const raiz = hz(acorde[0])
    bajo(seco, t0, raiz, BARRA * 0.46, 0.24)
    if (s.ritmo !== 'nada') bajo(seco, t0 + BARRA / 2, raiz, BARRA * 0.38, 0.19)

    // La batería, sobre una grilla de ocho corcheas por barra.
    const corchea = BARRA / 8
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * corchea
      if (t > dur) break
      if (d.bombo && (e === 0 || e === 4 || (e === 6 && b % 2 === 1))) bombo(seco, t, d.bombo)
      if (d.charles && (e % 2 === 1 || e === 2 || e === 6)) charles(seco, t, d.charles * (e % 2 ? 1 : 0.55), e === 7)
      if (d.palmada && (e === 2 || e === 6)) palmada(seco, t, d.palmada)
    }

    // El arpegio: corcheas subiendo y bajando por el acorde.
    if (s.arp) {
      const escalera = [...voces, ...voces.slice(0, -1).reverse()]
      for (let e = 0; e < 8; e++) {
        const t = t0 + e * corchea
        if (t > dur) break
        const m = escalera[e % escalera.length] + 12
        pulsada(humedo, t, hz(m), 0.9, 0.17, 0.3)
      }
    }
    cambios++
  }

  /* Los tres golpes. Son tres y no diez a propósito: la regla R4 de
   * `video-shotcraft` dice que un cuadro entero no aguanta más de tres, y con
   * la música pasa lo mismo — al cuarto dejan de significar nada. Van donde el
   * video cambia de idea: el muro, la marca y el cierre. */
  for (const k of ['muro', 'marca', 'cierre']) {
    const t = h(k)
    if (t === null) continue
    impacto(humedo, t, 0.58)
    subida(humedo, Math.max(0, t - 1.25), 1.25, 0.16)
  }

  // El acorde final, sostenido hasta el borde.
  const fin = h('cierre')
  if (fin !== null) {
    for (const m of ACORDES.C.slice(1)) colchon(humedo, fin, hz(m + 12), dur - fin + 1.6, 0.1)
    bajo(seco, fin, hz(ACORDES.C[0]), 2.6, 0.3)
  }

  reverb(humedo, 0.34)

  /* La mezcla. El maestro entra y sale con la imagen: los primeros 400 ms
   * suben desde cero —un aviso que arranca con un golpe de audio a volumen
   * pleno se siente roto— y el último segundo baja a nada. */
  const salida = new Int16Array(Math.round(dur * SR) * 2)
  let pico = 0
  const mezcla = new Float32Array(salida.length)
  for (let i = 0; i < salida.length / 2; i++) {
    const t = i / SR
    const sobre = Math.min(1, t / 0.4) * Math.min(1, (dur - t) / 1.0)
    for (let c = 0; c < 2; c++) {
      const v = (seco[i * 2 + c] + humedo[i * 2 + c]) * sobre
      mezcla[i * 2 + c] = v
      if (Math.abs(v) > pico) pico = Math.abs(v)
    }
  }
  // Se normaliza a 0,82 y lo que se pase se dobla con una tangente hiperbólica
  // en vez de recortarse: recortar suena a distorsión, doblar suena a que está
  // fuerte.
  const g = pico > 0 ? 0.88 / pico : 1
  const k = 1 - Math.exp(-2 * Math.PI * 32 / SR)
  const lento = [0, 0]
  for (let i = 0; i < salida.length / 2; i++) {
    for (let c = 0; c < 2; c++) {
      const v = mezcla[i * 2 + c] * g
      lento[c] += (v - lento[c]) * k
      salida[i * 2 + c] = Math.round(Math.tanh((v - lento[c]) * 1.18) * 32000)
    }
  }

  return aWav(salida)
}

/** WAV de 16 bits, dos canales. */
function aWav(pcm) {
  const datos = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  const cab = Buffer.alloc(44)
  cab.write('RIFF', 0)
  cab.writeUInt32LE(36 + datos.length, 4)
  cab.write('WAVE', 8)
  cab.write('fmt ', 12)
  cab.writeUInt32LE(16, 16)
  cab.writeUInt16LE(1, 20)          // PCM
  cab.writeUInt16LE(2, 22)          // canales
  cab.writeUInt32LE(SR, 24)
  cab.writeUInt32LE(SR * 4, 28)     // bytes por segundo
  cab.writeUInt16LE(4, 32)          // alineación de bloque
  cab.writeUInt16LE(16, 34)         // bits
  cab.write('data', 36)
  cab.writeUInt32LE(datos.length, 40)
  return Buffer.concat([cab, datos])
}

/* Corrida suelta, para escuchar la pista sin renderizar el video. Los hitos son
 * los del aviso de hoy; si cambian, los de verdad los pasa `viral.mjs`. */
const AQUI = dirname(fileURLToPath(import.meta.url))
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const ms = Number(process.env.MS || 39500)
  const wav = componer({
    ms,
    hitos: { muro: 3500, costos: 7050, marca: 10500, flujo: 13150, formas: 21750,
             frasco: 25500, lluvia: 27650, posteo: 31800, cierre: 36500 },
  })
  const salida = resolve(AQUI, 'musica.wav')
  writeFileSync(salida, wav)
  console.log(`\n  ${(ms / 1000).toFixed(1)} s · ${Math.round(wav.length / 1024)} KB\n  → ${salida}\n`)
}
