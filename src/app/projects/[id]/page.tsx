'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Zap, ChevronDown, CalendarPlus, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { PlasmaBar } from '@/glass/PlasmaBar'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { useTaskStore } from '@/store/taskStore'
import { useCosmos } from '@/cosmos/state/useCosmos'
import { dueLabel, dueToneBadge } from '@/lib/dates'
import { cn } from '@/lib/utils'

const PRIORITY_CFG = {
  high:   { label: 'Alta',  dot: 'bg-nova',      text: 'text-nova',      badge: 'badge badge-nova' },
  medium: { label: 'Media', dot: 'bg-solar',     text: 'text-solar',     badge: 'badge badge-solar' },
  low:    { label: 'Baja',  dot: 'bg-ink-ghost', text: 'text-ink-ghost', badge: 'badge badge-ghost' },
}
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

type Filter = 'all' | 'high' | 'medium' | 'low'
type Sort = 'priority' | 'due' | 'recent'

const SORT_LABEL: Record<Sort, string> = {
  priority: 'Prioridad',
  due: 'Vencimiento',
  recent: 'Reciente',
}

function ProjectDetail() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params.id
  const user = useAuthStore((s) => s.user)
  const { projects, fetchProjects, deleteProject } = useProjectStore()
  const { tasks, fetchTasks, createTask, completeTask, deleteTask, updateTask } = useTaskStore()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('priority')
  const [editingDue, setEditingDue] = useState<string | null>(null)

  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (user?.id && projects.length === 0) fetchProjects(user.id)
  }, [user?.id, projects.length, fetchProjects])

  useEffect(() => {
    if (projectId) fetchTasks(projectId)
  }, [projectId, fetchTasks])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !title.trim()) return
    await createTask({
      user_id: user.id,
      project_id: projectId,
      title: title.trim(),
      priority,
      due_date: dueDate || undefined,
    })
    setTitle('')
    setDueDate('')
  }

  async function handleComplete(taskId: string) {
    await completeTask(taskId, projectId)
    useCosmos.getState().celebrate()
  }

  async function handleDeleteProject() {
    if (!confirm('¿Eliminar esta misión y todos sus objetivos? No se puede deshacer.')) return
    await deleteProject(projectId)
    router.push('/projects')
  }

  const pending = useMemo(() => tasks.filter((t) => t.status === 'pending'), [tasks])
  const completed = useMemo(() => tasks.filter((t) => t.status === 'completed'), [tasks])

  const visiblePending = useMemo(() => {
    let list = pending
    if (filter !== 'all') list = list.filter((t) => t.priority === filter)
    const sorted = [...list]
    if (sort === 'priority') {
      sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    } else if (sort === 'due') {
      sorted.sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
    } else {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }
    return sorted
  }, [pending, filter, sort])

  function cycleSort() {
    const order: Sort[] = ['priority', 'due', 'recent']
    setSort(order[(order.indexOf(sort) + 1) % order.length])
  }

  if (!project) {
    return <div className="mt-10 text-center text-sm text-ink-ghost">Cargando misión…</div>
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="mt-2">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-ghost transition-colors hover:bg-white/[0.05] hover:text-ink"
        >
          <ArrowLeft size={13} /> Misiones
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-data text-[11px] uppercase tracking-[0.3em] text-plasma">◉ Misión activa</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">{project.name}</h1>
            {project.goal && <p className="mt-1.5 max-w-lg text-sm text-ink-dim">{project.goal}</p>}
          </div>
          <button
            onClick={handleDeleteProject}
            className="shrink-0 rounded-lg p-1.5 text-ink-ghost transition-all hover:bg-nova/10 hover:text-nova"
            title="Eliminar misión"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <PlasmaBar value={project.progress} className="flex-1" />
          <span className="font-data text-sm font-semibold text-core">{project.progress}%</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 font-data text-[11px] text-ink-ghost">
          <span className="rounded-full border border-glass-border bg-black/20 px-2.5 py-1">
            {pending.length} pendientes
          </span>
          <span className="rounded-full border border-glass-border bg-black/20 px-2.5 py-1">
            {completed.length} completados
          </span>
          {project.target_date && (
            <span className={cn('rounded-full px-2.5 py-1', dueToneBadge[dueLabel(project.target_date).tone])}>
              Meta: {dueLabel(project.target_date).text}
            </span>
          )}
        </div>
      </header>

      {/* Añadir objetivo */}
      <GlassPanel className="p-5 card-accent-plasma" tilt={false}>
        <p className="mb-3 font-data text-[10px] uppercase tracking-[0.25em] text-ink-ghost">Añadir objetivo</p>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            placeholder="Siguiente objetivo…"
            className="glass-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            {(['high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all',
                  priority === p
                    ? p === 'high' ? 'border-nova/40 bg-nova/10 text-nova'
                      : p === 'medium' ? 'border-solar/40 bg-solar/10 text-solar'
                      : 'border-glass-border-hi bg-white/[0.06] text-ink-dim'
                    : 'border-glass-border text-ink-ghost hover:border-glass-border-hi hover:text-ink-dim',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_CFG[p].dot)} />
                {PRIORITY_CFG[p].label}
              </button>
            ))}
            <label className="flex items-center gap-1.5 rounded-lg border border-glass-border px-2.5 py-1.5 text-xs text-ink-ghost transition-colors focus-within:border-glass-border-hi hover:text-ink-dim">
              <CalendarPlus size={13} />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-transparent text-xs text-ink-dim outline-none [color-scheme:dark]"
              />
            </label>
            <Button type="submit" size="sm" className="ml-auto">
              <Plus size={14} /> Añadir
            </Button>
          </div>
        </form>
      </GlassPanel>

      {/* Filtros + orden */}
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'high', 'medium', 'low'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-all',
                filter === f
                  ? 'border-core/45 bg-core/10 text-core'
                  : 'border-glass-border text-ink-ghost hover:border-glass-border-hi hover:text-ink-dim',
              )}
            >
              {f === 'all' ? 'Todas' : PRIORITY_CFG[f].label}
            </button>
          ))}
          <button
            onClick={cycleSort}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-glass-border px-3 py-1 text-xs text-ink-ghost transition-all hover:border-glass-border-hi hover:text-ink-dim"
            title="Cambiar orden"
          >
            <ArrowUpDown size={12} /> {SORT_LABEL[sort]}
          </button>
        </div>
      )}

      {/* Lista de objetivos */}
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {visiblePending.map((t) => {
            const due = t.due_date ? dueLabel(t.due_date) : null
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                <GlassPanel className="flex items-center gap-3 p-3.5" tilt={false}>
                  <button
                    onClick={() => handleComplete(t.id)}
                    className="h-5 w-5 shrink-0 rounded-full border border-core/50 transition-all hover:scale-110 hover:bg-core/30 hover:shadow-glow-core"
                    title="Completar"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>

                  {editingDue === t.id ? (
                    <input
                      type="date"
                      autoFocus
                      defaultValue={t.due_date ?? ''}
                      onBlur={() => setEditingDue(null)}
                      onChange={(e) => {
                        updateTask(t.id, { due_date: e.target.value || undefined })
                        setEditingDue(null)
                      }}
                      className="rounded-md border border-glass-border-hi bg-black/40 px-1.5 py-0.5 font-data text-[11px] text-ink outline-none [color-scheme:dark]"
                    />
                  ) : due ? (
                    <button onClick={() => setEditingDue(t.id)} className={cn(dueToneBadge[due.tone], 'shrink-0')} title="Cambiar fecha">
                      {due.text}
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingDue(t.id)}
                      className="shrink-0 text-ink-ghost transition-colors hover:text-core"
                      title="Añadir fecha de vencimiento"
                    >
                      <CalendarPlus size={14} />
                    </button>
                  )}

                  <span className={cn(PRIORITY_CFG[t.priority].badge, 'shrink-0')}>
                    {PRIORITY_CFG[t.priority].label}
                  </span>
                  <Link href="/focus" title="Enfocar este objetivo">
                    <Zap size={14} className="text-ink-ghost transition-colors hover:text-core" />
                  </Link>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="text-ink-ghost transition-colors hover:text-nova"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </GlassPanel>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {pending.length === 0 && completed.length === 0 && (
          <p className="rounded-xl border border-glass-border bg-black/20 px-4 py-5 text-center text-sm text-ink-ghost">
            Sin objetivos aún. Añade el primer paso de esta misión.
          </p>
        )}

        {pending.length > 0 && visiblePending.length === 0 && (
          <p className="rounded-xl border border-glass-border bg-black/20 px-4 py-4 text-center text-sm text-ink-ghost">
            Ningún objetivo con prioridad «{filter !== 'all' ? PRIORITY_CFG[filter].label : ''}».
          </p>
        )}

        {completed.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-2 font-data text-[10px] uppercase tracking-[0.2em] text-ink-ghost transition-colors hover:text-ink-dim"
            >
              <ChevronDown size={14} className={cn('transition-transform', showCompleted && 'rotate-180')} />
              {completed.length} completados
            </button>
            <AnimatePresence>
              {showCompleted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex flex-col gap-2 overflow-hidden"
                >
                  {completed.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl border border-glass-border bg-black/10 px-3.5 py-2.5 opacity-45"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-core/20 text-[10px] text-core">
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm line-through">{t.title}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  return (
    <AppShell>
      <ProjectDetail />
    </AppShell>
  )
}
