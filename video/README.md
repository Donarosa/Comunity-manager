# El comercial

Un spot de 24 segundos para Instagram, 1080×1920, que sale de una página web
renderizada cuadro por cuadro. Nada de esto pasa por una herramienta de edición:
el guion es código, así que cambiar una frase o un tiempo es cambiar una línea y
volver a renderizar.

```bash
npm run web                 # hace falta para recapturar la aplicación
node video/capturar-app.mjs # la pantalla del producto, a 2× de resolución
node video/render.mjs       # → video/comercial.mp4
```

Para revisar un tramo sin renderizar los veinticuatro segundos:

```bash
DESDE=8000 HASTA=13000 node video/render.mjs
```

Y para mirarlo a ojo: abrir `video/comercial.html?vivo=1` en el navegador.

---

## El viral, en cuatro partes

El segundo comercial. La diferencia con el de arriba es que acá **la aplicación
se ve funcionando**: no son capturas quietas sino el flujo entero, con el dedo
tocando cada botón.

```bash
npm run web                    # hace falta para capturar el flujo
node video/piezas-demo.mjs     # las placas que muestra, hechas con el motor
node video/capturar-flujo.mjs  # las cinco pantallas, operando la aplicación
node video/viral.mjs           # → video/viral.mp4
```

Para revisar un tramo: `DESDE=9000 HASTA=19000 node video/viral.mjs`.
Para mirarlo a ojo: `video/viral.html?vivo=1`.

| Tiempo | Parte | Qué se ve |
| --- | --- | --- |
| 0 – 5,3 s | **El problema** | Un feed de flyers violeta pasando de largo · «Todos publican lo mismo» |
| 5,5 – 8 s | | Lo que cuesta hoy: 3 horas de plantilla, US$10 la placa a un diseñador |
| 8,3 – 9,8 s | **Alquimia** | El destello, el frasco, el nombre |
| 9,6 – 19 s | | El flujo real: tocar Sugerime, escribir el tema, elegir carrusel, el frasco armando, las placas |
| 19 – 23 s | **El resultado** | Las cuatro placas salen del teléfono y se deslizan como carrusel |
| 23 – 26 s | | El posteo publicado, con los números subiendo |
| 26 – 28 s | **La invitación** | Probalo gratis · alquimia-cm.vercel.app |

### Nada de esto está ilustrado

Las cinco pantallas del teléfono las saca `capturar-flujo.mjs` abriendo la
aplicación y operándola. Las cuatro placas las hace `piezas-demo.mjs` con
`renderSpec`, el mismo motor que genera los PNG de un cliente. Y **las
posiciones donde cae el dedo salen medidas de esa misma corrida**, guardadas en
`flujo.json`: si un botón cambia de lugar, se vuelve a correr la captura y el
dedo lo sigue solo, sin que haya que retocar el comercial.

Lo único simulado es la respuesta del modelo, y sólo porque en esta máquina no
hay clave de IA: se intercepta esa llamada y se devuelve un plan armado a mano
que apunta a placas de verdad. La ruta que las sirve —`/piezas/…`— es la de
producción.

### Dos cosas del contenido

**Los números del posteo son ilustrativos.** Suben de 0 a 248 me gusta y 12
comentarios porque un contador quieto no se lee como un resultado, pero en
ninguna parte se dice que eso sea lo que le va a pasar a quien lo vea. Si
algún día hay clientes con cifras propias, se cambian por las de ellos y se
puede afirmar. Antes no.

**«Probalo gratis» es cierto hoy** porque todavía no hay forma de cobrar. El día
que se implemente el cobro —está anotado en `PENDIENTE.md`— esa línea hay que
revisarla: con una semana de prueba sigue siendo cierta, con un muro de pago no.

---

## El mismo aviso, como storyboard

Una segunda versión del viral, contada como el guion dibujado de un director.

```bash
PAGINA=storyboard.html node video/viral.mjs   # → video/storyboard.mp4
```

Usa los mismos insumos que el viral —las capturas del flujo y las placas del
motor—, así que si ya corriste `capturar-flujo.mjs` y `piezas-demo.mjs` no hace
falta nada más.

**La idea.** Los primeros cuadros están en boceto: línea de lápiz, sin color,
con su número y su anotación a mano. A partir del cuadro 04 se llenan con el
producto de verdad. El boceto que se vuelve pieza terminada es exactamente lo
que hace Alquimia, así que el formato dice lo mismo que el guion. Y termina con
la hoja de contactos: los ocho cuadros juntos, como queda un storyboard sobre
la mesa.

### La auditoría de aceptación

Lo mejor que tiene `video-shotcraft` no son sus 157 cartas de movimiento: es
`references/aesthetic-rules.md`, veintitantas reglas de jurisprudencia. Cada una
trae la regla, **el caso real que la originó** —con la queja textual del cliente
y cuántas vueltas costó— y la pregunta de autochequeo. No es teoría de diseño,
es la lista de las veces que alguien tuvo que rehacer algo.

El viral pasó por esa lista. Lo que falló y se corrigió:

| Regla | Qué decía | Qué estaba mal |
| --- | --- | --- |
| **R1** | El nombre de la marca se queda quieto **un segundo entero** después de caer | Caía a los 9,2 s y la capa se iba a los 9,45: un cuarto de segundo |
| **R3** | Más lento antes que más rápido; la interacción a velocidad de persona | Cinco pantallas en 9,4 s. «¿De qué querés hablar?» duraba 1,9 s: no alcanza para leer la pregunta, la ayuda y el tema escrito |
| **R2** | La velocidad viene de la aceleración; el grupo cierra con medio segundo quieto | Las cuatro placas salían cada 170 ms exactos — movimiento parejo, que se lee como PowerPoint |
| **Q11** | Subtítulo ≥56 px, auxiliar ≥32 px, **medido en píxeles del cuadro renderizado** | La URL del cierre a 30 px y los comentarios a 28 px, por debajo del piso. Y la regla dice que la URL del cierre es «la línea que menos debería ser chica» |
| **Q11** | El texto tiene dos estados: textura o para leer, nunca el intermedio | Los rubros y las chapitas de los flyers, a 14–15 px pero en amarillo pleno: demasiado chicos para leerse, demasiado brillantes para ignorarse |

La medición de Q11 quedó como herramienta:

```bash
node video/auditar.mjs                        # revisa viral.html
PAGINA=storyboard.html node video/auditar.mjs
```

Renderiza el comercial cada medio segundo y mide la **altura útil real** de cada
texto: el `font-size` multiplicado por todas las escalas que arrastran los
padres. La regla lo pide explícitamente así, y con razón — un texto de 64 px
adentro de algo escalado a 0,7 mide 45 y no se lee, y en el código sigue
diciendo 64. Sale con código 1 si queda algún texto en el estado intermedio.

Encontró cuatro cosas que la revisión a ojo no vio: el nombre de la cuenta de
Instagram a 26 px, la ciudad a 24, las iniciales del avatar a 20 y el rótulo
«Así se usa» a 26. Las dos primeras se agrandaron; las otras dos son decoración
de la tarjeta y se atenuaron a propósito.

Y de paso obligó a algo que estaba mal hecho: los rubros de los flyers estaban
atenuados bajando el color, no la opacidad. Se veía bien pero era una intención
que solo existía en el ojo de quien la escribió. Ahora está en `opacity`, que es
declarativo y lo puede comprobar una máquina.

El video pasó de 28 a 34 segundos. Es lo que cuesta cumplir R3, y el caso de esa
regla es difícil de discutir: seis rondas de comentarios pidieron «más lento» y
ninguna pidió «más rápido».

### Lo que se tomó de `video-shotcraft`

El repositorio de [Vincentwei1021](https://github.com/Vincentwei1021/video-shotcraft)
son 157 cartas de recetas de movimiento, cada una con tabla de parámetros y
trampas conocidas. **No tiene estilo storyboard** —está buscado, no hay
ninguna— así que esa parte no sale de ahí. Lo que sí salieron son tres recetas,
aplicadas a mano porque su tubería es de Remotion y acá el render es HTML +
puppeteer + ffmpeg:

| Carta | Qué aportó |
| --- | --- |
| `paper-title-card` | El cartel de texto: la palabra *i* arranca en el cuadro 4+i·4, dura 9, va de escala 1.28 a 1 con el desenfoque de 7 a 0. Un solo acento por frase — dos acentos es ninguno. Y los carteles duran siempre 50–55 cuadros: lo que tarda alguien en leer una frase. |
| `panel-grid-moves` | Los paneles entran con dos cuadros de diferencia y se retienen dieciocho antes de irse. |
| `quad-split-parallel-scenes` | Entre dos eventos vecinos, de 3 a 6 cuadros. Menos se lee como si todo se moviera junto —y junto es tieso—; más y la densidad se desarma. |

Son números que si no se adivinan, y adivinarlos cuesta varias vueltas de
render. Eso es lo que el repositorio vale acá.

---

## El frasco suelto, en GIF

El mismo frasco que burbujea en la pantalla de espera, para usar donde haga
falta: una historia, una firma de correo, una presentación.

```bash
node video/frasco.mjs        # → video/frasco.gif  y  video/frasco.png
ANCHO=320 node video/frasco.mjs
```

| Archivo | Qué es | Para qué |
| --- | --- | --- |
| `video/frasco.gif` | 480×480 · 3,6 s · 90 cuadros | Donde no se acepta otra cosa: WhatsApp, Instagram, Slack |
| `video/frasco.png` | APNG, mismo tamaño, con transparencia real | Una web, una presentación — fondo transparente de verdad |

Son dos porque el alfa del GIF es de un bit: no sabe hacer transparencia a
medias, y el borde curvo del vidrio contra un fondo que no conoce sale recortado
a dientes. El APNG sí tiene alfa real, pero no lo aceptan ni Instagram ni
WhatsApp. Uno para cada cosa.

El SVG lo importa del mismo módulo que usa la aplicación —`web/js/frasco.js`—,
así que no hay dos frascos que se vayan separando.

### Por qué las duraciones no son las de la aplicación

En la aplicación los cuatro ciclos duran 3,4 · 2,6 · 4,1 y 2,9 segundos y no
tienen múltiplo común corto. En una pantalla eso no se nota, porque la animación
no termina nunca. Un GIF vuelve al principio: si el ciclo no cierra, se ve el
salto en cada vuelta, para siempre.

Acá las cuatro duraciones dividen los 3,6 segundos del bucle —1,2 · 1,8 · 3,6 y
1,8— y los retardos de las burbujas van en negativo, para que ninguna pase el
principio del bucle todavía esperando. El cuadro del final es idéntico al del
principio, píxel por píxel: está verificado comparando las dos huellas.

Las burbujas también van más opacas que en la aplicación. Ahí el frasco mide 168
píxeles y son un detalle que se intuye; acá el frasco es todo lo que hay.

### Las burbujas no pueden salirse del líquido

Son cian —el acento secundario de la marca— y no blancas. Una burbuja blanca
sobre el verde claro es un hueco: se lee como espuma, que es lo que hace
cualquier líquido. En cian se lee como lo que el frasco está haciendo.

El cambio de color destapó un error que estaba desde siempre y no se veía: la
burbuja subía hasta cruzar la superficie y quedaba flotando en el vidrio vacío.
Blanco sobre blanco, invisible; en cian, imposible de no ver.

Acortarle el recorrido no alcanza, y se probó: la onda no es una línea recta y
se desplaza, así que una burbuja puede quedar por debajo de la cresta y por
encima de la superficie que le toca a su columna en ese instante. Lo que sí
alcanza es un `clipPath` en `y=322` —debajo del punto más bajo que alcanza la
onda, los 310 de la onda de atrás más los 5 que respira el líquido—. Es
geometría fija: no depende del encuadre, ni del momento del ciclo, ni de
volver a medir nada. Y como la burbuja se desvanece mientras sube, el corte no
se lee como corte.

Está verificado sobre los píxeles del GIF, columna por columna y en los noventa
cuadros: dónde empieza el verde en cada x y hasta dónde llega el cian.

---

## La prueba de la historia animada

La pregunta era si conviene que Alquimia haga historias animadas además de
placas. Esto la contesta con números en vez de con intuición.

```bash
node video/historia.mjs                    # → video/historia.mp4
SEGUNDOS=8 FPS=24 node video/historia.mjs
```

No es una maqueta: la placa la dibuja `htmlFor()`, el mismo motor que hace los
PNG, con una marca normalizada igual que la de un cliente. Lo único que se le
suma es una capa de animación por encima, escrita en el script y **no en el
motor** — el motor sigue siendo la fuente de verdad del render y no se toca para
resolver una pieza puntual.

### Lo que salió

| | |
| --- | --- |
| Formato | 1080×1920 · 6 s · 30 fps · 180 cuadros |
| Una placa quieta, de punta a punta | **1,7 s** |
| La historia, de punta a punta | **11,8 s** |
| El barrido solo (Chrome ya abierto) | 8,4 s |
| Cada cuadro de más | **162×** lo que cuesta una captura suelta |
| Peso | 493 KB |

Los dos números que importan son distintos y conviene no confundirlos. **Una
pieza cuesta 7 veces una placa** de punta a punta, porque abrir Chrome pesa más
que renderizar un PNG y ese costo se paga una sola vez. **Cada segundo de más
cuesta 30 cuadros**, y ahí sí la cuenta es lineal y sin piso.

### Lo que eso significa en Vercel

`vercel.json` declara `maxDuration: 60` y `memory: 2048`. Once segundos y medio
locales entran cómodos — pero eso es en una Mac con chip de Apple. La función
corre en x86 con `@sparticuz/chromium`, que en la experiencia habitual va entre
dos y cuatro veces más lento. **Una historia de 6 segundos caería alrededor de
los 35 s: adentro del tope, pero sin margen.** Una de 10 lo pasa.

No está medido en Vercel — es una estimación a partir del número local. Antes de
construir nada conviene renderizar una sola vez allá y ver el número de verdad.

### Lo que la prueba dejó a la vista

**El encuadre de historia queda casi vacío.** La zona segura de Instagram empuja
todo el contenido abajo —`pad: '270px 88px 330px'` y el ancla al pie— y en una
placa quieta eso se lee como aire. En seis segundos de video se lee como una
pieza sin terminar. Una historia animada casi con seguridad quiere una foto de
fondo, no el fondo liso que alcanza para el feed.

**Los primeros cuatro décimos están en blanco.** La firma entra a los 150 ms y
el título recién al segundo. Para un PNG no existe el problema; en una historia,
que se pasa con el pulgar, medio segundo en blanco es medio segundo perdido.

**Y la cuota no sabe contar esto.** Hoy el plan cuenta *placas*. Un video no es
una placa, cuesta siete veces más y ocupa quinientas veces el disco. Eso hay que
resolverlo antes de escribir la primera animación de verdad, y no es un problema
técnico.

---

## El guion

| Tiempo | Escena | Qué se ve | Qué dice |
| --- | --- | --- | --- |
| 0 – 1,4 s | El gancho | Negro | «Todos usan la misma IA.» |
| 1,4 – 5 s | El cansancio | Un feed de flyers violeta pasando de largo, que al final se apaga | «Y se nota.» · «Mismo violeta. Misma tipografía. Mismo todo.» |
| 4,7 – 6 s | El corte | Un destello menta que tapa la pantalla | — |
| 5,8 – 8,5 s | La marca | El frasco y el nombre | «El contenido de tu negocio, con tu marca.» |
| 8,3 – 13,2 s | Un clic | La aplicación de verdad; un dedo toca «Sugerime» y se pone a trabajar | «Un solo toque» · «Decile de qué hablar.» → «Y ya está.» |
| 12,9 – 17,8 s | Las placas | Tres placas reales saliendo del teléfono en abanico | «Con tu marca. De tu rubro. Listas para subir.» |
| 17,5 – 21,8 s | El resultado | Un feed en la mano; suben los me gusta, los seguidores, los mensajes | «Y tu feed deja de estar vacío.» |
| 21,6 – 24 s | El cierre | Frasco, nombre y dirección | «Publicá como si tuvieras un diseñador.» |

---

## Tres decisiones que conviene no deshacer

**Los flyers del principio son dibujados, no capturados.** El ejemplo del que
salió la idea es el aviso real de una barbería, con su nombre y su teléfono
adentro. Usar el aviso de un negocio como mal ejemplo en el aviso de otro es
meterse en un problema que no hace falta, y además no suma: lo que se reconoce
no es *ese* flyer sino el molde —el violeta, el neón, el grito en Anton— y eso
se dibuja en veinte líneas de CSS.

**El cierre no promete ventas.** El pedido original terminaba en «ventas que se
traducen en mayor ingreso». Lo que se ve son me gusta, seguidores y mensajes
—lenguaje de red social, sin cifras— y el remate va sobre lo único que sí está
medido en el producto: los US$10 por placa que cobra un diseñador. Prometer un
número de ventas en un aviso es publicidad engañosa salvo que haya con qué
respaldarlo, y todavía no hay clientes con los que respaldarlo.

**La pantalla del producto se recaptura, no se ilustra.** `capturar-app.mjs`
abre la aplicación de verdad y le saca una foto. Una ilustración del producto se
despega de la aplicación en la primera semana, y el que llega desde el aviso
encuentra otra cosa. Si cambia el orden de los botones, se vuelve a correr.

---

## Lo que falta

El archivo sale **mudo**, con una pista de silencio para que ninguna plataforma
lo rechace por venir sin audio. La música se le pone después, en el editor o en
el propio Instagram. El corte del principio —el destello menta a los 4,7 s— está
puesto donde caería el golpe de una cortina, por si se quiere sincronizar.
