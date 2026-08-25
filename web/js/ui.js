// Helpers de DOM. Cuarenta líneas en vez de un framework: la aplicación tiene
// cinco pantallas y ninguna necesita un árbol virtual.

export function el(tag, props = {}, ...hijos) {
  const [nombre, ...clases] = tag.split('.')
  const n = document.createElement(nombre || 'div')
  if (clases.length) n.className = clases.join(' ')

  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue
    if (k === 'class') n.className = (n.className + ' ' + v).trim()
    else if (k === 'html') n.innerHTML = v
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v)
    else if (k === 'dataset') Object.assign(n.dataset, v)
    else if (k in n && k !== 'list') n[k] = v
    else n.setAttribute(k, v)
  }

  for (const h of hijos.flat(3)) {
    if (h == null || h === false) continue
    n.append(h instanceof Node ? h : document.createTextNode(String(h)))
  }
  return n
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel)
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)]

export function vaciar(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild)
  return nodo
}

export function aviso(texto, tipo = '') {
  return el(`div.aviso${tipo ? '.' + tipo : ''}`, {}, texto)
}

/** Marca un botón como elegido dentro de su grupo. */
export function elegirEnGrupo(contenedor, boton, clase = 'elegida') {
  $$(`.${clase}`, contenedor).forEach(b => b.classList.remove(clase))
  boton?.classList.add(clase)
}

/** Espera a que dejen de llamar durante `ms` antes de ejecutar. */
export function demorar(fn, ms = 380) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export function svgLogo(logo, tam = 60) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', logo.viewBox)
  s.setAttribute('width', tam)
  s.setAttribute('height', tam)
  s.innerHTML = logo.inner
  for (const p of s.querySelectorAll('path')) {
    p.setAttribute('fill', 'none')
    p.setAttribute('stroke', 'currentColor')
    p.setAttribute('stroke-width', logo.strokeWidth)
    p.setAttribute('stroke-linecap', 'round')
    p.setAttribute('stroke-linejoin', 'round')
  }
  for (const c of s.querySelectorAll('circle')) c.setAttribute('fill', 'currentColor')
  return s
}
