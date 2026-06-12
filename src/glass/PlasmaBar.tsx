'use client'

import { motion } from 'framer-motion'

export function PlasmaBar({ value, className = '' }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={`relative h-2.5 overflow-hidden rounded-full bg-white/5 ${className}`}>
      <motion.div
        className="plasma-fill h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 90, damping: 20, mass: 1.4 }}
      />
    </div>
  )
}
