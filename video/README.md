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
