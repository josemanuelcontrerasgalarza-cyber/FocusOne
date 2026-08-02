import { useEffect, useRef } from 'react'

/**
 * Muestra el tiempo restante en el título de la pestaña mientras `label` esté
 * presente, y lo restaura al valor original al apagarse o desmontar. Así el
 * usuario puede cambiar de pestaña sin perder de vista el temporizador —
 * clave para quien le cuesta mantener la atención.
 */
export function useCountdownTitle(label: string | null) {
  const original = useRef('')

  useEffect(() => {
    original.current = document.title
    return () => {
      document.title = original.current
    }
  }, [])

  useEffect(() => {
    document.title = label ?? original.current
  }, [label])
}
