'use client'

import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { EmptyState } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { colorHex } from '@/lib/colors'
import { achievedResult, isoToKey, longDate } from './format'

/** Historial de objetivos cumplidos, del más reciente al más antiguo. */
export function GoalHistory() {
  const { goals, tasks } = useWorkspace()
  const done = useMemo(
    () =>
      goals
        .filter((g) => g.achieved_at && g.status !== 'active')
        .sort((a, b) => (b.achieved_at as string).localeCompare(a.achieved_at as string)),
    [goals],
  )

  return (
    <section aria-labelledby="historial-title" className="rounded-card border border-line bg-surface">
      <div className="flex items-end justify-between gap-2 px-4 pt-4 sm:px-5">
        <div>
          <p className="k-eyebrow mb-0.5">Logros</p>
          <h2 id="historial-title" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Historial
          </h2>
        </div>
        {done.length > 0 && <p className="font-mono text-xs text-ink-faint">{done.length} cumplidos</p>}
      </div>
      {done.length ? (
        <ol className="max-h-[340px] overflow-y-auto px-2 py-2 sm:px-3">
          {done.map((g) => {
            const key = isoToKey(g.achieved_at as string)
            const result = achievedResult(g, tasks)
            return (
              <li key={g.id} className="flex items-baseline gap-3 rounded-control px-2 py-2">
                <time dateTime={key} className="w-[88px] shrink-0 font-mono text-xs text-ink-faint">
                  {longDate(key)}
                </time>
                <span aria-hidden className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: colorHex(g.color) }} />
                <span className="min-w-0 flex-1 text-[14px] text-ink">
                  {g.title}
                  {result && <span className="ml-1.5 text-xs text-ink-faint">· {result}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyState
          compact
          icon={<Trophy size={18} />}
          title="Tus logros aparecerán aquí"
          description="Cada objetivo que cumplas quedará registrado con su fecha."
        />
      )}
    </section>
  )
}
