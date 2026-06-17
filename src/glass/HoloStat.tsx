'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { GlassPanel } from './GlassPanel'
import { cn } from '@/lib/utils'

interface HoloStatProps {
  label: string
  value: string | number
  icon?: ReactNode
  accent?: 'core' | 'plasma' | 'solar' | 'nova'
  delay?: number
  sublabel?: string
}

const accentCfg = {
  core:   { text: 'text-core',      bg: 'bg-core/8',   border: 'border-core/18' },
  plasma: { text: 'text-[#c4b5fd]', bg: 'bg-plasma/8', border: 'border-plasma/18' },
  solar:  { text: 'text-solar',     bg: 'bg-solar/8',  border: 'border-solar/18' },
  nova:   { text: 'text-nova',      bg: 'bg-nova/8',   border: 'border-nova/18' },
}

export function HoloStat({ label, value, icon, accent = 'core', delay = 0, sublabel }: HoloStatProps) {
  const cfg = accentCfg[accent]
  return (
    <GlassPanel className={cn('p-4 overflow-hidden', cfg.border)} delay={delay} tilt={false}>
      <div className={cn('absolute -top-4 -right-4 h-14 w-14 rounded-full blur-2xl opacity-35', cfg.bg)} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-ink-ghost leading-tight">{label}</p>
        {icon && <span className={cn('shrink-0 mt-0.5', cfg.text)}>{icon}</span>}
      </div>
      <motion.p
        className={cn('relative mt-2.5 font-data text-3xl font-semibold leading-none', cfg.text)}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: delay + 0.1 }}
      >
        {value}
      </motion.p>
      {sublabel && <p className="mt-1.5 text-[10px] text-ink-ghost">{sublabel}</p>}
    </GlassPanel>
  )
}
