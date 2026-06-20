'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CalendarClock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'
import { type AgendaTask } from '@/types'
import { dueLabel, dueToneBadge } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface Props {
  items: AgendaTask[]
  onComplete: (taskId: string, projectId: string) => void
  delay?: number
}

export function Agenda({ items, onComplete, delay = 0 }: Props) {
  if (items.length === 0) return null

  const overdueCount = items.filter((t) => t.due_date && dueLabel(t.due_date).tone === 'overdue').length

  return (
    <GlassPanel className="p-5" delay={delay} tilt={false}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-core">
          <CalendarClock size={16} />
          <p className="font-data text-[11px] uppercase tracking-[0.25em]">Agenda</p>
        </div>
        {overdueCount > 0 && (
          <span className="flex items-center gap-1 font-data text-[10px] uppercase tracking-wider text-nova">
            <AlertTriangle size={11} /> {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const label = t.due_date ? dueLabel(t.due_date) : null
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 rounded-xl border border-glass-border bg-black/20 px-3 py-2.5"
              >
                <button
                  onClick={() => onComplete(t.id, t.project_id)}
                  className="group flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-core/50 transition-all hover:border-core hover:bg-core/20 hover:shadow-glow-core"
                  title="Completar"
                >
                  <CheckCircle2 size={11} className="text-core opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.title}</p>
                  {t.project_name && (
                    <p className="truncate font-data text-[10px] uppercase tracking-wider text-ink-ghost">
                      {t.project_name}
                    </p>
                  )}
                </div>
                {label && <span className={cn(dueToneBadge[label.tone], 'shrink-0')}>{label.text}</span>}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </GlassPanel>
  )
}
