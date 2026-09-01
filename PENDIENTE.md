# Lo que falta para que producción funcione

Actualizado 01/09/2026. Verificado contra producción, no deducido.

**Anda:** la API está cerrada, las cuentas y las marcas persisten en Firestore
—sobreviven al reciclado de la instancia—, el ingreso con Google está
habilitado, y el render sale en unos 4 segundos.

**Falta una sola cosa, y es de dos clics.**

## Activar Storage — lo único que queda

Consola de Firebase > **Compilación > Storage > Comenzar**.

Hoy `/salud` responde:

```
"almacen": false,
"problemas": ["el bucket alquimia-d4929.firebasestorage.app no existe"]
```

No es el nombre: se probaron las dos convenciones —`.appspot.com` y
`.firebasestorage.app`— y ninguna existe, porque **no hay ningún bucket
todavía**. Sin activarlo, las placas se renderizan bien pero viven en el disco
temporal de la función y desaparecen cuando la instancia se recicla: el cliente
genera una placa, cierra, vuelve, y el enlace de descarga da 404.

Cuando lo actives, la consola muestra el bucket como `gs://algo`. Ese `algo` es
el valor exacto que va en `FIREBASE_STORAGE_BUCKET` —ahora está cargado como
`alquimia-d4929.firebasestorage.app`, que es lo más probable, pero conviene
confirmarlo contra lo que diga la pantalla— y después hay que redesplegar.

`/salud` lo verifica de verdad: si el bucket existe, dice `almacen: true`; si
no, dice cuál buscó y no encontró.

## El ingreso por código de correo sigue sin funcionar

No hay nada en el código que mande mails. `enviarOtp()` genera el código, lo
guarda y lo escribe en la consola del servidor. El usuario ve "Código enviado",
pasa a la pantalla de los seis dígitos y espera algo que nunca sale.

Son dos caminos: conectar un proveedor —Resend tiene capa gratis— o sacar ese
botón hasta que exista. Dejarlo como está manda gente a una pantalla sin salida.

---


## 1. Cerrar la API — HECHO

`core/api/server.mjs` define `obtenerUsuarioAutenticado()` (línea 62) y
`autorizado()` (línea 93). **Ninguna de las dos se llama nunca.** Comprobado
contra producción: `POST /cuentas` devuelve 201 y `GET /cuentas` devuelve 200
sin mandar ninguna credencial.

Mientras no haya `GEMINI_API_KEY` esto cuesta poco. En el momento en que se
cargue, cualquiera con la URL puede vaciar la cuota de Gemini con un `curl` en
un `for`. Por eso este punto va **antes** que el punto 3.

### Dónde va la barrera

Entre el bloque `/auth/firebase-login` y el comentario `/* — catálogo — */`
(alrededor de la línea 290). Todo lo de arriba tiene que seguir siendo público
—la web, `/salud`, `/config/firebase` y las rutas de `/auth/`— porque es
justamente lo que necesita alguien que todavía no tiene cuenta para poder
registrarse. Todo lo de abajo toca datos de un cliente o gasta plata de API.

```js
/* — de acá para abajo hay que identificarse — */
const usuario = await obtenerUsuarioAutenticado(req)
if (!usuario) return json(res, 401, { error: 'hace falta iniciar sesión', codigo: 'sin_sesion' })
```

### Y que cada uno vea solo lo suyo

Que el pedido traiga *un* token no alcanza: hoy con el token de un cliente se
leen los datos de cualquier otro, porque el id de la cuenta va en la URL y nadie
lo compara contra quién pregunta. Dentro de `if (partes[0] === 'cuentas' && partes[1])`,
antes de cualquier `return`:

```js
if (usuario.tipo !== 'admin' && usuario.uid !== id) {
  return json(res, 403, { error: 'esa cuenta no es tuya', codigo: 'ajena' })
}
```

Y `GET /cuentas`, que lista **todas** las cuentas del sistema, solo para admin:

```js
if (m === 'GET' && url.pathname === '/cuentas') {
  if (usuario.tipo !== 'admin') return json(res, 403, { error: 'no disponible' })
  return json(res, 200, { cuentas: svc.listarCuentas() })
}
```

### Ojo con esto: rompe el botón "Probar como invitado"

`iniciarComoInvitado()` en `web/js/auth.js:137` inventa un id en el navegador
(`'inv_' + Math.random()...`) y lo manda como token. Hoy el servidor lo acepta,
pero solo por la tercera rama de `obtenerUsuarioAutenticado()`, que corre
únicamente cuando **no** hay Firebase activo. Al configurar Firebase (punto 2),
esa rama deja de correr y el invitado empieza a comer 401 en todo.

Son dos caminos y es una decisión de producto, no técnica:

- **(a)** Sacar el modo invitado. Todos se registran. Es lo más simple y lo más
  seguro, pero le pone un formulario adelante a alguien que solo quería mirar.
- **(b) — recomendado.** Que el invitado entre y pueda tocar el producto, pero
  no gastar plata. Se agrega una cuarta rama en `obtenerUsuarioAutenticado()`:

  ```js
  if (/^inv_[a-z0-9]{4,}$/.test(token)) return { tipo: 'invitado', uid: token }
  ```

  y se cierran para él las rutas que cuestan:

  ```js
  const CARAS = new Set(['temas', 'contenido', 'identidad/sugerir', 'logo', 'imagenes/banco'])
  if (usuario.tipo === 'invitado' && (CARAS.has(sub) || url.pathname === '/imagenes/buscar')) {
    return json(res, 402, { error: 'Creá tu cuenta gratis para usar esta función', codigo: 'solo_registrados' })
  }
  ```

  Recomiendo (b) porque el botón existe para bajar la fricción, y un tope que
  aparece recién cuando el visitante ya vio el producto funcionando convierte
  mejor que un registro obligatorio en la puerta.

**Lo que (b) no resuelve:** un token `inv_` es adivinable, así que cualquiera se
fabrica uno y puede renderizar placas. No gasta API, pero sí CPU de una función
de 60s. La solución de fondo es límite por IP, y queda para más adelante — no
frena el lanzamiento, pero conviene que esté anotado y no descubrirlo con la
factura.

---

## 2. Las variables de entorno

Van en **Settings > Environment Variables** del proyecto en Vercel, marcando los
tres entornos (Production, Preview, Development). No van al `.env`: ese archivo
está en `.gitignore` y el `.vercelignore` lo excluye del despliegue, así que en
producción no existe.

| Variable | De dónde sale |
|---|---|
| `FIREBASE_CLIENT_EMAIL` | Consola de Firebase > ⚙️ Configuración del proyecto > **Cuentas de servicio** > *Generar nueva clave privada*. Baja un JSON: es el campo `client_email` |
| `FIREBASE_PRIVATE_KEY` | Del mismo JSON, el campo `private_key` |
| `FIREBASE_STORAGE_BUCKET` | `tu-proyecto.appspot.com` |
| `PEXELS_API_KEY` | Ya estaba cargada en el proyecto viejo; se perdió al borrarlo |
| `UNSPLASH_ACCESS_KEY` | Ídem |
| `GEMINI_API_KEY` | aistudio.google.com/app/apikey — **cargar recién después del punto 1** |

Dos detalles que rompen esto en silencio:

- **La clave privada va tal cual sale del JSON**, con los `\n` escritos como dos
  caracteres y no como saltos de línea reales. El código los desescapa solo. Si
  se pegan como saltos reales, Firebase rechaza la credencial y Firestore queda
  apagado sin ningún error visible: `/salud` simplemente sigue diciendo
  `firebase: false`.
- **Las seis variables que ya están cargadas no sirven para esto.** `FIREBASE_API_KEY`,
  `AUTH_DOMAIN`, `APP_ID` y compañía son del **SDK Web**: las usa el navegador
  para el login. El servidor necesita las de cuenta de servicio, que son otras
  dos y se sacan de otra pantalla. Que estén las primeras no implica nada sobre
  las segundas.

Hay que **volver a desplegar** después de cargarlas: un deploy ya hecho no las toma.

---

## 3. Activar Storage en Firebase

Consola de Firebase > **Compilación > Storage > Comenzar**.

Sin esto los PNG se generan bien pero quedan en el disco temporal de la función,
que se borra entre invocaciones: el cliente genera una placa, cierra, vuelve, y
el link de descarga da 404. `/salud` lo reporta como `almacen: false`.

Es el mismo problema que ya se vio con las cuentas: en producción se crearon unas
seis y `GET /cuentas` devuelve una sola. No es un bug del código, es `/tmp`.

---

## 4. Dos líneas en `vercel.json` — HECHO

Nunca estuvieron —no las borró nadie, faltaban— y las dos son de despliegue:

```json
"functions": {
  "api/index.js": {
    "maxDuration": 60,
    "memory": 2048,
    "includeFiles": "core/**",
    "excludeFiles": "{data,placas,pruebas,content,capturas,.playwright-mcp,.claude,.vercel}/**"
  }
}
```

`memory: 2048` porque Chrome headless con el default se queda corto y falla de
manera intermitente, que es la peor forma de fallar. `excludeFiles` saca del
bundle carpetas que no tienen por qué viajar —incluidos datos de clientes en
`data/`— y baja el arranque en frío.

**No tocar `architecture`.** Vercel rechaza el deploy si aparece en este archivo:
la arquitectura se cambia desde el panel, en Settings > Functions > CPU
Architecture. Y tiene que quedar en **x86**, no ARM: `@sparticuz/chromium`
—el navegador que usa el render en serverless— solo existe compilado para x86_64.
En ARM el binario ni siquiera ejecuta y el error que da (`cannot execute binary
file`) no dice nada sobre la causa. Ya está en x86 y `/salud` lo confirma con
`arch: x64`; el punto es no volver atrás sin querer.

---

## Cómo se comprueba que quedó bien

```bash
curl https://TU-URL.vercel.app/salud
# esperado: firebase: true · almacen: true · ia: true · arch: x64

curl -s -o /dev/null -w "%{http_code}\n" https://TU-URL.vercel.app/cuentas
# esperado: 401 — si devuelve 200, el punto 1 no está hecho
```

Y la prueba que todavía no se pudo hacer nunca, que es la que realmente importa:
crear una cuenta, generar una placa, esperar a que la función se recicle (unos
minutos sin tráfico) y volver a entrar. Si la marca sigue ahí y la placa se
descarga, los puntos 2 y 3 están bien. Es lo único que distingue "anduvo cuando
lo probé" de "le va a andar a un cliente mañana".
