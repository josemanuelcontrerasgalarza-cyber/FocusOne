'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface RingProps {
  /** Valor entre 0 y 1 */
  progress: number
  size?: number
  stroke?: number
  /** color del gradiente: de → a */
  from?: string
  to?: string
  children?: ReactNode
  className?: string
}

/**
 * Anillo de progreso circular reutilizable (SVG + gradiente animado).
 * Lo usan la Meta diaria, el temporizador y otros indicadores.
 */
export function Ring({
  progress,
  size = 120,
  stroke = 8,
  from = '#5EEAD4',
  to = '#8B5CF6',
  children,
  className = '',
}: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, progress))
  const gradId = `ring-${from}-${to}`.replace(/[^a-z0-9]/gi, '')

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  )
}
