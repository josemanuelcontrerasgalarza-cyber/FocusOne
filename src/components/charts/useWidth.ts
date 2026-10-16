'use client'

import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Ancho real (px) de un contenedor, observado con ResizeObserver. Dibujar el
 * SVG a su tamaño real (sin escalar un viewBox) mantiene las líneas de 1px
 * nítidas y el texto a su cuerpo correcto en cualquier ancho.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width] as const
}
