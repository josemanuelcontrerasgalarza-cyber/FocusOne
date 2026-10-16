'use client'

import type { ReactNode } from 'react'
import { MotionConfig, motion } from 'framer-motion'

/**
 * Aparición suave al entrar en pantalla (una sola vez). Con
 * `prefers-reduced-motion`, MotionConfig anula el desplazamiento y queda solo
 * un fundido breve. Mismo marcado en servidor y cliente (sin desajustes).
 */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -60px 0px' }}
        transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  )
}
