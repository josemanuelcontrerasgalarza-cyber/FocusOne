'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface MiniBarDatum {
  label: string
  value: number
}

/**
 * Mini gráfico de barras reutilizable (animado). Lo usa la Productividad
 * semanal del dashboard; pensado para series cortas (7–14 puntos).
 */
export function MiniBars({
  data,
  heightClass = 'h-32',
  className = '',
}: {
  data: MiniBarDatum[]
  heightClass?: string
  className?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className={cn('flex items-end gap-1.5', heightClass, className)}>
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
          <span className="font-data text-[9px] text-ink-ghost opacity-0 transition-opacity group-hover:opacity-100">
            {d.value}
          </span>
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.03, type: 'spring', stiffness: 200, damping: 22 }}
            style={{ height: `${Math.max(4, (d.value / max) * 100)}%`, transformOrigin: 'bottom' }}
            className={cn('w-full rounded-t-md transition-all', d.value > 0 ? 'plasma-fill' : 'bg-white/5')}
          />
          <span className="font-data text-[9px] uppercase text-ink-ghost">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
