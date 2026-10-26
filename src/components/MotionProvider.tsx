'use client'

import { MotionConfig } from 'framer-motion'

/**
 * Respeta `prefers-reduced-motion` en TODAS las animaciones de framer-motion
 * (modales, toasts, paneles): con la preferencia activa se conserva el fundido
 * pero se eliminan los desplazamientos y escalados.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
