'use client'

import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import {
  Archive,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/primitives'
import { IconButton } from '@/components/ui/Button'
import { confirm, Menu, type MenuItem } from '@/components/ui/Overlay'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { toast } from '@/lib/toast'
import { colorHex } from '@/lib/colors'
import { goalProgress } from '@/lib/kairo/tasks'
import type { Goal } from '@/lib/kairo/types'
import { dueInfo, isMeasurable, isoToKey, linkedTaskCount, progressLabel, shortDate } from './format'

export function GoalCard({ goal, today, onEdit }: { goal: Goal; today: string; onEdit: (g: Goal) => void }) {
  const { tasks, projects, updateGoal, bumpGoal, deleteGoal } = useWorkspace()
  const openCapture = useUI((s) => s.openCapture)
  const [menu, setMenu] = useState(false)

  const hex = colorHex(goal.color)
  const progress = goalProgress(goal, tasks)
  const pct = Math.round(progress.ratio * 100)
  const measurable = isMeasurable(goal)
  const active = goal.status === 'active'
  const project = goal.project_id ? projects.find((p) => p.id === goal.project_id) ?? null : null
  const linked = linkedTaskCount(goal.id, tasks)
  const due = active && goal.due_date ? dueInfo(goal.due_date, today) : null
  const label = progressLabel(goal, progress)

  /** Ejecuta un cambio de estado y confirma solo si el store no lo revirtió. */
  async function setStatus(patch: Partial<Goal>, message: string) {
    const before = useWorkspace.getState().goals.find((g) => g.id === goal.id)
    await updateGoal(goal.id, patch)
    const after = useWorkspace.getState().goals.find((g) => g.id === goal.id)
    if (after && after !== before) toast.success(message)
  }

  const items: MenuItem[] = [{ label: 'Editar', icon: <Pencil size={14} />, onSelect: () => onEdit(goal) }]
  if (active) {
    items.push({
      label: 'Marcar cumplido',
      icon: <CheckCircle2 size={14} />,
      onSelect: () => setStatus({ status: 'achieved', achieved_at: new Date().toISOString() }, `Objetivo cumplido: ${goal.title}`),
    })
  } else {
    items.push({
      label: 'Reactivar',
      icon: <RotateCcw size={14} />,
      onSelect: () => setStatus({ status: 'active', achieved_at: null }, 'Objetivo reactivado'),
    })
  }
  if (goal.status !== 'archived') {
    items.push({
      label: 'Archivar',
      icon: <Archive size={14} />,
      onSelect: () => setStatus({ status: 'archived' }, 'Objetivo archivado'),
    })
  }
  items.push({
    label: 'Eliminar',
    icon: <Trash2 size={14} />,
    danger: true,
    onSelect: async () => {
      const ok = await confirm({
        title: '¿Eliminar este objetivo?',
        description: linked
          ? `«${goal.title}» se eliminará definitivamente. Sus ${linked} tareas vinculadas se conservan, sin objetivo.`
          : `«${goal.title}» se eliminará definitivamente.`,
        confirmLabel: 'Eliminar',
        destructive: true,
      })
      if (ok) void deleteGoal(goal.id)
    },
  })

  return (
    <article
      className={clsx(
        'group relative flex animate-fade-in flex-col rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:p-5',
        goal.status === 'archived' && 'opacity-80',
      )}
      aria-labelledby={`goal-${goal.id}`}
    >
      {/* Marcador de color */}
      <span aria-hidden className="absolute left-0 top-[18px] h-5 w-[3px] rounded-r-full sm:top-[22px]" style={{ background: hex }} />

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 id={`goal-${goal.id}`} className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            {goal.title}
          </h3>
          {goal.description && <p className="mt-1 line-clamp-2 text-[13px] text-ink-dim">{goal.description}</p>}
        </div>
        <div className="relative -mr-1.5 -mt-1">
          <IconButton
            label={`Acciones de «${goal.title}»`}
            size="sm"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            <MoreHorizontal size={16} />
          </IconButton>
          <Menu open={menu} onClose={() => setMenu(false)} items={items} />
        </div>
      </div>

      {/* Progreso */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className={clsx('font-mono text-[13px]', progress.total || measurable ? 'text-ink' : 'text-ink-faint')}>{label}</p>
          {(measurable || progress.total > 0) && <p className="font-mono text-xs text-ink-faint">{pct} %</p>}
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sunken"
          role="progressbar"
          aria-label={`Progreso de «${goal.title}»`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={label}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%`, background: hex }}
          />
        </div>
      </div>

      {/* Metadatos */}
      {(due || project || goal.status === 'achieved') && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {due && (
            <Badge tone={due.tone}>
              <CalendarClock size={11} aria-hidden />
              <span title={`Fecha objetivo: ${shortDate(goal.due_date as string, today)}`}>{due.label}</span>
              <span className="sr-only">, fecha objetivo {shortDate(goal.due_date as string, today)}</span>
            </Badge>
          )}
          {goal.status === 'achieved' && (
            <Badge tone="success">
              <CheckCircle2 size={11} aria-hidden />
              {goal.achieved_at ? `Cumplido el ${shortDate(isoToKey(goal.achieved_at), today)}` : 'Cumplido'}
            </Badge>
          )}
          {project && (
            <Badge>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: colorHex(project.color) }} />
              <span className="max-w-[140px] truncate">{project.name}</span>
            </Badge>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="mt-auto flex items-center gap-2 pt-4">
        <Link
          href={`/tareas?objetivo=${goal.id}`}
          className="inline-flex h-8 items-center gap-1 rounded-control px-1.5 text-[13px] font-medium text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
        >
          Ver tareas
          {linked > 0 && <span className="font-mono text-xs text-ink-faint">{linked}</span>}
          <ArrowRight size={13} aria-hidden />
        </Link>
        {active && !measurable && (
          <button
            type="button"
            onClick={() => openCapture({ goal_id: goal.id, project_id: goal.project_id })}
            className="inline-flex h-8 items-center gap-1 rounded-control px-1.5 text-[13px] font-medium text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
          >
            <Plus size={13} aria-hidden />
            Añadir tarea
          </button>
        )}
        {active && measurable && (
          <div className="ml-auto flex items-center gap-1" role="group" aria-label={`Ajustar progreso de «${goal.title}»`}>
            <IconButton
              label={`Restar 1 a «${goal.title}»`}
              size="sm"
              className="border border-line"
              disabled={goal.current_value <= 0}
              onClick={() => bumpGoal(goal.id, -1)}
            >
              <Minus size={14} />
            </IconButton>
            <IconButton
              label={`Sumar 1 a «${goal.title}»`}
              size="sm"
              className="border border-line bg-raised text-ink hover:border-line-strong"
              onClick={() => bumpGoal(goal.id, 1)}
            >
              <Plus size={14} />
            </IconButton>
          </div>
        )}
      </div>
    </article>
  )
}
