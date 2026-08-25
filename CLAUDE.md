# Community manager para micro pymes — guía para Claude

Producto que le arma a una pyme el contenido de Instagram: placas de feed,
carruseles e historias, renderizadas como **PNG reales** con Chrome headless,
con la marca del cliente aplicada.

Leé **`PRODUCTO.md`** para entender el producto y las decisiones tomadas. Este
archivo es cómo se trabaja el código.

---

## Cómo está armado

```
core/
  render/     motor: spec JSON → PNG. Sin marca ni tamaños adentro.
    formats.mjs        feed 1080×1350 · story 1080×1920 · cuadrado 1080×1080
    disposiciones.mjs  5 composiciones; el orden de las reglas importa
    engine.mjs         renderSpec() — la única función que abre Chrome
    templates/         flat · vector · foto
  brand/      identidad del cliente
    color.mjs          conversiones OKLCH y contraste
    palette.mjs        un color → paleta de 16, con contraste forzado
    fonts.mjs          catálogo de tipografías (familia + importUrl juntas)
    schema.mjs         normalizeBrand() y saneado del logo
    logo.mjs           generación de isotipos SVG por IA
  content/
    plan.mjs           plan de contenido → spec renderizable
  quota/      plan único, topes mensuales y diarios
  store/      un JSON por cuenta, bajo data/
    identidad.mjs      sugerencia de identidad completa (logos + color + tipografía)
  content/
    plan.mjs           plan de contenido → spec renderizable
  media/imagenes.mjs   orquesta los bancos de fotos y la subida propia
    proveedores/       un archivo por banco; leé su README antes de tocarlos
  quota/      plan único, topes mensuales y diarios
  store/      un JSON por cuenta, bajo data/
  ai/claude.mjs        cliente de la Claude API, con costeo
  api/server.mjs       API HTTP + servidor de la web
  service.mjs          los casos de uso — es la capa que combina todo

web/          la aplicación: landing, wizard de alta y editor de placas
  css/app.css        el sistema visual y por qué es así
  js/color.js        el selector de color en dos pasos
  js/wizard.js       el onboarding
  js/editor.js       el editor con vista previa en vivo

cm.mjs              CLI del producto
render-placa.mjs    CLI del motor solo (compatibilidad con /placa)
pruebas/smoke.mjs   pruebas que no necesitan API
pruebas/muestras.mjs genera las placas de la portada del sitio
```

**El navegador importa módulos del núcleo directamente.** `core/brand/color.mjs`,
`palette.mjs`, `fonts.mjs` y `render/formats.mjs` no tocan Node y se sirven en
`/nucleo/...`, así el cálculo de color de la web es el mismo código que usa el
render y no dos implementaciones que se van separando. Si agregás un módulo a esa
lista (`MODULOS_WEB` en `server.mjs`), no puede importar nada de Node.

**`core/service.mjs` es la puerta de entrada.** La CLI y la API HTTP son
cáscaras finitas encima. Si agregás una funcionalidad, va ahí y las dos
cáscaras la exponen — no la escribas dos veces.

---

## Reglas

- **La identidad va en el objeto `brand`, nunca en el motor ni en el spec.** Si
  hace falta un color o una fuente que no está, se agrega a la derivación de
  marca. Nada de valores de marca hardcodeados en un template: son multi-cliente.
- **La composición va en `disposiciones.mjs`,** y el orden de las reglas es
  base → disposición → formato: el anclado abajo en historia es zona segura de
  Instagram y tiene que ganar sobre cualquier disposición.
- **Los tamaños van en `formats.mjs`.** Ningún template inventa un número de
  ancho o alto.
- **El motor es la fuente de verdad del render.** No lo edites para resolver una
  placa puntual — eso se hace con el spec. Si un cambio de diseño es realmente
  necesario, decilo antes y explicá a qué formatos y templates afecta.
- **Cuota: verificar antes de llamar a la API, consumir después de que salió
  bien.** Al revés se le cobra al usuario una pieza que nunca vio, o se gasta
  plata de API en un pedido que igual se iba a rechazar.
- **Previsualizar no consume cuota; renderizar el PNG sí.** Escribir tiene que
  ser gratis, o el usuario redacta con miedo.
- **No generamos imágenes.** Ni fotos de producto ni de local. O es del negocio,
  o es de banco con licencia comercial *y de modificación* —poner texto encima
  crea una obra derivada— y sale con crédito. Si una licencia le deja una
  obligación al cliente (ShareAlike), hay que avisarle en pantalla, no
  esconderlo. Antes de agregar un banco, leé `core/media/proveedores/README.md`:
  cada uno tiene requisitos propios de sus términos.
- **Todo lo que venga del modelo o del usuario pasa por saneado antes de entrar
  a un render.** El logo por `sanitizeLogoInner()`; ninguna excepción.
- **Nunca entregar placeholders** tipo "Lorem ipsum" o "TÍTULO ACÁ".
- **Un dato duro lleva su fuente** en el campo `fuente` de la placa.
- Los datos de clientes (`data/`) y los PNG (`placas/`) no se versionan.

---

## Formato de las placas

- Resaltes de 1-2 palabras por título, no frases enteras: `<span class="acc">x</span>`
  en flat, `<em>x</em>` en vector.
- Negrita de cuerpo con `<b>`. En carruseles, `idx` tipo `"01/05"`.
- Máximo ~200 caracteres de cuerpo por placa; título hasta 55.
- Se renderiza a `deviceScaleFactor: 2` (una placa de feed sale 2160×2700).

---

## Correr las cosas

```bash
npm run prueba                    # pruebas de humo, no gastan API
npm run web                       # la aplicación en localhost:8787
node cm.mjs ayuda                 # el producto por CLI
npm run ejemplo                   # los 7 templates con brand.json
npm run muestras                  # regenera las placas de la portada
```

Las rutas con IA necesitan `ANTHROPIC_API_KEY` en el entorno (o un perfil de
`ant auth login`). Las demás no.

Cambiar el modelo: `CM_MODEL=claude-sonnet-5`. Si lo cambiás, actualizá también
la tabla de precios en `core/ai/claude.mjs` — el costo reportado es lo que
después define el precio de la suscripción.
