'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PlasmaBarProps {
  value: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function PlasmaBar({ value, className = '', showLabel = false, size = 'md' }: PlasmaBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('relative', className)}>
      <div className={cn('overflow-hidden rounded-full bg-white/[0.06]', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <motion.div
          className="plasma-fill h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 20, mass: 1.4 }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-right font-data text-[10px] text-ink-ghost">{clamped}%</p>
      )}
    </div>
  )
}
