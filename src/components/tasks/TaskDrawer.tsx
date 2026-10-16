'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { X, Timer, Trash2, Plus, Hash, CalendarDays } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { Drawer, confirm } from '@/components/ui/Overlay'
import { Button, IconButton } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/primitives'
import { addDays, toDateKey, relativeDayLabel } from '@/lib/kairo/dates'
import { subtasksOf, PRIORITY_META } from '@/lib/kairo/tasks'
import { RECURRENCE_LABEL } from '@/lib/kairo/recurrence'
import { PRIORITY_HEX } from '@/lib/colors'
import { TaskCheck } from './TaskBits'
import type { Priority, Recurrence, Task } from '@/lib/kairo/types'

const label = 'text-[12px] font-medium text-ink-dim'

export function TaskDrawerHost() {
  const id = useUI((s) => s.taskId)
  const openTask = useUI((s) => s.openTask)
  const task = useWorkspace((s) => (id ? s.tasks.find((t) => t.id === id) ?? null : null))
  return (
    <Drawer open={Boolean(task)} onClose={() => openTask(null)} label="Detalle de la tarea">
      {task && <TaskDetail key={task.id} task={task} onClose={() => openTask(null)} />}
    </Drawer>
  )
}

function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const router = useRouter()
  const ws = useWorkspace()
  const openTask = useUI((s) => s.openTask)
  const today = toDateKey(new Date())
  const [title, setTitle] = useState(task.title)
  const [desc, setDesc] = useState(task.description ?? '')
  const [tagDraft, setTagDraft] = useState('')
  const [subDraft, setSubDraft] = useState('')
  const subs = subtasksOf(ws.tasks, task.id)
  const parent = task.parent_id ? ws.tasks.find((t) => t.id === task.parent_id) : null
  const done = task.status === 'completed'

  useEffect(() => setTitle(task.title), [task.title])

  const patch = (p: Partial<Task>) => void ws.updateTask(task.id, p)

  const saveTitle = () => {
    const v = title.trim()
    if (!v) return setTitle(task.title)
    if (v !== task.title) patch({ title: v.slice(0, 200) })
  }
  const saveDesc = () => {
    const v = desc.trim()
    if (v !== (task.description ?? '')) patch({ description: v || null })
  }
  const addTag = () => {
    const v = tagDraft.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-')
    if (v && !task.tags.includes(v)) patch({ tags: [...task.tags, v].slice(0, 12) })
    setTagDraft('')
  }
  const addSub = async () => {
    const v = subDraft.trim()
    if (!v) return
    setSubDraft('')
    await ws.addTask({ title: v, parent_id: task.id, project_id: task.project_id, position: Date.now() }, { silent: true })
  }

  const statusValue = done ? 'completed' : task.status === 'pending' ? 'pending' : 'in_progress'

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-ink-faint">
          {parent ? (
            <button onClick={() => openTask(parent.id)} className="truncate hover:text-ink">
              ← {parent.title}
            </button>
          ) : (
            <span>Tarea</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!done && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Timer size={14} />}
              onClick={() => {
                onClose()
                router.push(`/enfoque?task=${task.id}`)
              }}
            >
              Enfocar
            </Button>
          )}
          <IconButton label="Cerrar" size="sm" onClick={onClose} data-close>
            <X size={16} />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="pt-1.5">
            <TaskCheck
              done={done}
              priority={task.priority}
              onToggle={() => ws.toggleTask(task.id)}
              size={20}
              label={done ? 'Reabrir tarea' : 'Completar tarea'}
            />
          </div>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLTextAreaElement).blur()
              }
            }}
            rows={1}
            aria-label="Título de la tarea"
            className={clsx(
              'w-full resize-none bg-transparent text-[20px] font-semibold leading-snug tracking-[-0.015em] outline-none [field-sizing:content]',
              done ? 'text-ink-faint line-through' : 'text-ink',
            )}
          />
        </div>

        <Segmented
          label="Estado"
          value={statusValue}
          onChange={(v) => ws.setTaskStatus(task.id, v as Task['status'])}
          options={[
            { value: 'pending', label: 'Pendiente' },
            { value: 'in_progress', label: 'En curso' },
            { value: 'completed', label: 'Hecha' },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className={label}>Prioridad</p>
            <div className="flex gap-1">
              {([4, 3, 2, 1] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => patch({ priority: p })}
                  aria-pressed={task.priority === p}
                  className={clsx(
                    'flex h-8 flex-1 items-center justify-center gap-1 rounded-control border text-xs font-medium transition-colors',
                    task.priority === p ? 'border-line-strong bg-raised text-ink' : 'border-line text-ink-dim hover:bg-sunken',
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_HEX[p] }} />
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className={label}>Estimación</p>
            <div className="flex items-center gap-1">
              {[15, 25, 50].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch({ estimated_minutes: task.estimated_minutes === m ? null : m })}
                  className={clsx(
                    'h-8 rounded-control border px-2.5 font-mono text-xs transition-colors',
                    task.estimated_minutes === m ? 'border-line-strong bg-raised text-ink' : 'border-line text-ink-dim hover:bg-sunken',
                  )}
                >
                  {m}m
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={600}
                inputMode="numeric"
                aria-label="Minutos estimados"
                placeholder="min"
                value={task.estimated_minutes ?? ''}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  patch({ estimated_minutes: e.target.value === '' ? null : Math.min(600, Math.max(1, n)) })
                }}
                className="k-input h-8 w-20 py-1 font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className={label}>Fecha</p>
            <div className="flex flex-wrap items-center gap-1">
              <input
                type="date"
                aria-label="Fecha límite"
                value={task.due_date ?? ''}
                onChange={(e) => patch({ due_date: e.target.value || null })}
                className="k-input h-8 w-auto py-1 text-xs"
              />
              <input
                type="time"
                aria-label="Hora"
                value={task.due_time ?? ''}
                onChange={(e) => patch({ due_time: e.target.value || null })}
                className="k-input h-8 w-auto py-1 text-xs"
              />
            </div>
            <div className="flex gap-1 pt-0.5">
              {[
                ['Hoy', today],
                ['Mañana', addDays(today, 1)],
                ['+1 sem', addDays(today, 7)],
              ].map(([l, v]) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => patch({ due_date: v })}
                  className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-dim hover:bg-sunken hover:text-ink"
                >
                  {l}
                </button>
              ))}
              {task.due_date && (
                <button
                  type="button"
                  onClick={() => patch({ due_date: null, due_time: null })}
                  className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-faint hover:bg-sunken hover:text-ink"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className={label}>Repetir</p>
            <select
              aria-label="Recurrencia"
              value={task.recurrence ?? ''}
              onChange={(e) => patch({ recurrence: (e.target.value || null) as Recurrence | null })}
              className="k-input h-8 py-1 text-xs"
              disabled={Boolean(task.parent_id)}
            >
              <option value="">No se repite</option>
              {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <p className={label}>Proyecto</p>
            <select
              aria-label="Proyecto"
              value={task.project_id ?? ''}
              onChange={(e) => patch({ project_id: e.target.value || null })}
              className="k-input h-8 py-1 text-xs"
            >
              <option value="">Sin proyecto</option>
              {ws.projects
                .filter((p) => p.status !== 'archived' || p.id === task.project_id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <p className={label}>Objetivo</p>
            <select
              aria-label="Objetivo"
              value={task.goal_id ?? ''}
              onChange={(e) => patch({ goal_id: e.target.value || null })}
              className="k-input h-8 py-1 text-xs"
            >
              <option value="">Sin objetivo</option>
              {ws.goals
                .filter((g) => g.status === 'active' || g.id === task.goal_id)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className={label}>Etiquetas</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {task.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md border border-line bg-sunken px-1.5 py-0.5 text-xs text-ink-dim">
                <Hash size={11} />
                {t}
                <button
                  type="button"
                  aria-label={`Quitar etiqueta ${t}`}
                  onClick={() => patch({ tags: task.tags.filter((x) => x !== t) })}
                  className="text-ink-faint hover:text-ink"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag()
                }
              }}
              onBlur={() => tagDraft && addTag()}
              placeholder="Añadir etiqueta"
              aria-label="Nueva etiqueta"
              className="min-w-[110px] flex-1 bg-transparent py-0.5 text-xs text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <p className={label}>Notas</p>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={saveDesc}
            rows={3}
            placeholder="Contexto, enlaces, criterio de terminado…"
            aria-label="Descripción"
            className="k-input min-h-[84px] resize-y text-sm leading-relaxed"
          />
        </div>

        {!task.parent_id && (
          <div className="space-y-1.5">
            <p className={label}>
              Subtareas {subs.length > 0 && `· ${subs.filter((s) => s.status === 'completed').length}/${subs.length}`}
            </p>
            <div className="space-y-0.5">
              {subs.map((s) => (
                <div key={s.id} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-sunken">
                  <TaskCheck
                    done={s.status === 'completed'}
                    priority={s.priority}
                    size={16}
                    onToggle={() => ws.toggleTask(s.id)}
                    label={`Completar ${s.title}`}
                  />
                  <button onClick={() => openTask(s.id)} className={clsx('min-w-0 flex-1 truncate text-left text-sm', s.status === 'completed' ? 'text-ink-faint line-through' : 'text-ink')}>
                    {s.title}
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${s.title}`}
                    onClick={() => ws.deleteTask(s.id)}
                    className="text-ink-faint opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2.5 px-1.5 py-1">
                <Plus size={14} className="text-ink-faint" />
                <input
                  value={subDraft}
                  onChange={(e) => setSubDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSub()}
                  placeholder="Añadir un paso"
                  aria-label="Nueva subtarea"
                  className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={12} />
          Creada {relativeDayLabel(toDateKey(new Date(task.created_at)), today).toLowerCase()}
          {task.completed_at && ` · hecha ${relativeDayLabel(toDateKey(new Date(task.completed_at)), today).toLowerCase()}`}
        </span>
        <Button
          size="sm"
          variant="ghost"
          icon={<Trash2 size={14} />}
          className="text-danger hover:bg-danger/10 hover:text-danger"
          onClick={async () => {
            const ok = await confirm({
              title: '¿Eliminar esta tarea?',
              description: subs.length ? `También se eliminarán sus ${subs.length} subtareas.` : 'No se puede deshacer.',
              confirmLabel: 'Eliminar',
              destructive: true,
            })
            if (ok) {
              onClose()
              void ws.deleteTask(task.id)
            }
          }}
        >
          Eliminar
        </Button>
      </div>
    </>
  )
}
