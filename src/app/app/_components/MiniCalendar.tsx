'use client'

import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Calendario del mes actual (solo lectura): resalta hoy y los días con actividad. */
export function MiniCalendar({ activeDates, delay = 0 }: { activeDates: string[]; delay?: number }) {
  const { cells, monthLabel, todayStr } = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const active = new Set(activeDates)
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // lunes = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = `${year}-${pad(month + 1)}-${pad(now.getDate())}`

    const list: { day: number | null; date?: string; active?: boolean }[] = []
    for (let i = 0; i < firstWeekday; i++) list.push({ day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${pad(month + 1)}-${pad(d)}`
      list.push({ day: d, date, active: active.has(date) })
    }
    return {
      cells: list,
      monthLabel: now.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
      todayStr: today,
    }
  }, [activeDates])

  return (
    <GlassPanel className="p-5" delay={delay} tilt={false}>
      <div className="flex items-center gap-2 text-core">
        <CalendarDays size={16} />
        <p className="font-data text-[11px] uppercase tracking-[0.25em] capitalize">{monthLabel}</p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-center font-data text-[9px] uppercase text-ink-ghost">
            {w}
          </span>
        ))}
        {cells.map((c, i) => {
          if (c.day === null) return <span key={i} />
          const isToday = c.date === todayStr
          return (
            <div
              key={i}
              className={cn(
                'flex aspect-square items-center justify-center rounded-md font-data text-[11px] transition-colors',
                isToday && 'ring-1 ring-core',
                c.active
                  ? 'bg-core/20 font-semibold text-core'
                  : isToday
                    ? 'text-core'
                    : 'text-ink-ghost',
              )}
            >
              {c.day}
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}
