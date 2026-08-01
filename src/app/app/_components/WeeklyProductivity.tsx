'use client'

import { TrendingUp } from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'
import { MiniBars } from '@/glass/MiniBars'
import { type DayCount } from '@/types'

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export function WeeklyProductivity({ data, delay = 0 }: { data: DayCount[]; delay?: number }) {
  const total = data.reduce((acc, d) => acc + d.count, 0)
  const bars = data.map((d) => ({
    label: DAY_LABELS[new Date(d.date + 'T12:00:00').getDay()],
    value: d.count,
  }))

  return (
    <GlassPanel className="p-5" delay={delay} tilt={false}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-core">
          <TrendingUp size={16} />
          <p className="font-data text-[11px] uppercase tracking-[0.25em]">Productividad semanal</p>
        </div>
        <p className="font-data text-xs text-ink-ghost">
          {total} objetivo{total === 1 ? '' : 's'}
        </p>
      </div>
      <div className="mt-5">
        <MiniBars data={bars} />
      </div>
    </GlassPanel>
  )
}
