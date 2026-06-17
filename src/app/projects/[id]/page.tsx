'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Zap, ChevronDown } from 'lucide-react'
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
import { cn } from '@/lib/utils'

const PRIORITY_CFG = {
  high:   { label: 'Alta',  dot: 'bg-nova',   text: 'text-nova',   badge: 'badge badge-nova' },
  medium: { label: 'Media', dot: 'bg-solar',  text: 'text-solar',  badge: 'badge badge-solar' },
  low:    { label: 'Baja',  dot: 'bg-ink-ghost', text: 'text-ink-ghost', badge: 'badge badge-ghost' },
}

function ProjectDetail() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params.id
  const user = useAuthStore((s) => s.user)
  const { projects, fetchProjects, deleteProject } = useProjectStore()
  const { tasks, fetchTasks, createTask, completeTask, deleteTask } = useTaskStore()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [showCompleted, setShowCompleted] = useState(false)

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
    })
    setTitle('')
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

  const pending = tasks.filter((t) => t.status === 'pending')
  const completed = tasks.filter((t) => t.status === 'completed')

  if (!project) {
    return (
      <div className="mt-10 text-center text-sm text-ink-ghost">Cargando misión…</div>
    )
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
            <p className="font-data text-[11px] uppercase tracking-[0.3em] text-plasma">
              ◉ Misión activa
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">{project.name}</h1>
            {project.goal && (
              <p className="mt-1.5 max-w-lg text-sm text-ink-dim">{project.goal}</p>
            )}
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
      </header>

      <GlassPanel className="p-5 card-accent-plasma" tilt={false}>
        <p className="mb-3 font-data text-[10px] uppercase tracking-[0.25em] text-ink-ghost">
          Añadir objetivo
        </p>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            placeholder="Siguiente objetivo…"
            className="glass-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex items-center gap-2">
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
            <Button type="submit" size="sm" className="ml-auto">
              <Plus size={14} /> Añadir
            </Button>
          </div>
        </form>
      </GlassPanel>

      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {pending.map((t) => (
            <motion.div
              key={t.id}
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
                <span className={PRIORITY_CFG[t.priority].badge}>
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
          ))}
        </AnimatePresence>

        {pending.length === 0 && completed.length === 0 && (
          <p className="rounded-xl border border-glass-border bg-black/20 px-4 py-5 text-center text-sm text-ink-ghost">
            Sin objetivos aún. Añade el primer paso de esta misión.
          </p>
        )}

        {completed.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-2 font-data text-[10px] uppercase tracking-[0.2em] text-ink-ghost transition-colors hover:text-ink-dim"
            >
              <ChevronDown
                size={14}
                className={cn('transition-transform', showCompleted && 'rotate-180')}
              />
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
