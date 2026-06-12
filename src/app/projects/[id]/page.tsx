'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Zap } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { PlasmaBar } from '@/glass/PlasmaBar'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { useTaskStore } from '@/store/taskStore'
import { useCosmos } from '@/cosmos/state/useCosmos'
import { cn } from '@/lib/utils'

function ProjectDetail() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params.id
  const user = useAuthStore((s) => s.user)
  const { projects, fetchProjects, deleteProject } = useProjectStore()
  const { tasks, fetchTasks, createTask, completeTask, deleteTask } = useTaskStore()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')

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
          className="inline-flex items-center gap-1.5 text-xs text-ink-ghost hover:text-ink"
        >
          <ArrowLeft size={13} /> Misiones
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold">{project.name}</h1>
            {project.goal && <p className="mt-1 text-sm text-ink-dim">{project.goal}</p>}
          </div>
          <button
            onClick={handleDeleteProject}
            className="shrink-0 text-ink-ghost transition-colors hover:text-nova"
            title="Eliminar misión"
          >
            <Trash2 size={17} />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <PlasmaBar value={project.progress} className="flex-1" />
          <span className="font-data text-sm text-core">{project.progress}%</span>
        </div>
      </header>

      <GlassPanel className="p-5" tilt={false}>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            placeholder="Siguiente objetivo…"
            className="glass-input flex-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
            className="glass-input w-auto"
          >
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <Button type="submit">
            <Plus size={15} />
          </Button>
        </form>
      </GlassPanel>

      <div className="flex flex-col gap-2">
        {pending.map((t) => (
          <GlassPanel key={t.id} className="flex items-center gap-3 p-3.5" tilt={false}>
            <button
              onClick={() => handleComplete(t.id)}
              className="h-5 w-5 shrink-0 rounded-full border border-core/50 transition-all hover:bg-core/30 hover:shadow-glow-core"
              title="Completar"
            />
            <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
            <span
              className={cn(
                'font-data text-[10px] uppercase tracking-wider',
                t.priority === 'high' && 'text-nova',
                t.priority === 'medium' && 'text-solar',
                t.priority === 'low' && 'text-ink-ghost',
              )}
            >
              {t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Media' : 'Baja'}
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
        ))}

        {completed.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer font-data text-xs uppercase tracking-[0.2em] text-ink-ghost">
              {completed.length} completados
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {completed.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-glass-border bg-black/15 px-3.5 py-2.5 opacity-50"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-core/20 text-[10px] text-core">
                    ✓
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm line-through">{t.title}</span>
                </div>
              ))}
            </div>
          </details>
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
