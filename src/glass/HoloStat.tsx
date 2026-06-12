'use client'

import { type ReactNode } from 'react'
import { GlassPanel } from './GlassPanel'

interface HoloStatProps {
  label: string
  value: string | number
  icon?: ReactNode
  accent?: 'core' | 'plasma' | 'solar'
  delay?: number
}

const accents = {
  core: 'text-core',
  plasma: 'text-[#c4b5fd]',
  solar: 'text-solar',
}

export function HoloStat({ label, value, icon, accent = 'core', delay = 0 }: HoloStatProps) {
  return (
    <GlassPanel className="p-4" delay={delay}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-ghost">{label}</p>
        {icon && <span className={accents[accent]}>{icon}</span>}
      </div>
      <p className={`mt-2 font-data text-3xl font-semibold ${accents[accent]}`}>{value}</p>
    </GlassPanel>
  )
}
