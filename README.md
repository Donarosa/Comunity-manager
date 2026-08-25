# Community manager para micro pymes

Una pyme carga su marca una vez y recibe el contenido de Instagram ya hecho:
placas de feed, carruseles e historias, con sus colores, su tipografía y su
logo. Los PNG son **reales** —salen de Chrome headless a 2160×2700— no
descripciones ni prompts para otra herramienta.

- **Qué es y por qué cada decisión** → [`PRODUCTO.md`](PRODUCTO.md)
- **Cómo se trabaja el código** → [`CLAUDE.md`](CLAUDE.md)

```
core/            el núcleo: render · marca · contenido · imágenes · cuotas · API
web/             la aplicación: landing, wizard de alta y editor de placas
cm.mjs           el producto por CLI
render-placa.mjs el motor solo, con brand.json (compatibilidad)
pruebas/         pruebas de humo, sin gastar API
data/            cuentas, marcas y piezas de los clientes (no se versiona)
```

---

## Arrancar

```bash
npm install
npm run prueba     # verifica render, paleta, cuotas y saneado de logo
npm run web        # la aplicación en http://localhost:8787
```

Necesita **Chrome, Chromium o Edge** instalado. El motor los busca en las rutas
habituales de macOS, Linux y Windows; si no lo encuentra:

```bash
CHROME="/ruta/a/chrome" npm run prueba
```

Para las funciones con IA (contenido y logo), exportá la credencial:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Todo lo demás funciona sin credencial.

---

## La aplicación

`npm run web` levanta todo en `http://localhost:8787`: la landing, el alta y el
editor.

**El alta, en cuatro pasos.** Contás qué hace el negocio; decís qué tenés ya
armado —se pregunta por separado por el logo, el color y la tipografía, porque
casi ningún negocio chico tiene las tres y casi todos tienen alguna—; cargás lo
tuyo y lo que falte lo propone la plataforma; y terminás viendo una placa de
verdad con tu marca puesta.

**El selector de color resuelve el problema del lila.** Alguien dice "mi color
es lila" y hay doscientos lilas. Primero elegís la familia, y recién ahí ves los
lilas que existen en una matriz: hacia la derecha más claro, hacia abajo más
vivo. Los tonos se generan en OKLCH con el mismo módulo que usa el render, así
que el paso de una fila a otra se ve parejo. Las otras dos pestañas son para
quien tiene el código exacto y para tomar los colores del SVG que subió.

**El editor previsualiza en vivo sin gastar cuota.** La vista previa es un
iframe con el HTML que devuelve el motor, achicado por CSS: misma hoja de
estilos, mismas fuentes, cero desincronización con el PNG final. Escribir es
gratis; solo se descuenta al bajar.

**Las imágenes son propias o de banco.** Se puede subir una foto o buscar en
cuatro bancos a la vez (Pexels, Unsplash, Pixabay y Openverse), con los
resultados intercalados. El crédito se arma solo y se coloca al pie de la placa.
**No se generan imágenes**, a propósito.

Solo Openverse funciona sin configurar nada, y es el peor de los cuatro: es un
archivo de material Creative Commons agregado de Flickr y Wikimedia, no una
fototeca curada, y **cerca del 90% de lo que devuelve es CC BY-SA** — una
licencia ShareAlike que obliga a publicar la obra derivada bajo los mismos
términos. Una placa promocional con el logo de un negocio encima *es* una obra
derivada, así que la licencia más abierta resulta la más incómoda para este uso.
Cuando el usuario elige una de esas fotos, la interfaz se lo advierte.

Las claves de Pexels, Unsplash y Pixabay son gratuitas e instantáneas, y sus
licencias son mejores para esto: uso comercial, modificación permitida, sin
ShareAlike y sin atribución obligatoria. Con cualquiera de las tres conectada, la
calidad da un salto. El detalle está en
[`core/media/proveedores/README.md`](core/media/proveedores/README.md).

**El tablero muestra cuánto viene generando el cliente.** Placas hechas y su
equivalente en plata a precio de diseñador, con el precio de referencia impreso
al lado del número. Por defecto dice "equivalen a" y no "ahorraste": a 120 placas
por mes el segundo texto daría US$480, un número que una panadería no se cree —
y una cifra que no se cree hace dudar de todo lo demás en pantalla.

Sin ninguna clave funciona todo menos la sugerencia de identidad, y el banco de
imágenes queda limitado a Openverse. Al arrancar, el servidor imprime qué bancos
tenés conectados y dónde sacar las claves que falten.

### Configuración

Copiá la plantilla una vez y completá lo que uses. Los comandos la leen solos;
si el archivo no existe, arrancan igual.

```bash
cp .env.ejemplo .env
npm run web
```

| Variable | Para qué | Por defecto |
|---|---|---|
| `ANTHROPIC_API_KEY` | Plan de contenido y sugerencia de identidad | — |
| `PEXELS_API_KEY` | Banco de fotos ([alta gratis](https://www.pexels.com/api/)) | — |
| `UNSPLASH_ACCESS_KEY` | Banco de fotos ([alta gratis](https://unsplash.com/developers)) | — |
| `PIXABAY_API_KEY` | Banco de fotos ([alta gratis](https://pixabay.com/api/docs/)) | — |
| `OPENVERSE_TOKEN` | Sube el cupo de Openverse (funciona sin él) | — |
| `CM_MODEL` | Modelo de Claude | `claude-opus-5` |
| `CM_PORT` · `CM_HOST` · `CM_TOKEN` | Dónde escucha y con qué auth | `8787` · `127.0.0.1` · sin token |
| `CM_PRECIO_PLACA` · `CM_SIMBOLO` · `CM_MONEDA` | Precio de referencia del tablero | `4` · `US$` · `USD` |
| `CM_MODO_VALOR` | `equivalencia` o `ahorro` | `equivalencia` |
| `CM_FUENTE_PRECIO` | La frase que justifica ese precio | «lo que cobra un diseñador por una placa suelta» |
| `CM_DATA` · `CM_TZ` | Dónde viven los datos · zona para el corte diario | `data/` · `America/Argentina/Buenos_Aires` |

Para mostrarlo en pesos y con el texto de ahorro, en el `.env`:

```
CM_MODO_VALOR=ahorro
CM_PRECIO_PLACA=6000
CM_SIMBOLO=$
CM_MONEDA=ARS
CM_FUENTE_PRECIO=lo que cobra un diseñador freelance por placa
# → "$558.000 ahorrados desde que empezaste · a $6.000 la placa"
```

---

## Un cliente de punta a punta

```bash
# 1. Cuenta
node cm.mjs alta --nombre="Panadería Mendieta" --email=hola@mendieta.ar
#    → devuelve el id de cuenta

# 2. Marca: un color y algo de contexto. La paleta de 16 colores se deriva sola.
node cm.mjs marca <id> \
  --nombre="Panadería Mendieta" --color="#8C1D2F" --tipografia=calido \
  --handle=panaderiamendieta --rubro="panadería de barrio" --ciudad="Rosario" \
  --publico="vecinos del barrio, familias" \
  --queVende="pan de masa madre, facturas, tortas por encargo" \
  --diferencial="masa madre propia, todo sale del horno a las 7"

# 3. Logo, si no tiene: 3 propuestas en SVG con placa de muestra
node cm.mjs logo <id>
node cm.mjs logo:elegir <id> opcion-2
#    Si ya tiene logo:
node cm.mjs logo:subir <id> --svg=logo.svg

# 4. El contenido de la semana, renderizado
node cm.mjs contenido <id> --posteos=3 --historias=2

# 5. O una placa con texto propio, sin IA
node cm.mjs placa <id> --json=placas.json --canal=historia
```

`node cm.mjs ayuda` lista todo. `node cm.mjs catalogo` muestra tipografías,
formatos y los límites del plan.

---

## API HTTP

```bash
npm run api                                  # localhost:8787
CM_TOKEN=secreto CM_HOST=0.0.0.0 npm run api # expuesta, con auth
```

Sin `CM_TOKEN` solo acepta conexiones locales: es más fácil olvidarse de poner
el token que acordarse, y una API sin auth escuchando afuera gasta la cuenta de
API de otro.

| Ruta | Qué hace |
|---|---|
| `GET /salud` | Chequeo, sin auth |
| `GET /catalogo` | Tipografías, formatos y planes |
| `POST /cuentas` · `GET /cuentas/:id` | Alta y estado de cuota |
| `POST /cuentas/:id/marca` | Carga o actualiza la marca (acepta datos parciales) |
| `POST /cuentas/:id/identidad/sugerir` · `/adoptar` | 4 logos + 3 colores + tipografía, en una llamada |
| `POST /cuentas/:id/logo` | 3 propuestas de isotipo, con placa de muestra |
| `POST /cuentas/:id/logo/elegir` · `/logo/subir` | Adoptar una propuesta o subir el propio |
| `POST /cuentas/:id/previsualizar` | HTML de una placa, sin Chrome y sin cuota |
| `POST /cuentas/:id/contenido` | Plan de contenido renderizado |
| `POST /cuentas/:id/placa` | Placa con texto propio |
| `GET /imagenes/buscar?q=` | Banco abierto, solo licencias comerciales y modificables |
| `POST /cuentas/:id/imagenes/banco` · `/subir` | Guarda la imagen elegida en la cuenta |
| `GET /piezas/:cuenta/:carpeta/:archivo` | Sirve los PNG |

Una cuota agotada devuelve `429` con cuánto queda y cuándo se renueva.

---

## Formatos y estilos

| `format` | Medidas | Para qué |
|---|---|---|
| `feed` | 1080×1350 | Posteo y carrusel |
| `story` | 1080×1920 | Historia y portada de reel |
| `cuadrado` | 1080×1080 | Perfil en grilla |

| `disposicion` | Cómo se acomoda el texto |
|---|---|
| `clasica` | Izquierda, centrado en la placa. La más neutra |
| `titular` | Título enorme, párrafo chico al pie |
| `centrada` | Todo al centro, título entre dos líneas |
| `bloque` | Volanta en recuadro de color, cuerpo justificado |
| `ficha` | Título chico sobre una línea, párrafo protagonista |

| `style` | Cómo se ve |
|---|---|
| `flat` | Fondo claro, sans, logo arriba. Tipos: `cover`, `body`, `steps`, `pista`, `trial`, `biblio` |
| `vector` | Color pleno, headline serif con itálicas de acento |
| `foto` | Foto del cliente con velo teñido con su color de marca |

---

## El motor solo

Si lo único que querés es renderizar un spec con un `brand.json` a mano —el uso
original, y lo que usa el skill `/placa`— sigue funcionando igual:

```bash
node render-placa.mjs spec-ejemplo.json && open placas/ejemplo
node render-placa.mjs spec.json --brand=otra-marca.json
```

`spec-ejemplo.json` tiene los 7 templates, cada uno explicando para qué sirve.
Es la forma más rápida de ver el efecto de un cambio en un `brand.json`.
