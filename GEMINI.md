# Community Manager para Micro Pymes (cm-pymes) — Contexto del Proyecto para Gemini

Documento de contexto integral optimizado para la memoria, instrucciones de sistema o proyectos de Google Gemini.

---

## 1. Visión General del Producto

- **Nombre del proyecto:** `cm-pymes` (versión 2.0.0).
- **Propósito:** Generador de contenido para Instagram (placas de feed, carruseles, historias, textos y guiones de video) diseñado específicamente para micro pymes y profesionales independientes.
- **Propuesta de valor:** La pyme configura su identidad de marca una sola vez (nombre, colores, rubro, ciudad, estilo tipográfico, logotipo) y genera semanalmente piezas gráficas reales (**PNGs de alta resolución**) y redactadas, listas para publicar.
- **Contra qué compite:**
  - No compite con Canva (que requiere diseñar y maquetar desde cero).
  - No compite con una agencia tradicional (que cobra honorarios inaccesibles para micro pymes).
  - **Compite contra la inacción / no publicar nada.**
- **Diferenciador clave:** Generación de **piezas gráficas reales con marca aplicada al 100%** mediante un motor de render headless (Chrome/Chromium), no simples textos ni imágenes genéricas incoherentes.

---

## 2. Arquitectura y Estructura del Código

El proyecto está desarrollado en **Node.js (v22+, ES Modules nativos)** con arquitectura modular y desacoplada:

```
├── core/                        # Núcleo de lógica de negocio (compartible e independiente de UI)
│   ├── render/                  # Motor de render: spec JSON → PNG real vía Chrome headless
│   │   ├── engine.mjs           # renderSpec(): Única función que abre y controla Puppeteer/Chromium
│   │   ├── formats.mjs          # Medidas: feed (1080×1350), story (1080×1920), cuadrado (1080×1080)
│   │   ├── disposiciones.mjs    # Composiciones tipográficas y zonas seguras (safe zones)
│   │   └── templates/           # Plantillas de diseño: flat, vector, foto
│   ├── brand/                   # Gestión matemática y gráfica de la identidad de marca
│   │   ├── color.mjs            # Espacio de color OKLCH, luminancia y contraste accesible
│   │   ├── palette.mjs          # Derivación de 16 tonos por color (hasta 3 colores por marca)
│   │   ├── fonts.mjs            # Catálogo tipográfico curado bajo licencia OFL
│   │   ├── logo.mjs             # Repositorio de isotipos vectoriales y generación SVG
│   │   ├── logotipo.mjs         # Composición de firmas: isotipo/monograma + tipografía + bajada + sello circular
│   │   └── schema.mjs           # normalizeBrand() y saneado defensivo (sanitizeLogoInner)
│   ├── content/                 # Generación y estructura del contenido
│   │   ├── plan.mjs             # Mapeo de plan de contenido editorial a specs renderizables
│   │   ├── plantillas.mjs       # Definición única de campos requeridos por plantilla (compartido con editor)
│   │   └── temas.mjs            # Sugerencias de contenido (vía Gemini AI y respaldo estático sin inventar)
│   ├── media/                   # Orquestación de recursos visuales
│   │   ├── imagenes.mjs         # Integración de bancos y uploads de usuario
│   │   └── proveedores/         # Proveedores de imágenes (Openverse, Unsplash, Pexels, Pixabay)
│   ├── quota/                   # Control de consumo: plan único, topes diarios y mensuales
│   ├── store/                   # Persistencia: JSON local (desarrollo) o Firestore (producción)
│   ├── ai/                      # Integración de Inteligencia Artificial
│   │   └── gemini.mjs           # Cliente SDK @google/genai, prompts estructurados y auditoría de costos
│   ├── api/                     # Servidor HTTP y endpoints REST
│   │   └── server.mjs           # Servidor HTTP vanilla (sin Express), monta rutas y expone /nucleo/...
│   └── service.mjs              # Fachada de casos de uso (orquesta marca, render, cuota e IA)
│
├── web/                         # Aplicación Web Frontend (Vanilla JS / CSS moderno)
│   ├── index.html               # Landing page y panel principal
│   ├── wizard.html              # Onboarding en 4 pasos (logo, color, fuente, rubro/ciudad)
│   ├── editor.html              # Editor en vivo WYSIWYG con previsualización en iframe
│   ├── logotipos.html           # Visor de firmas en tiempo real (/logotipos)
│   ├── logos-visor.html         # Catálogo interactivo de isotipos (/logos)
│   ├── css/app.css              # Sistema de diseño, tokens y estilos
│   └── js/                      # Lógica cliente (wizard.js, editor.js, color.js)
│
├── video/                       # Automatización de video y piezas audiovisuales
│   ├── render.mjs / auditar.mjs # Renderizado de animaciones, comerciales y storyboards
│   ├── musica.mjs               # Generador procedural de audio sintético WAV
│   └── GUIONES-IA.md            # Guiones y prompts para video e IA
│
├── api/                         # Adaptador Serverless para Vercel (api/index.mjs)
├── pruebas/                     # Suite de pruebas automatizadas (smoke tests, muestrarios)
├── cm.mjs                       # CLI integral para operar el sistema desde consola
└── render-placa.mjs             # CLI ligera para renderizar un spec JSON directo a PNG
```

---

## 3. Principios y Reglas de Oro de Implementación

1. **Separación de Identidad y Motor:**
   - La identidad del cliente vive exclusivamente en el objeto `brand`. Los templates y el motor de render son 100% agnósticos y multi-inquilino.
2. **Teoría del Color en OKLCH y Rotación:**
   - Una marca puede definir hasta 3 colores primarios.
   - **No se mezclan en una misma placa**: en un carrusel, la placa 1 usa el color primario, la placa 2 el secundario y la placa 3 el terciario.
   - Los colores neutros (papel, tinta, grises, bordes) se derivan siempre del color principal para mantener coherencia visual.
   - Las conversiones y contrastes se calculan con el espacio perceptualmente uniforme OKLCH.
3. **Módulos Compartidos Web/Node (`/nucleo/...`):**
   - El frontend importa módulos directamente desde `core/brand/`, `core/render/formats.mjs` y `core/content/plantillas.mjs`.
   - Estos archivos **nunca deben importar APIs nativas de Node** (`fs`, `path`, `child_process`) para garantizar ejecución pura en el navegador.
4. **Editor Superpuesto (In-Place Editing):**
   - En la vista móvil del editor, los campos de texto no van en un formulario externo: se calculan y superponen con precisión milimétrica sobre los elementos del iframe del render (`DONDE_CAE` en `editor.js`).
5. **Tipografías y Logotipos Registrables:**
   - Todas las fuentes tipográficas deben ser de código abierto con licencia **SIL Open Font License (OFL)** para garantizar uso comercial y registrabilidad por parte del cliente.
   - El logotipo no utiliza iconos genéricos de stock. Si el cliente no tiene isotipo propio, se genera un **monograma** tipográfico con sus iniciales.
   - Las fuentes caligráficas/manuscritas tienen deshabilitado el monograma (`monograma: false`) para evitar ilegibilidad a tamaños pequeños.
6. **Sello Circular en SVG:**
   - El texto en curva del sello se renderiza exclusivamente con SVG (`<textPath>`), con arcos orientados correctamente (`0,0`), y slugs únicos en `<defs>` para evitar colisiones en el DOM.
7. **Política Estricta de Imágenes:**
   - **No se inventan fotos de locales ni de productos con IA generativa.** Se usan fotografías reales subidas por el comercio o imágenes de banco (Openverse, Unsplash, Pexels, Pixabay) con licencia comercial explícita.
   - El crédito de autor se estampa automáticamente en el render solo cuando los términos del proveedor lo exigen obligatoriamente (ej. Unsplash o Creative Commons en Openverse).
8. **Seguridad y Sanitización:**
   - Todo SVG o HTML que provenga del usuario o de modelos de IA pasa obligatoriamente por `sanitizeLogoInner()` y filtros de inyección antes de entrar a Chrome.
9. **Manejo de Cuota Justa:**
   - Verificación previa antes de ejecutar llamadas a APIs externas.
   - Descuento de cuota únicamente tras una renderización exitosa.
   - La previsualización en el editor es ilimitada y gratuita; solo el renderizado definitivo a PNG descuenta cuota.
   - Planes ilimitados para administradores definidos únicamente por la variable de entorno `CUENTAS_INTERNAS`.

---

## 4. Stack Tecnológico y Dependencias

- **Runtime:** Node.js 22.x (ESM: `"type": "module"`).
- **Motor de Render:**
  - Local/Dev: `puppeteer-core` apuntando al Chrome/Chromium del sistema operativo.
  - Serverless/Producción: `@sparticuz/chromium` adaptado para entornos AWS Lambda / Vercel Serverless.
- **Inteligencia Artificial:**
  - `@google/genai` (cliente oficial de Google Gemini).
  - Modelos recomendados: `gemini-2.5-flash` o `gemini-1.5-flash`.
  - Configurable vía variable de entorno `CM_MODEL`.
- **Persistencia e Infraestructura:**
  - Firebase Authentication para gestión de sesiones y usuarios.
  - Google Cloud Firestore para almacenar metadatos de cuentas y marcas.
  - Google Cloud Storage (Firebase Storage) para almacenamiento de los archivos PNG renderizados (`FIREBASE_STORAGE_BUCKET`).
  - Despliegue en Vercel Serverless Functions.
- **Testing:**
  - Suite de pruebas de humo sin dependencias externas (`npm run prueba`).
  - Generación de muestrarios visuales (`npm run muestras`, `npm run logotipos`, `npm run muestrario`).

---

## 5. Comandos de Trabajo Habituales

```bash
# Ejecución de la aplicación web local (servidor HTTP nativo en localhost:8787)
npm run web

# Suite de pruebas de humo (validación de módulos, sintaxis, compatibilidad web)
npm run prueba

# Consola interactiva CLI
node cm.mjs ayuda

# Renderizado de prueba de los 7 templates con brand.json
npm run ejemplo

# Generación de muestras de portada
npm run muestras

# Generación y comparativa de todas las combinaciones de logotipos
npm run logotipos

# Generación del muestrario de 5 rubros comerciales distintos
npm run muestrario

# Prueba de autenticación con Firebase
npm run prueba-auth
```

---

## 6. Variables de Entorno Principales (`.env`)

- `GEMINI_API_KEY`: Clave de API de Google AI Studio (requerida para generación de planes y textos).
- `CM_MODEL`: Nombre del modelo de Gemini a utilizar (por defecto `gemini-2.5-flash`).
- `FIREBASE_PROJECT_ID`: ID del proyecto Firebase.
- `FIREBASE_CLIENT_EMAIL`: Email del service account de Firebase.
- `FIREBASE_PRIVATE_KEY`: Clave privada del service account de Firebase.
- `FIREBASE_STORAGE_BUCKET`: Bucket de almacenamiento de imágenes renderizadas.
- `CUENTAS_INTERNAS`: Lista de IDs de cuentas exentas de límites de cuota (separados por coma).
- `PORT`: Puerto HTTP del servidor local (por defecto `8787`).

---

## 7. Directrices para Asistentes y Modelos de Lenguaje

Al proponer modificaciones, depuración o nuevas funcionalidades para este proyecto:
- **Respetar la arquitectura `core/` vs `web/`**: Mantener `core/service.mjs` como el punto central de orquestación para CLI y API.
- **Preservar la compatibilidad de módulos web**: Nunca incorporar dependencias de Node.js a los archivos exportados en `MODULOS_WEB`.
- **Garantizar la calidad tipográfica y visual**: No alterar las proporciones de los formatos (`1080x1350`, `1080x1920`, `1080x1080`) ni invadir las zonas seguras de Instagram.
- **Mantener la transparencia de costos**: Toda llamada a Gemini debe estar contemplada en la matriz de costos y respetar la lógica de verificación de cuota previa.
