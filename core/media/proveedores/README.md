# Proveedores de imágenes

Cada archivo de esta carpeta adapta un banco de imágenes a una interfaz común.
El orquestador (`../imagenes.mjs`) los consulta en paralelo y mezcla resultados,
así que agregar uno nuevo no toca nada más que esta carpeta.

## La interfaz

```js
export default {
  id: 'pexels',                      // prefijo de los ids: "pexels:12345"
  nombre: 'Pexels',
  clave: 'PEXELS_API_KEY',           // variable de entorno, o null si no precisa
  atribucion: 'opcional',            // 'obligatoria' | 'opcional' | 'no'
  shareAlike: false,                 // ¿obliga a licenciar la obra derivada igual?
  disponible(),                      // boolean
  async buscar({ q, pagina, orientacion, cantidad }),  // → [Imagen]
  async resolver(idLocal),           // → { url, meta: Imagen }
  async avisarUso(imagen),           // opcional: requisito de algunos términos
}
```

`Imagen` normalizada:

```js
{
  id, proveedor, titulo, autor, autorUrl, licencia, licenciaUrl,
  fuente, origen, miniatura, urlDescarga, ancho, alto, credito
}
```

## Por qué no alcanza con "open source"

Openverse es el único que funciona sin clave y el único con licencias
verdaderamente abiertas, pero **el 90% de lo que devuelve es CC BY-SA**. Esa
licencia es ShareAlike: la obra derivada tiene que llevar la misma licencia. Una
placa promocional con el logo de un negocio encima **es** una obra derivada, así
que para el caso de uso de este producto la licencia más "abierta" es la más
problemática.

Unsplash, Pexels y Pixabay no son open source —son licencias propietarias— pero
para esto son mejores: uso comercial, modificación permitida, sin ShareAlike y
sin atribución obligatoria. El crédito lo mostramos igual porque corresponde,
pero no queda una obligación legal colgada del cliente.

| Proveedor | Clave | Calidad | Atribución | ShareAlike |
|---|---|---|---|---|
| Pexels | gratis, instantánea | muy buena | opcional | no |
| Unsplash | gratis, instantánea | muy buena | **obligatoria** por sus términos | no |
| Pixabay | gratis, instantánea | buena, mucho volumen | no | no |
| Openverse | no precisa | irregular (es un archivo, no fototeca) | obligatoria | **sí, casi siempre** |

Openverse queda como red de contención: sin ninguna clave configurada, el banco
sigue funcionando.

## Requisitos particulares que hay que respetar

- **Unsplash** exige dos cosas en sus términos de API: crédito al fotógrafo y a
  Unsplash con enlaces, y **avisar el uso** llamando a `links.download_location`
  cuando la foto se usa de verdad. Eso último está implementado en `avisarUso()`
  y se llama al guardar, no al buscar.
- **Pexels** pide mostrar que las fotos vienen de Pexels y acreditar al
  fotógrafo cuando se pueda.
- **Pixabay** no pide atribución. Igual la mostramos.
