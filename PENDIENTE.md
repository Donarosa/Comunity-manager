# Estado de producción

**https://alquimia-cm.vercel.app** — actualizado 01/09/2026, verificado contra
producción, no deducido.

```bash
curl https://alquimia-cm.vercel.app/salud
```

Hoy responde `firebase: true · almacen: true · ia: true`, y los tres salen de
comprobar de verdad: que la base se pueda leer, que el bucket exista. También
dice qué commit está corriendo, que es lo que evita confundir un arreglo que
todavía no llegó con un arreglo que no funciona.

---

## Falta una sola cosa: autorizar el dominio en Firebase

Consola de Firebase > **Authentication** > pestaña **Settings** > **Authorized
domains** > *Add domain*:

```
alquimia-cm.vercel.app
```

Sin esto el ingreso con Google falla con `auth/unauthorized-domain`. Firebase
solo permite iniciar sesión desde dominios de esa lista —es lo que evita que
alguien clone el sitio y use estas credenciales—, y por defecto trae `localhost`
y los dos dominios de Firebase, ninguno de Vercel.

Toma efecto al instante: no hay que redesplegar.

**Cada dominio nuevo hay que sumarlo.** Si más adelante hay uno propio
(`alquimia.com.ar`), el sitio va a andar entero salvo el login, que es el olvido
clásico y el más difícil de diagnosticar porque todo lo demás funciona.

---

## Lo que ya anda, y cómo se comprobó

- **La API está cerrada.** Sin cabecera, con `Bearer loquesea` o con un token de
  invitado: 401. Cada cuenta ve solo la suya: 403 contra una ajena. Listar todas
  es solo admin.
- **Las cuentas y las marcas persisten.** Se creó una cuenta, se le puso marca,
  se forzó una instancia nueva con un redespliegue —que vacía el disco de la
  función— y volvió entera.
- **Las placas persisten.** Misma prueba: la placa se descargó del bucket desde
  una instancia que nunca la había renderizado. PNG de 2160×2700.
- **El render sale en unos 4 segundos.**

## Cómo entra la gente

Solo con Google. El código por correo se sacó —no hay proveedor de mail
conectado, así que prometía un correo que nunca salía— y el modo invitado
también, porque dejaba entrar con un id inventado en el navegador que el
servidor tenía que aceptar.

Es angosto: sin cuenta de Google no se entra, y no se puede mirar el producto
sin registrarse. Se ensancha conectando un proveedor de correo; el backend del
código por mail está entero y hay una prueba que se destraba sola el día que se
instale uno.

## Dos cosas menores, para cuando haya tiempo

- **Preview no tiene todas las variables.** Las cinco del SDK Web y el bucket
  están en Production y Development, no en Preview. Solo afecta a los despliegues
  de rama: una preview sale sin login ni IA y parece que la rompiste vos. Se
  arregla en el panel tildando Preview.
- **`GEMINI_API_KEY` y `UNSPLASH_ACCESS_KEY` están cargadas como tres entradas
  separadas** en vez de una sola con los tres entornos. Funcionan igual; el
  costo aparece al rotarlas, porque hay que editar tres filas y actualizar una
  sola deja las otras con la clave vieja sin avisar.

---

## Anotado, sin hacer: corregir el texto de una placa

El caption ya se edita en pantalla y se guarda. El texto que va **dentro** de la
placa no: está horneado en el PNG, y las placas no se guardan como datos —solo
queda el archivo, el caption y los hashtags—, así que los campos de cada una
(volanta, título, cuerpo) se pierden apenas se renderiza. `iniciarEditor()`
además arranca siempre vacío y no sabe abrir una publicación existente.

Consecuencia: si el modelo escribe mal algo que quedó impreso en la placa, hay
que rehacerla desde cero retipeando todo. En un producto donde el texto lo
escribe un modelo, eso es la diferencia entre corregir en diez segundos y
publicar con el error.

Serían dos partes: guardar `placas` en `registrarPublicacion`, y que
`iniciarEditor` acepte un estado inicial.

Y una decisión de producto antes de escribir nada: rehacer una placa corregida
vuelve a consumir cuota de `piezas`. Puede quedar así —es un render real— o
puede no cobrarse la primera corrección de una placa recién hecha, que evita que
alguien publique con un error para no gastar una pieza.


---

## Anotado, sin hacer: la prueba de una semana y el bloqueo

El modelo de cobro está decidido y escrito en `PRODUCTO.md`, en *Cómo se cobra*.
En dos líneas: una semana gratis para todos con los límites normales, después el
producto se bloquea hasta que se paga, y al pagar se libera con **los mismos**
límites. Nadie tiene cuota infinita salvo la cuenta del dueño, que ya está
resuelta con `CUENTAS_INTERNAS`.

Se implementa junto con el cobro y no antes: sin una forma de pagar, un bloqueo
es una pared sin puerta.
