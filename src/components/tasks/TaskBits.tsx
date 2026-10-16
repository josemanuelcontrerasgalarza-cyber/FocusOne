'use client'

import clsx from 'clsx'
import { Check, CalendarDays, Clock, Repeat, Flag, ListChecks, Hash } from 'lucide-react'
import { relativeDayLabel, shortTime, formatMinutes } from '@/lib/kairo/dates'
import { dueBucket, PRIORITY_META } from '@/lib/kairo/tasks'
import { RECURRENCE_LABEL } from '@/lib/kairo/recurrence'
import { colorHex, PRIORITY_HEX } from '@/lib/colors'
import type { Project, Task } from '@/lib/kairo/types'

/** Check circular: el anillo indica la prioridad; al completar, rellena con acento. */
export function TaskCheck({
  done,
  priority,
  onToggle,
  size = 18,
  label,
}: {
  done: boolean
  priority: Task['priority']
  onToggle: () => void
  size?: number
  label: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={clsx(
        'group/check relative inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
        done ? 'border-accent-fg bg-accent-fg' : 'hover:bg-sunken',
      )}
      style={{ width: size, height: size, borderColor: done ? undefined : PRIORITY_HEX[priority] }}
    >
      {done ? (
        <Check size={size - 6} strokeWidth={3} className="animate-check-pop text-canvas" />
      ) : (
        <Check size={size - 7} strokeWidth={3} className="text-ink-faint opacity-0 transition-opacity group-hover/check:opacity-100" />
      )}
    </button>
  )
}

/** Fichas de metadatos de una tarea (fecha, hora, estimación, proyecto, etiquetas…). */
export function TaskMeta({
  task,
  today,
  project,
  subtasks,
  compact,
}: {
  task: Task
  today: string
  project?: Project | null
  subtasks?: { done: number; total: number }
  compact?: boolean
}) {
  const bucket = dueBucket(task, today)
  const done = task.status === 'completed'
  const items: React.ReactNode[] = []

  if (task.due_date) {
    items.push(
      <span
        key="due"
        className={clsx(
          'inline-flex items-center gap-1',
          !done && bucket === 'overdue' && 'font-medium text-danger',
          !done && bucket === 'today' && 'font-medium text-accent-fg',
        )}
      >
        <CalendarDays size={12} />
        {relativeDayLabel(task.due_date, today)}
        {task.due_time && ` · ${shortTime(task.due_time)}`}
      </span>,
    )
  }
  if (task.estimated_minutes) {
    items.push(
      <span key="est" className="inline-flex items-center gap-1">
        <Clock size={12} />
        {formatMinutes(task.estimated_minutes)}
      </span>,
    )
  }
  if (subtasks && subtasks.total > 0) {
    items.push(
      <span key="sub" className="inline-flex items-center gap-1">
        <ListChecks size={12} />
        {subtasks.done}/{subtasks.total}
      </span>,
    )
  }
  if (task.recurrence) {
    items.push(
      <span key="rec" className="inline-flex items-center gap-1" title={RECURRENCE_LABEL[task.recurrence]}>
        <Repeat size={12} />
        {!compact && RECURRENCE_LABEL[task.recurrence]}
      </span>,
    )
  }
  if (task.priority >= 3 && !done) {
    items.push(
      <span key="pri" className="inline-flex items-center gap-1" style={{ color: PRIORITY_HEX[task.priority] }}>
        <Flag size={12} />
        {PRIORITY_META[task.priority].label}
      </span>,
    )
  }
  if (project) {
    items.push(
      <span key="proj" className="inline-flex min-w-0 items-center gap-1.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorHex(project.color) }} />
        <span className="truncate">{project.name}</span>
      </span>,
    )
  }
  if (!compact) {
    for (const tag of task.tags.slice(0, 3)) {
      items.push(
        <span key={`tag-${tag}`} className="inline-flex items-center text-ink-faint">
          <Hash size={11} />
          {tag}
        </span>,
      )
    }
  }
  if (!items.length) return null
  return <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-dim">{items}</div>
}
