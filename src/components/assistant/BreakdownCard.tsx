'use client'

import { useState } from 'react'
import { Check, ListPlus, Plus, X } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { toast } from '@/lib/toast'
import { LIMITS, type BreakdownStep } from '@/lib/ai/types'
import { SourceTag } from './SourceTag'

interface Row {
  key: string
  title: string
  minutes: string
  include: boolean
}

let seq = 0
const toRow = (s: BreakdownStep): Row => ({
  key: `s${++seq}`,
  title: s.title,
  minutes: s.minutes ? String(s.minutes) : '',
  include: true,
})

/** Pasos propuestos, editables. Nada se crea hasta que el usuario lo confirma. */
export function BreakdownCard({
  taskId,
  taskTitle,
  steps,
  added,
  onAdded,
}: {
  taskId: string
  taskTitle: string
  steps: BreakdownStep[]
  added?: number
  onAdded: (n: number) => void
}) {
  const parent = useWorkspace((s) => s.tasks.find((t) => t.id === taskId))
  const addTask = useWorkspace((s) => s.addTask)
  const openTask = useUI((s) => s.openTask)
  const [rows, setRows] = useState<Row[]>(() => steps.map(toRow))
  const [busy, setBusy] = useState(false)

  const valid = rows.filter((r) => r.include && r.title.trim())
  const done = added !== undefined
  const set = (key: string, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  async function apply() {
    if (!parent || !valid.length) return
    setBusy(true)
    let n = 0
    for (const r of valid) {
      const minutes = Math.round(Number(r.minutes))
      const created = await addTask(
        {
          title: r.title.trim().slice(0, LIMITS.stepTitle),
          parent_id: parent.id,
          estimated_minutes: Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 600) : null,
          project_id: parent.project_id,
        },
        { silent: true },
      )
      if (created) n++
    }
    setBusy(false)
    if (n) {
      onAdded(n)
      toast.success(n === 1 ? '1 subtarea añadida' : `${n} subtareas añadidas`, {
        action: { label: 'Ver tarea', onClick: () => openTask(parent.id) },
      })
    }
  }

  return (
    <div className="space-y-3">
      <SourceTag source="ai" />
      <p className="text-[14px] text-ink">
        Pasos para <span className="font-semibold">{parent?.title ?? taskTitle}</span>. Edítalos antes de añadirlos; los
        minutos son orientativos.
      </p>

      <ul className="divide-y divide-line overflow-hidden rounded-control border border-line bg-raised">
        {rows.map((r, i) => (
          <li key={r.key} className="flex items-center gap-2 px-3 py-2">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 cursor-pointer accent-accent-fg"
              checked={r.include}
              disabled={done || busy}
              onChange={(e) => set(r.key, { include: e.target.checked })}
              aria-label={`Incluir paso ${i + 1}`}
            />
            <input
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[14px] text-ink outline-none hover:border-line focus:border-accent-fg/60 disabled:opacity-70"
              value={r.title}
              maxLength={LIMITS.stepTitle}
              disabled={done || busy}
              onChange={(e) => set(r.key, { title: e.target.value })}
              aria-label={`Título del paso ${i + 1}`}
              placeholder="Describe el paso"
            />
            <div className="flex shrink-0 items-center gap-1">
              <input
                className="w-12 rounded-md border border-line bg-canvas px-1.5 py-1 text-right font-mono text-xs text-ink outline-none focus:border-accent-fg/60 disabled:opacity-70"
                value={r.minutes}
                inputMode="numeric"
                disabled={done || busy}
                onChange={(e) => set(r.key, { minutes: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                aria-label={`Minutos del paso ${i + 1}`}
                placeholder="—"
              />
              <span className="text-xs text-ink-faint">min</span>
            </div>
            {!done && (
              <IconButton label={`Quitar paso ${i + 1}`} size="sm" onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}>
                <X size={14} />
              </IconButton>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!done ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setRows((prev) => [...prev, toRow({ title: '' })])}
            disabled={busy || rows.length >= 12}
          >
            Añadir paso
          </Button>
        ) : (
          <span />
        )}
        {!parent ? (
          <p className="text-[13px] text-warm">La tarea ya no existe.</p>
        ) : done ? (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-success" role="status">
            <Check size={14} aria-hidden /> {added === 1 ? '1 subtarea añadida' : `${added} subtareas añadidas`}
          </p>
        ) : (
          <Button size="sm" icon={<ListPlus size={14} />} onClick={apply} loading={busy} disabled={!valid.length}>
            Añadir {valid.length} {valid.length === 1 ? 'subtarea' : 'subtareas'}
          </Button>
        )}
      </div>
    </div>
  )
}
