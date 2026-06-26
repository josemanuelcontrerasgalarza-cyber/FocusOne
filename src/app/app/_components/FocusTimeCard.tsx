'use client'

import { motion } from 'framer-motion'
import { Timer } from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'

function fmt(m: number) {
  if (m <= 0) return '0m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`
}

export function FocusTimeCard({
  todayMinutes,
  weekMinutes,
  delay = 0,
}: {
  todayMinutes: number
  weekMinutes: number
  delay?: number
}) {
  return (
    <GlassPanel className="relative overflow-hidden p-5 card-accent-plasma" delay={delay} tilt={false}>
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-plasma/15 blur-2xl" />
      <div className="relative flex items-center gap-2 text-[#c4b5fd]">
        <Timer size={16} />
        <p className="font-data text-[11px] uppercase tracking-[0.25em]">Tiempo enfocado</p>
      </div>
      <motion.p
        className="relative mt-4 font-data text-4xl font-semibold leading-none text-ink"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: delay + 0.1 }}
      >
        {fmt(todayMinutes)}
      </motion.p>
      <p className="relative mt-1 text-xs text-ink-ghost">hoy</p>
      <div className="relative mt-4 border-t border-glass-border pt-3">
        <p className="font-data text-sm text-ink-dim">
          <span className="text-[#c4b5fd]">{fmt(weekMinutes)}</span> esta semana
        </p>
      </div>
    </GlassPanel>
  )
}
