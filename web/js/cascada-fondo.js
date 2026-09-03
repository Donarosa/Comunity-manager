/**
 * Fondo animado en Cascada (Marquee infinito de placas) con GSAP 3.
 * Utiliza tokens OKLCH del sistema de diseño Alquimia (Hum / Bubble Edition)
 * e incluye placas con fotos reales y con colores de marca del sistema.
 */

const PLACAS = [
  // ── Placas con fondo pleno / tintes del sistema ──
  {
    theme: 't-cream',
    brand: 'Panadería Mendieta', brandColor: 'oklch(45% 0.18 25)', brandInitials: 'PM',
    kick: 'MASA MADRE',
    headline: 'Tres días para <em>un pan</em>',
    body: 'El proceso de fermentación lenta que hace la diferencia en cada hogaza.',
    foot: '@PANADERIAMENDIETA',
  },
  {
    theme: 't-ink',
    brand: 'tumarca', brandColor: 'oklch(64% 0.18 305)', brandInitials: '?',
    kick: 'TEMPLATE · COVER',
    headline: 'La <em>portada</em> del carrusel',
    body: 'Fondo oscuro, título grande y una línea de fuentes opcional abajo.',
    foot: 'TUMARCA.COM',
  },
  {
    theme: 't-mint',
    brand: 'Vivero Las Acacias', brandColor: 'oklch(45% 0.14 150)', brandInitials: '🌿',
    kick: 'ANTES DE COMPRAR',
    headline: 'Tres cosas que <em>hay que mirar</em>',
    body: 'No todas las plantas que se ven lindas en el vivero aguantan tu casa.',
    foot: '@VIVEROLASACACIAS',
  },
  {
    theme: 't-cyan',
    brand: 'Estudio Ravenna', brandColor: 'oklch(45% 0.14 235)', brandInitials: 'ER',
    kick: 'IMPUESTOS',
    headline: 'Lo que cambia en <em>el monotributo</em>',
    body: 'Las nuevas escalas, topes de facturación y fechas límite que tenés que conocer.',
    foot: '@ESTUDIORAVENNA',
  },
  {
    theme: 't-ink-deep',
    brand: 'Clínica Sonrisas', brandColor: 'oklch(65% 0.22 18)', brandInitials: '🦷',
    kick: 'MEDICINA PREVENTIVA',
    headline: 'Una sonrisa sana <em>no debería doler</em>',
    body: 'Diseño digital y blanqueamiento sin sensibilidad.',
    foot: '@CLINICASONRISAS',
  },
  {
    theme: 't-lavender',
    brand: 'Lic. Martín Ramos', brandColor: 'oklch(50% 0.14 305)', brandInitials: '🧠',
    kick: 'SALUD MENTAL',
    headline: '3 señales de que <em>necesitás un freno</em>',
    body: 'Tensión, procrastinación, dificultad para dormir.',
    foot: 'SESIONES ONLINE',
  },
  {
    theme: 't-coral',
    brand: 'Taller Carlos', brandColor: 'oklch(55% 0.22 40)', brandInitials: '🔧',
    kick: 'SERVICIO EXPRESS',
    headline: 'Chequeo de <em>seguridad</em>',
    body: 'Frenos, fluidos y suspensión. Diagnóstico computarizado en 40 min.',
    foot: 'TURNOS POR WHATSAPP',
  },
  {
    theme: 't-paper',
    brand: 'Bruma Estudio', brandColor: 'oklch(50% 0.16 305)', brandInitials: 'BE',
    kick: 'TURNOS DE AGOSTO',
    headline: 'Color sin <em>arruinar el pelo</em>',
    body: 'Técnica balayage con productos sin amoníaco para un resultado natural.',
    foot: '@BRUMAESTUDIO',
  },
  {
    theme: 't-pear',
    brand: 'Verdulería Mendoza', brandColor: 'oklch(48% 0.16 95)', brandInitials: 'VM',
    kick: 'ENTRÓ HOY',
    headline: 'Tomates de <em>quinta</em>',
    body: 'Directos del productor. Sin cámara, sin maduración artificial.',
    foot: '@VERDULERAMENDOZA',
  },
  {
    theme: 't-ink',
    brand: 'Fitness Pro', brandColor: 'oklch(65% 0.22 18)', brandInitials: 'FP',
    kick: 'RUTINA SEMANAL',
    headline: '5 ejercicios para <em>empezar hoy</em>',
    body: 'Sin pesas, sin excusas. Rutina de 20 min para hacer en casa.',
    foot: '@FITNESSPRO.AR',
  },
  {
    theme: 't-cream',
    brand: 'Taller Sur', brandColor: 'oklch(50% 0.14 55)', brandInitials: 'TS',
    kick: 'SERVICE',
    headline: 'Cuándo tocan <em>las pastillas</em>',
    body: 'Mantenimiento preventivo de frenos y amortiguación.',
    foot: '@TALLERSUR',
  },
  {
    theme: 't-cyan',
    brand: 'Café Central', brandColor: 'oklch(42% 0.12 55)', brandInitials: '☕',
    kick: 'BLEND DEL MES',
    headline: 'De Etiopía <em>a tu taza</em>',
    body: 'Notas a frutos rojos con final cítrico. Tostado medio.',
    foot: 'CAFÉ DE ESPECIALIDAD',
  },
  {
    theme: 't-mint',
    brand: 'Huerta Urbana', brandColor: 'oklch(40% 0.14 150)', brandInitials: '🌱',
    kick: 'GUÍA RÁPIDA',
    headline: 'Qué plantar <em>en septiembre</em>',
    body: 'Tomates, albahaca, pimientos. Todo en maceta o cantero.',
    foot: 'HUERTAURBANA.COM',
  },
  {
    theme: 't-paper',
    brand: 'Cervecería Fondo', brandColor: 'oklch(52% 0.14 75)', brandInitials: 'CF',
    kick: 'TIRADA NUEVA',
    headline: 'Una IPA que <em>no amarga de más</em>',
    body: 'Cerveza artesanal con lúpulos frescos de la Patagonia.',
    foot: '@CERVECERAFONDO',
  },
  {
    theme: 't-lavender',
    brand: 'Librería Otoño', brandColor: 'oklch(42% 0.08 150)', brandInitials: 'L',
    kick: 'LLEGÓ',
    headline: 'Lo nuevo de <em>Mariana Enriquez</em>',
    body: 'Cuentos inéditos y narrativa contemporánea ya disponibles.',
    foot: '@LIBRERIAOTONO',
  },

  // ── Placas con FONDO DE IMAGEN ──
  {
    theme: 't-foto',
    fotoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=500&fit=crop',
    fotoOverlay: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.85) 100%)',
    brand: 'Panadería Mendieta', brandColor: 'oklch(55% 0.18 25)', brandInitials: 'PM',
    kick: 'NUEVA HORNADA',
    headline: 'Pan de campo <em>como el de antes</em>',
    body: 'Harina orgánica, fermentación de 48 horas.',
    foot: '@PANADERIAMENDIETA',
  },
  {
    theme: 't-foto',
    fotoUrl: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400&h=500&fit=crop',
    fotoOverlay: 'linear-gradient(180deg, rgba(15,40,15,0.2) 0%, rgba(10,30,10,0.6) 45%, rgba(5,20,5,0.9) 100%)',
    brand: 'Vivero Las Acacias', brandColor: 'oklch(70% 0.16 150)', brandInitials: '🌿',
    kick: 'TEMPORADA',
    headline: 'Suculentas que <em>no necesitan sol</em>',
    body: 'Ideales para interiores con poca luz natural.',
    foot: '@VIVEROLASACACIAS',
  },
  {
    theme: 't-foto',
    fotoUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=500&fit=crop',
    fotoOverlay: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.88) 100%)',
    brand: 'Fitness Pro', brandColor: 'oklch(68% 0.24 18)', brandInitials: 'FP',
    kick: 'CHALLENGE',
    headline: '30 días de <em>sentadillas</em>',
    body: 'Empezá con 20 y llegá a 100. Sin equipamiento.',
    foot: '@FITNESSPRO.AR',
  },
  {
    theme: 't-foto',
    fotoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=500&fit=crop',
    fotoOverlay: 'linear-gradient(180deg, rgba(40,20,5,0.15) 0%, rgba(30,15,5,0.55) 45%, rgba(20,10,2,0.9) 100%)',
    brand: 'Café Central', brandColor: 'oklch(76% 0.18 95)', brandInitials: '☕',
    kick: 'RECIÉN MOLIDO',
    headline: 'Latte art <em>en tu mesa</em>',
    body: 'Taller abierto los sábados. Cupos limitados.',
    foot: 'CAFÉ DE ESPECIALIDAD',
  },
  {
    theme: 't-foto',
    fotoUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=500&fit=crop',
    fotoOverlay: 'linear-gradient(180deg, rgba(50,20,60,0.2) 0%, rgba(40,10,50,0.55) 45%, rgba(30,5,40,0.9) 100%)',
    brand: 'Bruma Estudio', brandColor: 'oklch(74% 0.16 305)', brandInitials: 'BE',
    kick: 'TRANSFORMACIÓN',
    headline: 'De rubio a <em>cobrizo</em>',
    body: 'El proceso completo en una sola sesión.',
    foot: '@BRUMAESTUDIO',
  },
  {
    theme: 't-foto',
    fotoUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=500&fit=crop',
    fotoOverlay: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.85) 100%)',
    brand: 'Joyería Aldana', brandColor: 'oklch(80% 0.16 95)', brandInitials: 'JA',
    kick: 'COLECCIÓN NUEVA',
    headline: 'Aros que <em>no pesan</em>',
    body: 'Plata 925 con baño de oro. Hipoalergénicos.',
    foot: '@JOYERAALDANA',
  },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function crearPlacaElemento(data) {
  const card = document.createElement('div')
  card.className = `cascada-placa ${data.theme}`

  let bgHTML = ''
  if (data.fotoUrl) {
    bgHTML = `
      <div class="cascada-foto-bg" style="background-image:url('${data.fotoUrl}')"></div>
      <div class="cascada-foto-overlay" style="background:${data.fotoOverlay}"></div>
    `
  }

  card.innerHTML = `
    ${bgHTML}
    <div class="cascada-placa-inner">
      <div class="cascada-brand-row">
        <span class="cascada-brand-dot" style="background:${data.brandColor}">${data.brandInitials}</span>
        ${data.brand}
      </div>
      <div class="cascada-kick">${data.kick}</div>
      <div class="cascada-headline">${data.headline}</div>
      ${data.body ? `<div class="cascada-body">${data.body}</div>` : ''}
      <div class="cascada-foot">${data.foot}</div>
    </div>
  `
  return card
}

/**
 * Monta el fondo animado en Cascada dentro del elemento contenedor.
 * Retorna { destruir() } para limpiar las animaciones y el DOM.
 */
export function montarFondoCascada(contenedor) {
  const gsap = window.gsap
  if (!gsap) {
    console.warn('[cascada] GSAP no está disponible en window.gsap')
    return { destruir: () => {} }
  }

  const bgContenedor = document.createElement('div')
  bgContenedor.className = 'formato-cascada-bg'

  const vignette = document.createElement('div')
  vignette.className = 'formato-cascada-vignette'

  contenedor.prepend(vignette)
  contenedor.prepend(bgContenedor)

  function renderizar() {
    gsap.killTweensOf('.cascada-col')
    bgContenedor.innerHTML = ''

    const vw = window.innerWidth
    const colCount = vw > 1400 ? 8 : vw > 1000 ? 7 : vw > 700 ? 5 : 4
    const colWidth = vw / colCount

    for (let col = 0; col < colCount; col++) {
      const column = document.createElement('div')
      column.className = 'cascada-col'
      column.style.left = `${col * colWidth}px`
      column.style.width = `${colWidth}px`

      const distFromCenter = Math.abs(col - (colCount - 1) / 2) / ((colCount - 1) / 2)
      const baseOpacity = col === 0 || col === colCount - 1
        ? 0.18
        : col === 1 || col === colCount - 2
          ? 0.32
          : 0.5 - distFromCenter * 0.15

      const shuffled = shuffle(PLACAS)
      const placasPerCol = 5

      for (let p = 0; p < placasPerCol; p++) {
        const data = shuffled[p % PLACAS.length]
        const card = crearPlacaElemento(data)
        card.style.opacity = baseOpacity
        column.appendChild(card)
      }

      bgContenedor.appendChild(column)

      const colHeight = column.scrollHeight || 1200

      // Duplicar elementos para loop seamless continuo
      const children = Array.from(column.children)
      children.forEach(child => {
        const clone = child.cloneNode(true)
        column.appendChild(clone)
      })

      const direction = col % 2 === 0 ? -1 : 1
      const speed = 28 + Math.random() * 22
      const startY = direction === -1 ? 0 : -colHeight

      gsap.set(column, { y: startY })

      gsap.to(column, {
        y: direction === -1 ? -colHeight : 0,
        duration: speed,
        ease: 'none',
        repeat: -1,
        modifiers: {
          y: gsap.utils.unitize(val => {
            const v = parseFloat(val)
            if (direction === -1) {
              return ((v % colHeight) + colHeight) % colHeight === 0 ? 0 : v % colHeight
            } else {
              const m = v % colHeight
              return m === 0 ? 0 : m - colHeight
            }
          })
        }
      })

      gsap.from(column, {
        opacity: 0,
        x: col % 2 === 0 ? -20 : 20,
        duration: 0.8,
        delay: col * 0.1,
        ease: 'power2.out',
      })
    }
  }

  renderizar()

  let resizeTimeout
  const onResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      renderizar()
    }, 300)
  }
  window.addEventListener('resize', onResize)

  return {
    destruir() {
      window.removeEventListener('resize', onResize)
      clearTimeout(resizeTimeout)
      gsap.killTweensOf('.cascada-col')
      bgContenedor.remove()
      vignette.remove()
    }
  }
}
