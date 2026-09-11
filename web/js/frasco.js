// El frasco de la marca, llenándose mientras se espera.
//
// La pantalla de "Armando tu publicación" son veinte segundos de un título y
// dos renglones sobre fondo vacío. Ahí el frasco burbujea.
//
// El nivel no sube. Podría —queda más lindo— pero se llenaría en tres segundos
// y volvería a empezar quince veces: un progreso inventado es peor que ninguno,
// porque a la segunda vuelta ya se sabe que no significa nada. Burbujear no
// promete nada y por eso no puede mentir.
//
// Va en CSS y no con una librería de animación. Son dos keyframes —una onda que
// se desplaza y unas burbujas que suben— y meter 70 KB de dependencia para eso
// no se paga. Si alguna vez hace falta encadenar animaciones de verdad, ahí sí.

/**
 * El SVG del frasco, listo para insertar.
 *
 * `id` va en el `mask`: con dos frascos en la misma página y un solo id, el
 * segundo hereda la máscara del primero y el líquido se le escapa del vidrio.
 */
export function frascoCargando(id = 'esp') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'frasco-espera')
  svg.setAttribute('viewBox', '0 0 512 512')
  svg.setAttribute('aria-hidden', 'true')

  // La onda mide 120 de período, así que desplazarla 120 la devuelve a su lugar
  // y el ciclo no tiene costura. Las burbujas salen de posiciones y tamaños
  // distintos: con todas iguales se lee como un patrón, no como líquido.
  //
  // Y salen en cian, el acento secundario de la marca, no en blanco. Una burbuja
  // blanca sobre el verde claro es un hueco: se lee como espuma, que es lo que
  // hace cualquier líquido. En cian se lee como lo que el frasco está haciendo,
  // que es la idea entera de la marca. Las hay de dos tonos —el cian eléctrico y
  // el pálido— porque con uno solo quedan todas al mismo plano y el líquido
  // pierde hondura.
  const CIAN = '#00E5FF'
  const CIAN_PALIDO = '#A5CAFF'
  const burbujas = [
    { x: 196, r: 7,  t: 0,    c: CIAN },        { x: 246, r: 5, t: 0.9, c: CIAN_PALIDO },
    { x: 300, r: 9,  t: 0.35, c: CIAN_PALIDO }, { x: 224, r: 4, t: 1.5, c: CIAN },
    { x: 282, r: 6,  t: 2.1,  c: CIAN },        { x: 320, r: 5, t: 1.2, c: CIAN_PALIDO },
  ]

  svg.innerHTML = `
  <defs>
    <mask id="frasco-${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
      <path d="M224 190V220C173.333 243.333 148 293.333 148 370C148 383.791 153.479 397.018 163.23 406.77C172.982 416.521 186.209 422 200 422H312C325.791 422 339.018 416.521 348.77 406.77C358.521 397.018 364 383.791 364 370C364 293.333 338.667 243.333 288 220V190H224Z" fill="#fff"/>
    </mask>

    <!-- Por debajo de esta línea, y nunca más arriba.
         La burbuja subía hasta cruzar la superficie y quedaba flotando en el
         vidrio vacío. Mientras fueron blancas no se veía —blanco sobre blanco—;
         desde que son de color quedó a la vista.
         Acortarle el recorrido no alcanza: la onda no es una línea recta, se
         desplaza, y una burbuja puede quedar por debajo de la cresta y por
         encima de la superficie que le toca a su columna en ese instante. La
         onda de atrás, que es la que se ve como superficie, oscila entre 290 y
         310, más los 5 que respira el líquido: 322 queda debajo de todo eso
         siempre, sin depender de en qué momento del ciclo esté la onda. Y como
         la burbuja se desvanece mientras sube, el corte no se lee como corte. -->
    <clipPath id="bajo-${id}">
      <rect x="0" y="322" width="512" height="140"/>
    </clipPath>

  </defs>

  <path d="M218 185V215C166 238.333 140 290 140 370C140 385.913 146.321 401.174 157.574 412.426C168.826 423.679 184.087 430 200 430H312C327.913 430 343.174 423.679 354.426 412.426C365.679 401.174 372 385.913 372 370C372 290 346 238.333 294 215V185"
        fill="#fff" stroke="#18191F" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>

  <g mask="url(#frasco-${id})">
    <g class="frasco-liquido">
      <path class="frasco-onda frasco-onda--fondo" d="M-160,300 q60,-20 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 V440 H-160 Z" fill="#5CBA68"/>
      <path class="frasco-onda" d="M-160,314 q60,-20 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 V440 H-160 Z" fill="#85D88D"/>
    </g>
    <g clip-path="url(#bajo-${id})">
      ${burbujas.map(b => `<circle class="frasco-burbuja" cx="${b.x}" cy="415" r="${b.r}" fill="${b.c}" style="animation-delay:${b.t}s"/>`).join('')}
    </g>
  </g>

  <path d="M256 194C279.196 194 298 187.732 298 180C298 172.268 279.196 166 256 166C232.804 166 214 172.268 214 180C214 187.732 232.804 194 256 194Z"
        fill="#fff" stroke="#18191F" stroke-width="14"/>
  <path d="M170 310C163.333 343.333 166.667 371.667 180 395" stroke="#fff" stroke-width="10" stroke-linecap="round" fill="none" opacity=".85"/>`

  return svg
}
