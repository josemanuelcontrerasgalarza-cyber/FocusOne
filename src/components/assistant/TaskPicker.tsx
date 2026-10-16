'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '@/components/ui/Overlay'
import { EmptyState } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { nowContext, rankTasks } from '@/lib/kairo/priority'
import { matchesQuery } from '@/lib/kairo/tasks'
import type { Task } from '@/lib/kairo/types'

/** Selector de tarea abierta (de primer nivel), ordenada por prioridad. */
export function TaskPicker({
  open,
  onClose,
  onPick,
  title,
  description,
}: {
  open: boolean
  onClose: () => void
  onPick: (task: Task) => void
  title: string
  description: string
}) {
  const tasks = useWorkspace((s) => s.tasks)
  const projects = useWorkspace((s) => s.projects)
  const [q, setQ] = useState('')

  const options = useMemo(() => {
    if (!open) return []
    const ranked = rankTasks(tasks, nowContext(new Date(), projects))
    const seen = new Set<string>()
    const list: Task[] = []
    for (const s of ranked) {
      const t = s.parent && s.parent.status !== 'completed' ? s.parent : s.task
      if (seen.has(t.id)) continue
      seen.add(t.id)
      list.push(t)
    }
    return list.filter((t) => matchesQuery(t, q)).slice(0, 50)
  }, [open, tasks, projects, q])

  const close = () => {
    setQ('')
    onClose()
  }

  return (
    <Modal open={open} onClose={close} title={title} description={description}>
      <label className="relative block">
        <span className="sr-only">Buscar tarea</span>
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          className="k-input pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar tarea…"
          data-autofocus
        />
      </label>
      {options.length === 0 ? (
        <EmptyState compact title={q ? 'Sin coincidencias' : 'No tienes tareas abiertas'} description={q ? 'Prueba con otra palabra.' : 'Captura una tarea primero (atajo N).'} />
      ) : (
        <ul className="mt-3 max-h-[50vh] space-y-0.5 overflow-y-auto" role="listbox" aria-label="Tareas abiertas">
          {options.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setQ('')
                  onPick(t)
                }}
                className="flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-[14px] text-ink transition-colors hover:bg-sunken focus-visible:bg-sunken"
              >
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                {t.estimated_minutes ? <span className="font-mono text-xs text-ink-faint">{t.estimated_minutes} min</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
