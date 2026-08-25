// Formatos de salida. El motor no sabe de tamaños: los saca de acá.
//
// Instagram usa tres lienzos y cada uno tiene su zona segura: en story, los
// primeros ~250px de arriba se los come el header de la app y los últimos
// ~340px la caja de respuesta. Por eso story no es "feed más alto": tiene su
// propio padding y su propia escala tipográfica.

export const FORMATS = {
  feed: {
    id: 'feed',
    label: 'Feed / carrusel',
    w: 1080,
    h: 1350,
    // flat
    pad: '96px 88px 84px',
    title: 76,
    titleBig: 92,
    body: 34,
    contentTop: 0,
    // vector
    vectorPadTop: 250,
    vectorHeadline: 112,
    vectorFootBottom: 60,
    sceneH: 640,
    // foto
    fotoHeadlineBottom: 200,
    fotoFooterBottom: 88,
    fotoHeadline: 96,
  },
  story: {
    id: 'story',
    label: 'Historia / portada de reel',
    w: 1080,
    h: 1920,
    pad: '270px 88px 330px',
    title: 88,
    titleBig: 104,
    body: 38,
    contentTop: 0,
    vectorPadTop: 620,
    vectorHeadline: 124,
    vectorFootBottom: 320,
    sceneH: 760,
    fotoHeadlineBottom: 470,
    fotoFooterBottom: 340,
    fotoHeadline: 104,
  },
  cuadrado: {
    id: 'cuadrado',
    label: 'Post cuadrado',
    w: 1080,
    h: 1080,
    pad: '84px 80px 76px',
    title: 68,
    titleBig: 82,
    body: 32,
    contentTop: 0,
    vectorPadTop: 180,
    vectorHeadline: 96,
    vectorFootBottom: 56,
    sceneH: 520,
    fotoHeadlineBottom: 180,
    fotoFooterBottom: 80,
    fotoHeadline: 84,
  },
}

export const DEFAULT_FORMAT = 'feed'

export function resolveFormat(name) {
  const f = FORMATS[name || DEFAULT_FORMAT]
  if (!f) {
    throw new Error(
      `formato desconocido: "${name}". Disponibles: ${Object.keys(FORMATS).join(', ')}`
    )
  }
  return f
}
