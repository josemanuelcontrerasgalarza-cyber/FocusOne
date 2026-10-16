'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CalendarCheck, Check, ExternalLink } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Badge } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { toast } from '@/lib/toast'
import { formatMinutes, toDateKey } from '@/lib/kairo/dates'
import type { Plan } from '@/lib/ai/types'
import { SourceTag } from './SourceTag'

/**
 * Plan del día como checklist revisable. Solo los bloques con una tarea REAL
 * (abierta) se pueden programar, y solo los que el usuario deja marcados.
 */
export function PlanCard({
  plan,
  source,
  appliedIds,
  onApplied,
}: {
  plan: Plan
  source: 'ai' | 'local'
  appliedIds?: string[]
  onApplied: (ids: string[]) => void
}) {
  const tasks = useWorkspace((s) => s.tasks)
  const updateTask = useWorkspace((s) => s.updateTask)
  const openTask = useUI((s) => s.openTask)
  const today = toDateKey(new Date())

  const rows = useMemo(
    () =>
      plan.blocks.map((b, i) => {
        const task = b.taskId ? tasks.find((t) => t.id === b.taskId) : undefined
        const schedulable = Boolean(task && task.status !== 'completed')
        return { key: `${i}-${b.taskId ?? 'free'}`, block: b, task, schedulable, isToday: task?.due_date === today }
      }),
    [plan.blocks, tasks, today],
  )

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.filter((r) => r.schedulable && !r.isToday).map((r) => r.block.taskId as string)),
  )
  const [busy, setBusy] = useState(false)
  const applied = Boolean(appliedIds)
  const total = plan.blocks.reduce((a, b) => a + b.minutes, 0)
  const toApply = rows.filter((r) => r.schedulable && selected.has(r.block.taskId as string) && !r.isToday)

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  async function apply() {
    if (!toApply.length) return
    setBusy(true)
    const ids = toApply.map((r) => r.block.taskId as string)
    for (const id of ids) await updateTask(id, { due_date: today })
    setBusy(false)
    onApplied(ids)
    toast.success(ids.length === 1 ? '1 tarea programada para hoy' : `${ids.length} tareas programadas para hoy`)
  }

  return (
    <div className="space-y-3">
      <SourceTag source={source} />
      {plan.summary && <p className="text-[14px] leading-relaxed text-ink">{plan.summary}</p>}

      {plan.blocks.length > 0 && (
        <>
          <ol className="divide-y divide-line overflow-hidden rounded-control border border-line bg-raised">
            {rows.map((r, i) => {
              const id = r.block.taskId
              const inputId = `plan-${r.key}`
              return (
                <li key={r.key} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-xs text-ink-faint">{i + 1}</span>
                  {r.schedulable ? (
                    <input
                      id={inputId}
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent-fg disabled:cursor-default"
                      checked={applied ? appliedIds!.includes(id!) || r.isToday : selected.has(id!) || r.isToday}
                      disabled={applied || r.isToday || busy}
                      onChange={() => toggle(id!)}
                      aria-describedby={`${inputId}-why`}
                    />
                  ) : (
                    <span className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <label htmlFor={r.schedulable ? inputId : undefined} className="block text-[14px] font-medium text-ink">
                      {r.task?.title ?? r.block.title}
                    </label>
                    <p id={`${inputId}-why`} className="mt-0.5 text-[13px] text-ink-dim">
                      {r.block.why || (r.block.taskId ? '' : 'Bloque libre')}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge>{formatMinutes(r.block.minutes)}</Badge>
                      {r.isToday && <Badge tone="accent">Ya es para hoy</Badge>}
                      {r.block.taskId && !r.task && <Badge tone="warm">Tarea no encontrada</Badge>}
                      {r.task?.status === 'completed' && <Badge tone="success">Completada</Badge>}
                    </div>
                  </div>
                  {r.task && (
                    <IconButton label={`Abrir ${r.task.title}`} size="sm" onClick={() => openTask(r.task!.id)}>
                      <ExternalLink size={14} />
                    </IconButton>
                  )}
                </li>
              )
            })}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-faint">Total ≈ {formatMinutes(total)} · tiempos orientativos</p>
            {applied ? (
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-success" role="status">
                <Check size={14} aria-hidden /> Programadas para hoy
              </p>
            ) : (
              <Button
                size="sm"
                icon={<CalendarCheck size={14} />}
                onClick={apply}
                loading={busy}
                disabled={!toApply.length}
                className={clsx(!toApply.length && 'opacity-50')}
              >
                Programar las seleccionadas para hoy{toApply.length ? ` (${toApply.length})` : ''}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
