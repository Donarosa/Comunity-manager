# Community manager para micro pymes

Qué es, qué decisiones están tomadas y qué falta. Es el documento que hay que
leer antes de tocar el código o antes de venderle a alguien.

---

## La propuesta en una línea

Una micro pyme carga su marca una vez y todas las semanas recibe el contenido
de Instagram ya hecho: las placas de feed, las historias y los textos, con sus
colores, su tipografía y su logo aplicados.

**Contra qué compite.** No contra Canva: Canva le da plantillas y le deja el
trabajo. No contra una agencia: una agencia le cobra diez veces más. Compite
contra *no publicar nada*, que es lo que hace hoy la mayoría de las pymes de
este tamaño.

**Qué lo hace defendible.** Los PNG son reales, salen del motor de render, y la
marca del cliente se aplica de verdad en cada pieza. La competencia de IA en
este espacio devuelve texto, o imágenes genéricas que no respetan una identidad.

---

## Lo que está construido

| Pieza | Qué hace | Dónde |
|---|---|---|
| Motor de render | Spec JSON → PNG en tres formatos | `core/render/` |
| Marca por cliente | Un color y un nombre → 16 colores, tipografía y logo | `core/brand/` |
| Logo por IA | 3 isotipos en SVG, sanitizados | `core/brand/logo.mjs` |
| Generador de contenido | Plan semanal → placas + captions + hashtags | `core/content/plan.mjs` |
| Cuotas | Tope mensual y diario por recurso | `core/quota/` |
| Banco de imágenes | Búsqueda en Openverse + subida propia, con crédito | `core/media/imagenes.mjs` |
| Casos de uso | Marca + IA + cuota + render, coordinados | `core/service.mjs` |
| API HTTP | Veinte rutas, sin framework | `core/api/server.mjs` |
| **Aplicación web** | Landing, alta en 4 pasos y editor con vista previa | `web/` |
| CLI | El producto entero desde la terminal | `cm.mjs` |

### Los dos caminos del usuario

**Camino IA** — "no sé qué publicar". Pide un plan, la IA propone posteos e
historias, sale todo renderizado con caption y hashtags. Cuesta API.

**Camino manual** — "ya sé qué quiero decir" o "tengo esta foto". Escribe el
texto o sube la imagen, elige el formato, sale la placa. No cuesta API, solo
cuota de placas.

Los dos terminan en el mismo motor y con la misma marca aplicada. Eso importa:
un producto donde el camino manual se ve peor que el automático se abandona.

### Formatos

| Formato | Medidas | Para qué |
|---|---|---|
| `feed` | 1080×1350 | Posteo y carrusel |
| `story` | 1080×1920 | Historia y portada de reel |
| `cuadrado` | 1080×1080 | Cuando el perfil es una grilla |

`story` no es `feed` estirado: tiene sus propias zonas seguras (los ~270px de
arriba se los come el header de Instagram y los ~330px de abajo la caja de
respuesta) y el contenido se apoya abajo, no en el centro.

---

## Decisiones tomadas

**Un solo plan.** Para una pyme, elegir entre tres opciones antes de haber
visto el producto funcionar es fricción pura. Los tiers se abren cuando haya
datos reales de consumo: agregar una entrada en `core/quota/plan.mjs` y un
campo en la cuenta. El resto del código ya lee los límites de ahí.

**Dos topes, no uno.** El mensual define qué compró la persona. El diario evita
que se queme el mes en una tarde, y —más importante— evita que un bug o un
abuso dispare la factura de API en una noche.

**El logo se genera como SVG, no como imagen.** El modelo escribe la geometría
(`<path>` y `<circle>`) directamente. Sale vectorial, escala a cualquier tamaño,
entra tal cual en el motor, y cuesta lo mismo que un texto en vez de lo que
cuesta una imagen generada. El tope de 1 por mes queda como decisión de
producto —que el logo sea una decisión y no una tragamonedas—, no como
necesidad de costo.

**La paleta se deriva en OKLCH.** Una pyme sabe "mi color es este bordó", no
sabe qué es un `accentOnDark`. De un color salen dieciséis, con contraste
forzado: si el color de marca es un amarillo flúor, el sistema baja el tono
para los textos, mantiene el original en los fondos, y avisa. Ninguna placa
sale ilegible en silencio.

**La tipografía se elige de un catálogo.** El usuario elige "Cálido", no
escribe una URL de Google Fonts. Si la familia y la URL de importación no
coinciden, el render sale con fuentes de sistema y no es obvio por qué. En el
alta, cada opción se muestra con el nombre del negocio escrito en esa fuente:
nadie elige una tipografía leyendo su nombre.

**El alta pregunta por el logo, el color y la tipografía por separado.** Un solo
"¿tenés identidad de marca?" obliga a mentir en alguna dirección: casi ningún
negocio chico tiene las tres cosas y casi todos tienen alguna. Lo que falte lo
propone la plataforma; lo que haya, lo carga el usuario.

**El color se elige en dos pasos: familia y después tono.** Alguien dice "mi
color es lila" y hay doscientos lilas. Una rueda de color tampoco lo resuelve,
porque le pide encontrar una coordenada exacta en un espacio continuo. Primero
se elige la familia, y recién ahí aparecen los lilas que existen, en una matriz
de luz por saturación. Veinticuatro opciones concretas en vez de un millón de
coordenadas.

**Previsualizar es gratis; solo se descuenta al bajar el PNG.** Si escribir
consumiera plan, el usuario redactaría con miedo. Y la vista previa es el HTML
del propio motor achicado en un iframe, no un dibujo aparte: una
previsualización reconstruida se desincroniza del render en la primera semana y
el usuario se entera recién cuando ya publicó.

**No generamos imágenes.** Una foto inventada de una panadería que no es esta
panadería no es un atajo: es una mentira chica que el vecino que pasa por la
puerta todos los días detecta enseguida. Hay dos caminos honestos: la foto que
sacó el negocio, o una de banco con crédito.

**"Open source" no era el criterio correcto para el banco de fotos.** El primer
intento usó solo Openverse, que es el único verdaderamente abierto y el único que
anda sin clave. Salió mal por dos motivos: es un archivo agregado de Flickr y
Wikimedia, no una fototeca curada —la calidad es despareja—, y **el 90% de lo que
devuelve es CC BY-SA**, que es ShareAlike. Una placa promocional con el logo de un
negocio encima es una obra derivada, así que esa licencia obligaría al cliente a
publicar su propio posteo bajo los mismos términos. La licencia más abierta
resultó ser la más problemática para el caso de uso.

Ahora hay cuatro bancos detrás de una interfaz común (`core/media/proveedores/`)
y los resultados se intercalan. Pexels, Unsplash y Pixabay no son open source,
pero sus licencias son mejores para esto: uso comercial, modificación permitida,
sin ShareAlike y sin atribución obligatoria. Openverse queda como red de
contención para que el banco funcione sin configurar nada, y cuando el usuario
elige una foto con ShareAlike la interfaz se lo advierte.

**Cinco disposiciones, no un editor libre.** El color y el logo distinguen a un
negocio de otro, pero la composición era siempre la misma: cinco pymes con la
plantilla "texto" sacaban cinco placas con el mismo esqueleto. La disposición
—clásica, titular, centrada, bloque, ficha— cambia anclado, alineación, escala y
el recurso de énfasis. Se elige en el alta y vive en la marca, para que un
negocio se vea siempre igual a sí mismo; una placa puntual puede pisarla.

Son opciones cerradas a propósito. Arrastrar cajas libremente deja que el usuario
rompa la placa —textos pisados, cosas fuera de la zona segura, jerarquías
invertidas— y el resultado deja de ser confiable. Cinco composiciones diseñadas
dan variedad real sin que nadie pueda arruinar la salida.

**El logotipo se construye con tipografía, no se elige de un catálogo.** El
primer intento tomaba iconos de librerías de interfaz (Lucide, Phosphor). Falla
por dos motivos: un icono está dibujado para leerse a 20px dentro de un botón,
no para sostener una identidad; y sobre todo, **cinco negocios del mismo rubro
terminan con el mismo logo** — y un icono público no es registrable como marca,
le falta distintividad. Es darle al cliente algo que no puede defender como suyo.

Ahora hay tres formas —solo el nombre, nombre y símbolo, solo el símbolo— y
cuatro tratamientos tipográficos para el nombre (apilado, en una línea, con
filete, con caja). Cuando no hay logo propio, el símbolo es un **monograma** con
las iniciales del negocio: es único por definición, hereda la tipografía de la
marca y sí se puede registrar. Nada de esto llama a un modelo: es tipografía y
reglas, así que sale igual siempre y no cuesta por cliente.

**El cromo de la aplicación es deliberadamente austero.** El único color fuerte
de la pantalla tiene que ser el de la marca del cliente. Si la interfaz también
grita, el usuario no puede juzgar su propia placa.

**El panel de valor dice "equivalen a", no "ahorraste".** El tablero muestra
cuántas placas hizo el cliente y cuánto valen a precio de diseñador
(`core/valor.mjs`, US$4 por placa por defecto). La redacción es una decisión, no
un descuido: afirmar un ahorro es afirmar algo sobre un mundo paralelo en el que
el negocio contrataba a alguien, y a 120 placas mensuales ese mundo no existe —
ninguna panadería iba a gastar US$480 por mes en un diseñador. Un número que el
cliente no se cree no es neutro: le hace dudar de todo lo demás que ve en
pantalla. La equivalencia dice lo mismo sin prometer nada falso, y el precio de
referencia va impreso al lado de la cifra en vez de escondido en un globito.
Se cambia a `ahorro` con `CM_MODO_VALOR`.

**El cobro todavía no está conectado.** La capa de planes y cuotas está armada
y funcionando; falta el proveedor. Cuando se conecte, lo único que tiene que
hacer es escribir `cuenta.plan` y `cuenta.estado`.

---

## Costos de API

El modelo es `gemini-2.0-flash` (US$0.10 por millón de tokens de entrada,
US$0.40 de salida). Antes era `claude-opus-5`, cincuenta veces más caro por
token. El cambio de proveedor movió el costo de API de "el 10% del
ingreso" a "ruido contable", y eso cambia dos cosas del negocio, no una.

**El tier gratuito son 1.500 pedidos por día.** Un plan de contenido es un
pedido. Una sugerencia de identidad, otro. O sea: el producto entero corre en
cero hasta unos cientos de clientes activos. La API deja de ser un costo
variable a vigilar y pasa a ser un umbral lejano.

**Estimación, sin medir todavía** (tier pago; en el gratuito es US$0):

| Acción | Costo estimado |
|---|---|
| Un plan de contenido (5 piezas con captions) | ~US$0.003 |
| Tres propuestas de logo | ~US$0.002 |
| Una placa manual | US$0 |
| **Un usuario que agota el plan en un mes** | **~US$0.04** |

Son estimaciones de sobremesa, escaladas desde las que había con Opus por la
diferencia de precio por token — no medidas de nuevo. **El sistema ya reporta el
costo real de cada llamada** (`costoUSD` en cada respuesta, acumulado en
`consumo[mes].costoUSD`), así que el primer mes de uso real da el número
verdadero. Antes de fijar el precio de la suscripción, mirá ese número, no este
cuadro.

La conclusión de fondo no cambió, se acentuó: el costo dominante del negocio no
va a ser la API, va a ser conseguir los clientes. Con Opus la API era el 10% de
un plan de US$15–20; con Flash es menos del 1%. Lo que sí hay que revisar es si
los topes de cuota (`core/quota/plan.mjs`) siguen teniendo sentido: se fijaron
para contener un costo de API que ya no existe.

---

## Lo que falta

En orden de qué desbloquea más:

1. **Medir con clientes reales.** Cinco pymes usando la CLI o la API alcanza
   para saber si el contenido que propone sirve. Es lo más barato y lo que más
   cambia el resto de las decisiones.
2. **Cuentas de verdad.** Hoy la identidad del usuario es un id guardado en el
   `localStorage` del navegador: alcanza para probar con gente, no para cobrar.
   Falta email + clave (o un enlace mágico, que para este público es menos
   fricción) y el token en la API.
3. **Cobro.** Mercado Pago para Argentina. Un webhook que escriba `cuenta.plan`
   y `cuenta.estado`, más una pantalla de "se venció tu plan".
4. **WhatsApp.** La web ya está, pero para este público un bot de WhatsApp tiene
   menos fricción todavía: no hay que registrarse ni instalar nada. El núcleo
   expone HTTP, así que es otra cáscara sobre `service.mjs`.
5. **Calendario y publicación.** Programar y publicar directo en Instagram
   requiere la API de Meta, cuenta business y revisión de app. Es el paso que
   convierte "me hace las placas" en "me maneja las redes", y es varias veces
   más trabajo que todo lo anterior junto.
6. **Multi-marca.** Para quien maneja varios negocios o para agencias chicas.
   El límite ya existe (`marcas` en el plan); falta que una cuenta pueda tener
   más de una.
