'use client'

import { CheckCircle2, Lightbulb, Timer, History } from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'
import { type ActivityItem } from '@/types'

const KIND_CFG = {
  task: { icon: CheckCircle2, color: 'text-core', bg: 'bg-core/10' },
  focus: { icon: Timer, color: 'text-[#c4b5fd]', bg: 'bg-plasma/10' },
  idea: { icon: Lightbulb, color: 'text-solar', bg: 'bg-solar/10' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'ayer' : `hace ${days} d`
}

export function ActivityFeed({ items, delay = 0 }: { items: ActivityItem[]; delay?: number }) {
  return (
    <GlassPanel className="p-5" delay={delay} tilt={false}>
      <div className="flex items-center gap-2 text-ink-dim">
        <History size={15} />
        <p className="font-data text-[11px] uppercase tracking-[0.25em] text-ink-ghost">
          Actividad reciente
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-glass-border bg-black/20 px-4 py-5 text-center text-sm text-ink-ghost">
          Sin actividad todavía. Completa un objetivo o una sesión de foco.
        </p>
      ) : (
        <div className="mt-3 flex flex-col">
          {items.map((it) => {
            const cfg = KIND_CFG[it.kind]
            const Icon = cfg.icon
            return (
              <div
                key={`${it.kind}-${it.id}`}
                className="flex items-center gap-3 border-b border-glass-border py-2.5 last:border-0"
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.color}`}>
                  <Icon size={14} />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-ink-dim">{it.title}</p>
                <span className="shrink-0 font-data text-[10px] text-ink-ghost">{relativeTime(it.at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </GlassPanel>
  )
}
