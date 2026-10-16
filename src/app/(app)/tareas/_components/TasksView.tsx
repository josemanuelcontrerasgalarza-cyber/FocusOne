'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { List, Columns3, Plus, Search, X, CheckSquare, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { PageHeader, Segmented, EmptyState } from '@/components/ui/primitives'
import { QuickAddBar } from '@/components/tasks/QuickCapture'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskBoard } from './TaskBoard'
import { toDateKey } from '@/lib/kairo/dates'
import { allTags, dueBucket, filterTasks, sortTasks, PRIORITY_META, type TaskSort, type DueBucket } from '@/lib/kairo/tasks'
import type { Priority, Task } from '@/lib/kairo/types'

type DueParam = 'vencidas' | 'hoy' | 'semana' | 'sin-fecha'
const DUE_MAP: Record<DueParam, 'overdue' | 'today' | 'week' | 'none'> = {
  vencidas: 'overdue',
  hoy: 'today',
  semana: 'week',
  'sin-fecha': 'none',
}
const GROUPS: { key: DueBucket; label: string }[] = [
  { key: 'overdue', label: 'Vencidas' },
  { key: 'today', label: 'Hoy' },
  { key: 'tomorrow', label: 'Mañana' },
  { key: 'week', label: 'Próximos 7 días' },
  { key: 'later', label: 'Más adelante' },
  { key: 'none', label: 'Sin fecha' },
]

export function TasksView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { tasks, projects, goals } = useWorkspace()
  const openCapture = useUI((s) => s.openCapture)
  const today = toDateKey(new Date())

  const view = (params.get('vista') === 'tablero' ? 'board' : 'list') as 'list' | 'board'
  const status = (params.get('estado') ?? 'abiertas') as 'abiertas' | 'hechas' | 'todas'
  const due = params.get('vence') as DueParam | null
  const projectId = params.get('proyecto')
  const goalId = params.get('objetivo')
  const tag = params.get('etiqueta')
  const sort = (params.get('orden') ?? 'due') as TaskSort
  const prio = (params.get('prioridad')?.split(',').map(Number).filter((n) => n >= 1 && n <= 4) ?? []) as Priority[]
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [showDone, setShowDone] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString())
    if (value == null || value === '') next.delete(key)
    else next.set(key, value)
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false })
  }

  const tags = useMemo(() => allTags(tasks), [tasks])
  const filtered = useMemo(() => {
    let list = filterTasks(
      tasks,
      {
        status: view === 'board' ? 'all' : status === 'abiertas' ? 'open' : status === 'hechas' ? 'done' : 'all',
        priorities: prio,
        projectId: projectId === 'ninguno' ? 'none' : projectId,
        tag,
        due: due ? DUE_MAP[due] : null,
        query,
      },
      today,
    )
    if (goalId) list = list.filter((t) => t.goal_id === goalId)
    return sortTasks(list, sort)
  }, [tasks, view, status, prio, projectId, tag, due, query, sort, goalId, today])

  const openCount = tasks.filter((t) => t.status !== 'completed' && !t.parent_id).length
  const activeFilters = [due, projectId, goalId, tag, prio.length ? 'p' : null, query].filter(Boolean).length
  const hasAny = tasks.some((t) => !t.parent_id)

  const clearFilters = () => {
    setQuery('')
    router.replace(view === 'board' ? `${pathname}?vista=tablero` : pathname, { scroll: false })
  }

  const grouped = useMemo(() => {
    if (sort !== 'due' || status === 'hechas') return null
    const open = filtered.filter((t) => t.status !== 'completed')
    const map = new Map<DueBucket, Task[]>()
    for (const t of open) {
      const b = dueBucket(t, today)
      map.set(b, [...(map.get(b) ?? []), t])
    }
    return { groups: GROUPS.filter((g) => map.get(g.key)?.length).map((g) => ({ ...g, items: map.get(g.key) as Task[] })), done: filtered.filter((t) => t.status === 'completed') }
  }, [filtered, sort, status, today])

  const selectCls = 'k-input h-8 w-auto py-0 pr-7 text-[13px]'

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Tareas"
        description={openCount ? `${openCount} abiertas. Captura en lenguaje natural y ordena por lo que importa.` : 'Todo lo que tienes entre manos, en un solo lugar.'}
        actions={
          <>
            <Segmented
              label="Vista"
              value={view}
              onChange={(v) => setParam('vista', v === 'board' ? 'tablero' : null)}
              options={[
                { value: 'list', label: 'Lista', icon: <List size={14} /> },
                { value: 'board', label: 'Tablero', icon: <Columns3 size={14} /> },
              ]}
            />
            <Button variant="primary" icon={<Plus size={15} strokeWidth={2.4} />} onClick={() => openCapture({ project_id: projectId && projectId !== 'ninguno' ? projectId : undefined, goal_id: goalId ?? undefined })}>
              Nueva
            </Button>
          </>
        }
      />

      <QuickAddBar className="mt-6" defaults={{ project_id: projectId && projectId !== 'ninguno' ? projectId : undefined, goal_id: goalId ?? undefined }} />

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setParam('q', query.trim() || null)}
            placeholder="Buscar tareas"
            aria-label="Buscar tareas"
            className="k-input h-8 pl-8 text-[13px]"
          />
        </div>
        {view === 'list' && (
          <Segmented
            size="sm"
            label="Estado"
            value={status}
            onChange={(v) => setParam('estado', v === 'abiertas' ? null : v)}
            options={[
              { value: 'abiertas', label: 'Abiertas' },
              { value: 'hechas', label: 'Hechas' },
              { value: 'todas', label: 'Todas' },
            ]}
          />
        )}
        <Button size="sm" variant={showFilters || activeFilters ? 'secondary' : 'ghost'} icon={<SlidersHorizontal size={14} />} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          Filtros{activeFilters ? ` · ${activeFilters}` : ''}
        </Button>
        {activeFilters > 0 && (
          <Button size="sm" variant="quiet" icon={<X size={13} />} onClick={clearFilters}>
            Limpiar
          </Button>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-[13px] text-ink-dim">
          Ordenar
          <select aria-label="Ordenar por" value={sort} onChange={(e) => setParam('orden', e.target.value === 'due' ? null : e.target.value)} className={selectCls}>
            <option value="due">Fecha</option>
            <option value="priority">Prioridad</option>
            <option value="created">Recientes</option>
            <option value="title">A–Z</option>
          </select>
        </label>
      </div>

      {showFilters && (
        <div className="mt-3 flex animate-fade-in flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-3">
          <select aria-label="Vencimiento" value={due ?? ''} onChange={(e) => setParam('vence', e.target.value || null)} className={selectCls}>
            <option value="">Cualquier fecha</option>
            <option value="vencidas">Vencidas</option>
            <option value="hoy">Para hoy</option>
            <option value="semana">Esta semana</option>
            <option value="sin-fecha">Sin fecha</option>
          </select>
          <select aria-label="Proyecto" value={projectId ?? ''} onChange={(e) => setParam('proyecto', e.target.value || null)} className={selectCls}>
            <option value="">Todos los proyectos</option>
            <option value="ninguno">Sin proyecto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {goals.length > 0 && (
            <select aria-label="Objetivo" value={goalId ?? ''} onChange={(e) => setParam('objetivo', e.target.value || null)} className={selectCls}>
              <option value="">Todos los objetivos</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          )}
          {tags.length > 0 && (
            <select aria-label="Etiqueta" value={tag ?? ''} onChange={(e) => setParam('etiqueta', e.target.value || null)} className={selectCls}>
              <option value="">Todas las etiquetas</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1" role="group" aria-label="Prioridad">
            {([4, 3, 2, 1] as Priority[]).map((p) => {
              const on = prio.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on ? prio.filter((x) => x !== p) : [...prio, p]
                    setParam('prioridad', next.length ? next.join(',') : null)
                  }}
                  className={clsx(
                    'h-8 rounded-control border px-2.5 text-[13px] transition-colors',
                    on ? 'border-line-strong bg-raised text-ink' : 'border-line text-ink-dim hover:bg-sunken',
                  )}
                >
                  {PRIORITY_META[p].label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="mt-5">
        {!hasAny ? (
          <EmptyState
            icon={<CheckSquare size={18} />}
            title="Aún no tienes tareas"
            description="Escribe arriba como hablarías: «Preparar presentación el jueves a las 10 #trabajo». Kairo entiende la fecha, la hora, la duración y las etiquetas."
          />
        ) : filtered.length === 0 && view === 'list' ? (
          <EmptyState
            compact
            title={status === 'hechas' ? 'Nada completado con estos filtros' : 'Ninguna tarea coincide'}
            description="Prueba con otros filtros o limpia la búsqueda."
            action={
              <Button size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : view === 'board' ? (
          <TaskBoard tasks={filtered} today={today} />
        ) : grouped ? (
          <div className="space-y-6">
            {grouped.groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h2 className={clsx('mb-1 flex items-center gap-2 px-3 text-[13px] font-semibold', g.key === 'overdue' ? 'text-danger' : 'text-ink')}>
                  {g.label}
                  <span className="font-mono text-xs font-normal text-ink-faint">{g.items.length}</span>
                </h2>
                <div className="divide-y divide-line/60">
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} />
                  ))}
                </div>
              </section>
            ))}
            {grouped.done.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setShowDone((v) => !v)}
                  aria-expanded={showDone}
                  className="mb-1 flex items-center gap-1.5 px-3 text-[13px] font-semibold text-ink-dim hover:text-ink"
                >
                  <ChevronDown size={14} className={clsx('transition-transform', !showDone && '-rotate-90')} />
                  Completadas <span className="font-mono text-xs font-normal text-ink-faint">{grouped.done.length}</span>
                </button>
                {showDone && (
                  <div className="divide-y divide-line/60">
                    {grouped.done.slice(0, 100).map((t) => (
                      <TaskRow key={t.id} task={t} today={today} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {filtered.slice(0, 300).map((t) => (
              <TaskRow key={t.id} task={t} today={today} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
