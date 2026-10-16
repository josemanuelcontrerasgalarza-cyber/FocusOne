'use client'

import { useMemo } from 'react'
import { History } from 'lucide-react'
import { Badge, EmptyState } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { formatMinutes, relativeDayLabel, toDateKey } from '@/lib/kairo/dates'
import { sessionMinutes } from '@/lib/kairo/stats'

const pad = (n: number) => String(n).padStart(2, '0')

/** Últimas sesiones reales (más recientes primero). */
export function SessionHistory() {
  const sessions = useWorkspace((s) => s.sessions)
  const tasks = useWorkspace((s) => s.tasks)

  const rows = useMemo(() => {
    const titles = new Map(tasks.map((t) => [t.id, t.title]))
    const today = toDateKey(new Date())
    return [...sessions]
      // Fuera las descartadas (cerradas con 0 s y sin completar).
      .filter((s) => !(s.ended_at && !s.completed && (s.actual_seconds ?? 0) <= 0))
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, 10)
      .map((s) => {
        const d = new Date(s.started_at)
        return {
          id: s.id,
          title: (s.task_id && titles.get(s.task_id)) || s.label || 'Sesión libre',
          day: relativeDayLabel(toDateKey(d), today),
          time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
          minutes: sessionMinutes(s),
          // Sin cerrar y reciente → en curso; si es antigua, se quedó a medias.
          running: !s.ended_at && Date.now() - d.getTime() < 6 * 3600_000,
          completed: s.completed,
        }
      })
  }, [sessions, tasks])

  return (
    <section aria-labelledby="history-title" className="mx-auto w-full max-w-xl">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="history-title" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Sesiones recientes
        </h2>
        <p className="text-xs text-ink-faint">Tiempo real enfocado</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            compact
            icon={<History size={16} />}
            title="Aún no hay sesiones"
            description="Cuando termines tu primer bloque de enfoque, aparecerá aquí con su tiempo real."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-16 shrink-0 text-left">
                <p className="text-xs text-ink-dim">{r.day}</p>
                <p className="font-mono text-[11px] text-ink-faint">{r.time}</p>
              </div>
              <p className="min-w-0 flex-1 truncate text-[14px] text-ink">{r.title}</p>
              <span className="shrink-0 font-mono text-[13px] text-ink-dim">
                {r.running ? '—' : r.minutes > 0 && r.minutes < 1 ? '<1 min' : formatMinutes(r.minutes)}
              </span>
              {r.running ? (
                <Badge tone="accent">En curso</Badge>
              ) : r.completed ? (
                <Badge tone="success">Completa</Badge>
              ) : (
                <Badge>Parcial</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
