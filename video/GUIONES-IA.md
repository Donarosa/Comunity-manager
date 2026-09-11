# Dos guiones para pasarle a una IA de video

Treinta segundos, vertical, para Instagram. Ocho planos.

Los dos guiones cuentan **la misma historia con los mismos tiempos y la misma
locución**. Lo único que cambia son tres planos: los que muestran el producto.

* **Guion A — con capturas.** La IA genera la mano, el local y la luz; las
  pantallas van en blanco y las capturas reales se incrustan después, en
  edición. El producto que se ve es el producto que existe.
* **Guion B — sin capturas.** Todo lo genera la IA, incluidas las pantallas.
  Más rápido de producir y sin post, pero lo que se ve del producto es una
  fantasía parecida, no la aplicación.

Los planos que cambian son el **4**, el **5** y el **7**. El resto es idéntico:
se pueden mezclar los dos guiones sin tocar nada.

---

## Para pegar de una sola vez

Lo de acá abajo está plano por plano, que es como lo piden las herramientas que
generan un clip por vez —Runway, Kling, Luma, Pika—: ahí no entra un guion
entero, entra un prompt y nada más.

Para un **chat** —Gemini, ChatGPT, Claude, o el asistente de la herramienta de
video— el guion entero va en un solo bloque, listo para pegar:

| Archivo | Qué es |
| :--- | :--- |
| `video/bloques/guion-A-con-capturas.txt` | 8.700 caracteres |
| `video/bloques/guion-B-todo-generado.txt` | 10.600 caracteres |

Cada uno trae adentro las reglas, la técnica, el negative prompt, los ocho
planos, la locución y la música. Se pega uno y se manda.

---

## Antes de empezar: lo que vale para los dos

### Ficha técnica

| | |
| :--- | :--- |
| Relación de aspecto | 9:16 · 1080×1920 |
| Duración | 30 s · ocho planos de 3 a 4 s |
| Cadencia | 24 fps para los planos narrativos · 60 fps para el b-roll en cámara lenta |
| Cámara de referencia | ARRI Alexa Mini LF · Sony FX3 · 35 mm film stock |
| Óptica | Cooke Anamorphic 50 mm T2.3 · Leica Summicron 35 mm f/2.0 |
| Profundidad de campo | Corta, f/1.8 – f/2.8 |
| Idioma de los prompts | Inglés |
| Idioma de la locución y los textos en pantalla | Castellano rioplatense templado |

**Planos de 3 a 5 segundos, uno por prompt.** Ningún modelo sostiene un cambio
de escena adentro de una sola generación sin deformar algo: se generan sueltos y
se ensamblan en edición.

### Negative prompt (el mismo en los ocho planos)

```text
cartoon, 3D animated CGI render, Pixar style, oversaturated neon, fake plastic skin, distorted hands, extra fingers, deformed limbs, creepy smile, corporate stock photo cliché, suit and tie boardroom, futuristic cyberpunk dystopia, glitching, morphing artifacts, fast erratic camera shakes, low resolution, pixelated, washed out colors, overexposed highlights, cheesy 90s graphics, watermark, text overlay errors, unreadable garbled text, fake user interface text, lorem ipsum
```

Las últimas tres son las que importan acá: los modelos de video **no saben
escribir**. Cualquier texto que generen sale ilegible o deformado, y en un aviso
de una herramienta de contenido eso se nota más que en cualquier otro rubro.

### Locución

Voz cercana, segura, pausada. Castellano rioplatense templado, sin lunfardo y
sin velocidad de locutor de oferta. En ElevenLabs: *Stability* 70 %, *Clarity*
82 %, *Style* 15 %.

> 1. Todos están usando la misma inteligencia artificial.
> 2. Y se nota. Mismo violeta, misma tipografía, mismo todo.
> 3. Alquimia hace otra cosa.
> 4. Le contás de qué querés hablar. Un toque.
> 5. Y salen las placas de tu negocio. Con tu marca, de tu rubro.
> 6. Sin diseñador. Sin esperar. Sin pelearte con una plantilla.
> 7. Tu feed deja de estar vacío.
> 8. Alquimia. Publicá como si tuvieras un diseñador.

Son cincuenta y cinco palabras para treinta segundos: alcanza para decirlas
respiradas, que es como tienen que sonar.

### Música y sonido

Neo-clásica electrónica / ambient lo-fi orgánico — Ólafur Arnalds, Tycho,
Bonobo. Piano con reverberación cálida, pads analógicos, percusión de madera.

El golpe de la cortina va en el **segundo 6,5**, sobre el destello menta del
plano 3. Es el único acento fuerte del tema; todo lo anterior va en tensión y
todo lo posterior, resuelto.

Foley: vidrio fino de laboratorio, burbujeo cristalino, un *whoosh* grave de
aire en el corte del plano 3 y un *chime* cálido cuando aparecen las placas.

### Dos cosas que no hay que cambiar

**Los flyers del plano 1 y 2 son genéricos, inventados.** Nunca un aviso real de
un negocio real. Usar la publicidad de un negocio como mal ejemplo adentro del
aviso de otro es un problema legal evitable, y además no hace falta: lo que la
gente reconoce no es un flyer puntual sino el molde — el violeta, el neón, el
grito —. Todos los prompts de acá abajo describen el molde y ninguno nombra un
negocio.

**Ningún plano promete ventas ni plata.** Lo que se muestra son me gusta,
seguidores y mensajes: lenguaje de red social, sin cifras. Prometer un número de
ventas en un aviso es publicidad engañosa salvo que haya con qué respaldarlo, y
todavía no hay clientes con los que respaldarlo. Cuando los haya, es una línea.

---

# GUION A — con capturas de pantalla

Planos 4, 5 y 7 se generan con la pantalla **en verde plano** y las capturas
reales se incrustan en edición con un *corner pin* (After Effects: Mocha; DaVinci:
Planar Tracker; CapCut: máscara + seguimiento de movimiento).

Las capturas están en el repositorio:

| Archivo | Qué es | Dónde va |
| :--- | :--- | :--- |
| `video/assets/app-home.png` | La aplicación, 780×1688 | Plano 4 |
| `video/assets/placa-1.png` | Placa de feed — comunidad de running | Plano 5 |
| `video/assets/placa-2.png` | Placa de feed — portada de carrusel | Plano 5 |
| `video/assets/placa-3.png` | Placa de feed — desarrollo de carrusel | Plano 5 |
| `video/assets/instagram.png` | Un perfil de Instagram lleno | Plano 7 |

`node video/capturar-app.mjs` vuelve a sacar la captura de la aplicación si el
producto cambia. Conviene correrlo el día que se arma el video: una captura de
hace un mes muestra botones que ya no están donde están.

---

### Plano 1 · 0 – 3,5 s · El hartazgo

**Lo que se ve.** Un pulgar pasando de largo, rápido, una tira infinita de
flyers promocionales violeta y neón. Todos distintos y todos iguales. La cara de
quien scrollea no se ve: solo el dedo y el reflejo de la pantalla.

```text
Extreme close-up of a human thumb scrolling rapidly and dismissively through an endless vertical feed of garish purple and magenta neon promotional flyers on a smartphone screen. Every flyer looks identical in style: heavy condensed display type, glowing gradients, loud starbursts. The screen light reflects cold violet onto the fingertip. Dark ambient room, single soft practical lamp far in the background, deep shadows. Shot on Sony FX3, Leica Summicron 35mm, f/2.0, shallow depth of field, macro framing. Camera holds static on a tripod while the content blurs past with motion blur. Moody, saturated violet color cast, cinematic documentary realism, 35mm film grain.
```

**Cámara.** Fija sobre trípode. El movimiento lo hace el contenido, no la cámara.
**En pantalla.** —
**Locución.** «Todos están usando la misma inteligencia artificial.»

---

### Plano 2 · 3,5 – 6,5 s · El que lo sufre

**Lo que se ve.** La dueña de un local — panadería, vivero, taller, lo que sea
real y texturado — mirando el teléfono con la cara de quien ya vio esto mil
veces. Cansancio, no drama.

```text
Medium close-up of a small business owner in her early forties standing behind the counter of a warm artisan bakery at dusk. She holds a smartphone at chest height and looks down at it with quiet fatigue and mild resignation, not anger. Cold violet screen light from the phone competes against the warm amber tungsten light of the shop. Flour dust floats in the air. She wears a worn linen apron. Shot on ARRI Alexa Mini LF, Cooke Anamorphic 50mm T2.3, f/2.3, shallow depth of field, creamy bokeh of bread shelves behind her. Extremely slow push-in toward her face. Authentic human emotion, photorealistic skin texture, cinematic documentary style, 35mm film look.
```

**Cámara.** *Slow push-in*, casi imperceptible.
**En pantalla.** «Mismo violeta. Misma tipografía. Mismo todo.» — mono, chico, abajo.
**Locución.** «Y se nota. Mismo violeta, misma tipografía, mismo todo.»

---

### Plano 3 · 6,5 – 10 s · La marca

**Lo que se ve.** Corte seco a negro. Un matraz de cristal sobre madera oscura,
con líquido menta luminiscente que burbujea. La luz del líquido crece hasta
tapar el cuadro. **Acá va el golpe de la música.**

```text
Cinematic macro close-up of a clear crystal Erlenmeyer laboratory flask resting on a dark oiled oak surface in near darkness. Inside, a luminescent mint-green and cyan liquid swirls slowly and releases delicate micro-bubbles that rise and glow. The light from the liquid intensifies and blooms until it fills the frame. Tiny dust motes drift through the beam. Shot on ARRI Alexa Mini LF, 50mm anamorphic lens, f/1.8, 60fps slow motion, extremely shallow depth of field. Ultra-smooth slow micro push-in toward the glass. Elegant, magical yet grounded, premium commercial aesthetic, deep blacks, mint and cyan accents only.
```

**Cámara.** *Slow micro push-in*.
**En pantalla.** El logotipo de Alquimia aparece cuando la luz llena el cuadro.
**Locución.** «Alquimia hace otra cosa.»

---

### Plano 4 · 10 – 14 s · Un toque · ⬅ CON CAPTURA

**Lo que se ve.** Plano sobre el hombro: la misma persona, ahora con el teléfono
en la mano, apoyada en el mostrador. Toca la pantalla una vez. **La pantalla se
genera en verde plano** y después se le incrusta `app-home.png`.

```text
Over-the-shoulder medium close-up of the same small business owner sitting at a clean wooden counter in her shop, morning light now instead of dusk. She holds a modern smartphone in one hand. THE PHONE SCREEN IS A FLAT CHROMA GREEN RECTANGLE, completely uniform, no reflections, no glare, no content. Her other hand lifts and taps the screen once with a single deliberate fluid motion, then rests. Soft north-light window illumination at 45 degrees, warm amber highlights on wood, subtle mint rim light separating her shoulder from the background. Shot on Sony FX3, 50mm f/1.8, shallow depth of field, creamy background bokeh. Steady slow dolly-in. Photorealistic, calm, authentic, high-end commercial.
```

**Post.** *Corner pin* de `video/assets/app-home.png` sobre el verde. El toque
cae sobre el botón **«✨ Sugerime»**, el verde de abajo a la izquierda del
teléfono. Sumar un destello menta suave en el momento del contacto.

**Cámara.** *Slow dolly-in*.
**En pantalla.** «UN SOLO TOQUE» — mono, espaciado, arriba.
**Locución.** «Le contás de qué querés hablar. Un toque.»

---

### Plano 5 · 14 – 18 s · Las placas · ⬅ CON CAPTURA

**Lo que se ve.** Espacio abstracto oscuro. Tres tarjetas verticales de cristal
salen del negro y se abren en abanico, flotando. **Las tres van en verde plano**
y se les incrustan las placas reales.

```text
Three vertical rectangular glass cards floating and rotating gently in a dark void of deep navy and obsidian. THE FACE OF EACH CARD IS A FLAT CHROMA GREEN SURFACE, uniform, no content, no text, no reflections on the green itself. The cards emerge from below and fan out elegantly into a staggered arrangement, edges catching soft mint and cyan rim light. Fine golden dust particles drift through the air around them. Shot on ARRI Alexa LF, 50mm, f/2.0, 60fps slow motion, shallow depth of field. Slow gentle orbit of 15 degrees around the arrangement. Premium, weightless, magical, deep blacks, mint accents.
```

**Post.** Incrustar `placa-1.png`, `placa-2.png` y `placa-3.png` en las tres
caras. Conservar el brillo del borde por encima del incrustado: es lo que hace
que se lean como objetos y no como recortes pegados.

**Cámara.** *Gentle orbit* de 15°.
**En pantalla.** «Con tu marca. De tu rubro.»
**Locución.** «Y salen las placas de tu negocio. Con tu marca, de tu rubro.»

---

### Plano 6 · 18 – 22 s · El alivio

**Lo que se ve.** La cara de ella, ahora iluminada en menta por la pantalla. La
expresión cambia: de la resignación del plano 2 a una sonrisa corta, genuina, de
alguien a quien le sacaron un peso de encima. **Es el plano más importante del
aviso.**

```text
Close-up of the same small business owner looking down at her phone, her face now lit by a soft mint-green glow from the screen. Her expression shifts over three seconds from guarded tiredness to quiet surprise and then to a small genuine warm smile — restrained relief, not exaggerated joy. Warm amber practical light behind her, subtle emerald rim light on her hair and shoulder. Bakery interior deeply out of focus. Shot on 35mm film stock, Leica Summicron 35mm, f/2.0, very shallow depth of field. Gentle slow orbital camera movement of 10 degrees around her. Documentary realism, emotionally resonant, photorealistic skin texture, no makeup gloss.
```

**Cámara.** *Gentle orbit* de 10°.
**En pantalla.** —
**Locución.** «Sin diseñador. Sin esperar. Sin pelearte con una plantilla.»

---

### Plano 7 · 22 – 26 s · El feed lleno · ⬅ CON CAPTURA

**Lo que se ve.** Dos manos sosteniendo un teléfono sobre una mesa de madera,
con un café al lado. **Pantalla en verde plano**; se incrusta el perfil de
Instagram. Encima, en edición, suben burbujas: me gusta, seguidores, mensajes.

```text
Top-down medium shot of two hands holding a smartphone over a rustic dark wooden table, a glass of espresso beside it, soft natural window light. THE PHONE SCREEN IS A FLAT CHROMA GREEN RECTANGLE, uniform, no content, no glare. One thumb scrolls slowly and appreciatively, unhurried — the opposite of the first shot. Warm amber wood tones, soft shadows, shallow depth of field. Shot on Sony FX3, 35mm, f/2.0. Slow push-in from above. Calm, warm, photorealistic, high-end lifestyle commercial.
```

**Post.** Incrustar `instagram.png`. Encima, cuatro pastillas blancas que
aparecen y suben flotando, escalonadas cada 400 ms: **♥ me gusta**, **👤 te
siguen**, **💬 te escriben**, **🔁 te comparten**. Sin números.

**Cámara.** *Slow push-in* cenital.
**En pantalla.** «Y tu feed deja de estar vacío.»
**Locución.** «Tu feed deja de estar vacío.»

---

### Plano 8 · 26 – 30 s · El cierre

**Lo que se ve.** Vuelve el matraz, ahora en reposo, y el cuadro se abre a negro
con la marca.

```text
Cinematic macro shot of the crystal Erlenmeyer flask with mint luminescent liquid now settled and still, resting on dark oak, a single last micro-bubble rising slowly. The background falls into deep black. Shot on ARRI Alexa Mini LF, 50mm anamorphic, f/1.8, 60fps slow motion. Camera static on tripod with only the liquid moving. Minimal, calm, premium, deep blacks with a single mint light source.
```

**En pantalla.** Logotipo · **Alquimia** · «Publicá como si tuvieras un
diseñador.» · `alquimia-cm.vercel.app`
**Locución.** «Alquimia. Publicá como si tuvieras un diseñador.»

---

# GUION B — sin capturas

Idéntico al A en los planos **1, 2, 3, 6 y 8**. Cambian el **4**, el **5** y el
**7**: en vez de verde plano, la IA genera también las pantallas.

### Lo que hay que saber antes

**Los modelos de video no saben escribir.** Cualquier texto que generen sale
ilegible, con letras inventadas y palabras a medio formar. En el aviso de una
herramienta que *fabrica texto bien compuesto*, una pantalla con letras
deformadas es el peor error posible: contradice el producto en la misma imagen
que lo está vendiendo.

Los tres prompts de abajo están escritos para esquivarlo:

1. **Ninguno pide texto legible.** Piden bloques, barras y formas —la silueta de
   una interfaz, no su contenido—.
2. **Las pantallas se ven en ángulo, cortadas o desenfocadas.** Nunca de frente
   y nunca nítidas del todo.
3. **El texto que sí se lee se pone después**, como capa de edición, con la
   tipografía de la marca.

Si aun así sale un renglón con letras raras, se tapa con un desenfoque de
movimiento o se recorta el plano. **Es preferible un plano más cerrado que un
texto ilegible.**

### La paleta de la interfaz, para que la IA la acierte

| | |
| :--- | :--- |
| Fondo de la aplicación | Papel crema cálido, casi blanco (`#F5F2EA`) |
| Tarjetas | Blanco puro, esquinas muy redondeadas, sombra suave |
| Color de acción | Verde menta (`#2ECC71`), en botones con forma de pastilla |
| Color secundario | Cian eléctrico (`#00E5FF` / `#2563EB`) |
| Texto | Gris tinta casi negro, sans geométrica, mucho aire |
| Lo que **no** es | Modo oscuro, violeta, neón, degradados, glassmorphism |

Ese último renglón importa: si no se lo prohíbe explícitamente, todos los
modelos dibujan la misma interfaz oscura con degradados violeta — que es
exactamente lo que el aviso está criticando en el plano 1.

---

### Plano 4 B · 10 – 14 s · Un toque

**Lo que se ve.** Lo mismo que en el A, pero la pantalla ya trae una interfaz
clara, de esquinas redondeadas, vista en ángulo. El dedo toca un botón verde con
forma de pastilla y el botón responde.

```text
Over-the-shoulder medium close-up of a small business owner sitting at a clean wooden counter in her artisan shop, soft morning window light. She holds a modern smartphone tilted at a 30 degree angle away from camera, so the screen is seen obliquely and never flat-on. The screen shows a bright, minimal, light-mode mobile app interface on a warm cream off-white background: rounded white cards with soft shadows, generous white space, a large mint-green pill-shaped button near the bottom. Deliberately no readable text — only clean abstract blocks, bars and shapes suggesting a beautifully organized interface, slightly soft in focus. Her finger taps the mint pill button once; it depresses and emits a soft mint glow. Warm amber wood, subtle mint rim light. Shot on Sony FX3, 50mm f/1.8, shallow depth of field, the screen slightly softer than her hand. Steady slow dolly-in. Photorealistic, calm, premium.

NOT dark mode. NOT purple. NOT neon. NOT gradients. Light, warm, paper-like, editorial.
```

**Post.** Poner encima, con la tipografía de la marca, el rótulo «UN SOLO TOQUE»
y el nombre del botón si se quiere que se lea: **✨ Sugerime**.

---

### Plano 5 B · 14 – 18 s · Las placas

**Lo que se ve.** Las tres tarjetas flotando, ahora con diseño propio: placas de
Instagram bien compuestas, con una foto arriba, un titular grande y un bloque de
texto abajo. Vistas en ángulo, con brillo en los bordes.

```text
Three vertical 4:5 social media post cards floating and rotating gently in a dark void of deep navy and obsidian, seen at an oblique angle, never flat-on. Each card is an elegant editorial Instagram post design: a rich photograph occupying the upper two thirds, a bold oversized headline block below it, and two or three thin lines of body text at the bottom — the headline and body rendered as clean abstract typographic blocks, deliberately not readable, slightly soft. One card is warm amber over a bakery photograph, one is deep forest green with a small mint accent, one is deep blue. Generous margins, confident modern editorial layout, no clutter, no badges, no starbursts. The cards emerge from below and fan out, edges catching soft mint and cyan rim light, fine golden dust drifting around them. Shot on ARRI Alexa LF, 50mm, f/2.0, 60fps slow motion, shallow depth of field. Slow gentle orbit of 15 degrees. Premium, weightless, deep blacks.

NOT purple. NOT neon. NOT glowing gradients. NOT crowded promotional flyer. Editorial, calm, expensive.
```

**Post.** Si algún renglón sale con letras raras, cerrar el plano o desenfocar
esa zona. El titular de verdad se puede escribir encima con la tipografía de la
marca.

---

### Plano 7 B · 22 – 26 s · El feed lleno

**Lo que se ve.** Las dos manos y el café, y en la pantalla una grilla de nueve
cuadraditos: un perfil de Instagram lleno y coherente. Vista cenital, en ángulo.

```text
Top-down medium shot of two hands holding a smartphone over a rustic dark wooden table with a glass of espresso beside it, soft natural window light. The phone is tilted slightly so the screen is seen at an angle. The screen shows a social media profile grid: a clean three-by-three grid of nine small square photographs in a coherent warm editorial palette — amber, cream, deep green — with thin consistent margins between them. No readable text anywhere, only the grid of images and a few small abstract icon shapes. One thumb scrolls slowly and appreciatively, unhurried. Warm amber wood tones, soft shadows, shallow depth of field with the screen slightly softer than the hands. Shot on Sony FX3, 35mm, f/2.0. Slow push-in from above. Calm, warm, photorealistic, high-end lifestyle commercial.

NOT dark mode. NOT purple. NOT neon.
```

**Post.** Las cuatro pastillas que suben —**♥ me gusta**, **👤 te siguen**,
**💬 te escriben**, **🔁 te comparten**— se agregan en edición igual que en el
guion A. Sin números.

---

## Cómo se arma

1. Generar los ocho planos sueltos, **tres o cuatro tomas de cada uno**. Ninguna
   IA de video acierta a la primera, y el plano 6 —la cara— es el que más
   intentos va a necesitar: es donde la expresión falsa se nota.
2. Elegir y cortar a la duración de la tabla. Los cortes van **a tiempo con la
   música**, y el del plano 3 es el único duro; los otros siete, disolvencias
   cortas de seis a ocho cuadros.
3. Locutar con la voz de marca, montar sobre los planos y ajustar: si una frase
   no entra, se alarga el plano, no se acelera la voz.
4. Poner los textos en pantalla y el logotipo con la tipografía de la marca
   —**Plus Jakarta Sans** para los titulares, **JetBrains Mono** para los
   rótulos en mayúsculas espaciadas—.
5. Zona segura de Instagram: **nada importante en los primeros 250 píxeles de
   arriba ni en los últimos 340 de abajo.** Ahí van la barra de la aplicación y
   la caja de respuesta, y se comen lo que haya.
6. Exportar 1080×1920, H.264, 30 fps, con pista de audio.

---

## Si hay que elegir uno

**El A.** El plano 6 —la cara de alivio— es el que vende, y ese no cambia entre
los dos guiones. Lo que cambia es si el producto que se muestra existe o es una
ilustración parecida, y en una herramienta que promete placas bien compuestas,
mostrar una pantalla inventada es contar el chiste y no entregarlo.

El B sirve para tener el aviso mañana, sin post y sin depender de nadie que sepa
incrustar. Si es lo que hay, funciona — pero conviene volver al A cuando se
pueda, aunque sea cambiando solo el plano 4.
