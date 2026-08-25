---
name: placa
user_invocable: true
description: >
  Genera placas e imágenes de carrusel para Instagram 100% on-brand, renderizando PNG reales de 1080×1350 con el motor render-placa.mjs — no descripciones, no prompts de imagen. La identidad (colores, fuentes, logo, wordmark, handle) sale de brand.json. Usar siempre que el usuario diga "placa", "hacé una placa", "carrusel", "generá placas", "contenido para instagram", "posteo", o invoque /placa.
---

# Generador de placas para Instagram

Genera placas y carruseles renderizando **PNG reales**, no descripciones ni prompts para otra herramienta. El resultado son archivos en disco listos para subir.

## Antes de empezar: leé la marca

1. **`brand.json`** (en la raíz del proyecto) — es la fuente de verdad de la identidad: colores, fuentes, logo, wordmark, handle, sitio. **Nunca inventes una paleta, fuente ni logo distintos.** Si algo no está en `brand.json`, no lo uses.
2. **El archivo de voz** que indica `brand.voiceFile` (por defecto `content/voice.md`) — leelo antes de escribir copy. Si no existe, **pedile el copy al usuario** en vez de inventar un tono.

## Formato

- **Tamaño:** lo define el campo `format` de cada placa (o el del spec, para todas). Si no se dice nada, es `feed`.

| `format` | Medidas | Para qué |
|---|---|---|
| `feed` | 1080×1350 | Posteo y carrusel. El default. |
| `story` | 1080×1920 | Historia y portada de reel. Respeta las zonas seguras de Instagram y apoya el contenido abajo. |
| `cuadrado` | 1080×1080 | Cuando el perfil se ve como grilla. |

Preguntá el formato solo si el usuario no lo dijo y no se deduce del pedido ("una historia" → `story`).

- **Resaltes:** 1-2 palabras por título, no frases enteras. `<span class="acc">palabra</span>` en flat, `<em>palabra</em>` en vector.
- **Negrita** en cuerpo con `<b>`.
- **Carruseles:** poné `idx` tipo `"01/05"` en cada placa.
- Si la placa afirma un dato duro, **citá la fuente** en el campo `fuente`.

## Tres estilos

- **`flat`** — fondo claro, sans, logo. Para contenido informativo: datos, listas, pasos, producto.
- **`vector`** — fondo de color sólido, headline en serif con itálicas de acento, ilustración de fondo opcional (`brand.scene`). Para frases aspiracionales.
- **`foto`** — foto de fondo con scrim oscuro, frase en dos líneas (una blanca, una de acento). Para hot takes y opiniones sobre una imagen potente. **Requiere que el usuario dé la ruta de una foto.**

## Templates de `flat` (campo `type`)

| `type` | Para qué | Campos |
|---|---|---|
| `cover` | Portada de carrusel (fondo oscuro) | `kick`, `title`, `body`, `src?`, `hint?`, `idx?` |
| `body` | Kicker + título + párrafo | `kick`, `title`, `body`, `fuente?`, `theme?` (`light`/`trial`/`dark`), `idx?` |
| `steps` | Pasos numerados | `kick`, `title`, `steps:[{n,k,t,d}]`, `idx?` |
| `pista` | Emoji + badge + título + chips | `emoji`, `kick`, `title`, `body`, `chips:[]`, `idx?` |
| `trial` | Pill + título + body (fondo tinte) | `pill`, `title`, `body` |
| `biblio` | Referencias numeradas (fondo oscuro) | `refs:[]`, `title?`, `kick?`, `idx?` |

**`vector`:** `eyebrow`, `headline` (con `<em>…</em>`), `handle?`, `site?`
**`foto`:** `photo` (ruta, **obligatoria**), `kick?`, `eyebrow?`, `line1`, `line2?`, `src?`, `objectPos?` (ej `"50% 38%"`), `scale?` (ej `1.18`)

## Workflow

### 1 — Preguntar (con AskUserQuestion, no como texto)

Combiná en 1-2 llamadas:
1. ¿Placa única o carrusel? Si carrusel, cuántas.
2. ¿Qué estilo? `flat` · `vector` · `foto`. En un carrusel se pueden mezclar.
3. Si `foto`: **pedí la ruta del archivo**. Si `flat`: preguntá el `type`.
4. Tema o copy exacto.

**Preguntá solo lo que no esté definido.** Si el usuario ya dijo "carrusel de 3 flat sobre X", no repreguntes eso: preguntá lo que falta. Si dice "vos decidí", aplicá defaults sensatos y avanzá sin bloquear.

### 2 — Escribir el copy y armar el spec

Redactá en la voz del `voiceFile`. Máximo ~40 palabras de cuerpo por placa — la placa se lee en 2 segundos.

```json
{
  "outDir": "placas/<YYYY-MM-DD>",
  "slides": [
    { "name": "01-cover", "style": "flat", "type": "cover", "format": "feed", "kick": "...", "title": "...", "body": "...", "idx": "01/03" }
  ]
}
```

`outDir` puede ser relativo (se resuelve desde donde corrés el comando). Nombres de archivo con prefijo numérico para que el orden del carrusel quede claro.

### 3 — Renderizar

```bash
node render-placa.mjs spec.json
# con otra marca:
node render-placa.mjs spec.json --brand=otra-marca.json
```

### 4 — Entregar

Listá los archivos generados con su ruta. Ofrecé abrir la carpeta (`!open <carpeta>`) y escribir los captions en la voz de marca.

## Reglas

- El motor (`render-placa.mjs`) es la fuente de verdad del render. **No lo edites para una placa puntual** — pasale el spec. Si hace falta un cambio de diseño real, primero decilo y explicá qué se rompe.
- La identidad va en `brand.json`, no en el código ni en el spec.
- Si falta el copy y hay `voiceFile`, escribilo vos. **Nunca entregues placeholders** tipo "Lorem" o "TÍTULO ACÁ".
- Si el usuario pide un estilo que no existe, decilo y ofrecé el más cercano de los tres.
