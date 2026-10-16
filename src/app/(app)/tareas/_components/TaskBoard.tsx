'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { TaskCheck, TaskMeta } from '@/components/tasks/TaskBits'
import { subtasksOf } from '@/lib/kairo/tasks'
import type { Task, TaskStatus } from '@/lib/kairo/types'

const COLUMNS: { key: 'todo' | 'doing' | 'done'; label: string; target: TaskStatus; hint: string }[] = [
  { key: 'todo', label: 'Por hacer', target: 'pending', hint: 'Lo que viene' },
  { key: 'doing', label: 'En curso', target: 'in_progress', hint: 'Lo que ya empezaste' },
  { key: 'done', label: 'Hecho', target: 'completed', hint: 'Últimos 14 días' },
]

const colOf = (t: Task) => (t.status === 'completed' ? 'done' : t.status === 'pending' ? 'todo' : 'doing')

/** Tablero Kanban: arrastrar entre columnas (ratón) o mover desde el menú/cajón (teclado). */
export function TaskBoard({ tasks, today }: { tasks: Task[]; today: string }) {
  const { setTaskStatus, projects, tasks: all } = useWorkspace()
  const openTask = useUI((s) => s.openTask)
  const [over, setOver] = useState<string | null>(null)
  const recentDone = (t: Task) =>
    t.status !== 'completed' || (t.completed_at && Date.now() - new Date(t.completed_at).getTime() < 14 * 86400000)

  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => colOf(t) === col.key && recentDone(t))
        return (
          <section
            key={col.key}
            aria-label={col.label}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.key)
            }}
            onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              setOver(null)
              const id = e.dataTransfer.getData('text/kairo-task')
              const t = all.find((x) => x.id === id)
              if (t && colOf(t) !== col.key) void setTaskStatus(id, col.target)
            }}
            className={clsx(
              'flex min-h-[220px] w-[82vw] shrink-0 snap-start flex-col rounded-card border bg-surface p-2 transition-colors sm:w-auto',
              over === col.key ? 'border-accent-fg/50 bg-accent/5' : 'border-line',
            )}
          >
            <header className="flex items-baseline justify-between px-2 pb-2 pt-1">
              <h2 className="text-[13px] font-semibold text-ink">
                {col.label} <span className="ml-1 font-mono text-xs font-normal text-ink-faint">{items.length}</span>
              </h2>
              <span className="text-[11px] text-ink-faint">{col.hint}</span>
            </header>
            <div className="flex flex-col gap-1.5">
              {items.map((t) => {
                const subs = subtasksOf(all, t.id)
                return (
                  <article
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/kairo-task', t.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    className="group cursor-grab rounded-control border border-line bg-raised p-2.5 shadow-card transition-colors hover:border-line-strong active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="pt-0.5">
                        <TaskCheck
                          done={t.status === 'completed'}
                          priority={t.priority}
                          size={16}
                          onToggle={() => setTaskStatus(t.id, t.status === 'completed' ? 'pending' : 'completed')}
                          label={t.status === 'completed' ? `Reabrir ${t.title}` : `Completar ${t.title}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => openTask(t.id)}
                        className={clsx('min-w-0 flex-1 text-left text-[13px] leading-snug', t.status === 'completed' ? 'text-ink-faint line-through' : 'text-ink')}
                      >
                        {t.title}
                      </button>
                    </div>
                    <div className="mt-2 pl-[26px] empty:hidden">
                      <TaskMeta
                        task={t}
                        today={today}
                        compact
                        project={t.project_id ? projects.find((p) => p.id === t.project_id) : null}
                        subtasks={subs.length ? { done: subs.filter((s) => s.status === 'completed').length, total: subs.length } : undefined}
                      />
                    </div>
                  </article>
                )
              })}
              {items.length === 0 && (
                <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                  Arrastra tareas aquí
                </p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
