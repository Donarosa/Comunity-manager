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
