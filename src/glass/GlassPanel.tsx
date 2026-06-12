'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  tilt?: boolean
  onClick?: () => void
  delay?: number
}

export function GlassPanel({ children, className, tilt = true, onClick, delay = 0 }: GlassPanelProps) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rx = useSpring(useTransform(my, [0, 1], [3, -3]), { stiffness: 300, damping: 30 })
  const ry = useSpring(useTransform(mx, [0, 1], [-3, 3]), { stiffness: 300, damping: 30 })
  const lightX = useTransform(mx, (v) => `${v * 100}%`)
  const lightY = useTransform(my, (v) => `${v * 100}%`)

  return (
    <motion.div
      className={cn('glass-panel relative overflow-hidden', onClick && 'cursor-pointer', className)}
      style={tilt ? { rotateX: rx, rotateY: ry, transformPerspective: 1100 } : undefined}
      onPointerMove={
        tilt
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect()
              mx.set((e.clientX - r.left) / r.width)
              my.set((e.clientY - r.top) / r.height)
            }
          : undefined
      }
      onPointerLeave={
        tilt
          ? () => {
              mx.set(0.5)
              my.set(0.5)
            }
          : undefined
      }
      onClick={onClick}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 26, mass: 1, delay }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-60"
        style={
          {
            background:
              'radial-gradient(420px circle at var(--lx) var(--ly), rgba(140,160,255,.10), transparent 65%)',
            '--lx': lightX,
            '--ly': lightY,
          } as React.CSSProperties
        }
      />
      <div className="relative">{children}</div>
    </motion.div>
  )
}
