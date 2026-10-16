'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { FolderKanban, Plus, MoreHorizontal, Pencil, Pause, Play, CheckCircle2, Archive, Trash2, CalendarDays, AlertTriangle } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { Button } from '@/components/ui/Button'
import { Badge, EmptyState, PageHeader, ProgressBar, Segmented } from '@/components/ui/primitives'
import { confirm, Menu, type MenuItem } from '@/components/ui/Overlay'
import { ProjectForm, PROJECT_STATUS_LABEL } from '@/components/projects/ProjectForm'
import { projectProgress, dueBucket } from '@/lib/kairo/tasks'
import { diffDays, relativeDayLabel, toDateKey } from '@/lib/kairo/dates'
import { colorHex } from '@/lib/colors'
import type { Project, ProjectStatus } from '@/lib/kairo/types'

type Filter = ProjectStatus | 'all'

export function ProjectsView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { projects, tasks } = useWorkspace()
  const [filter, setFilter] = useState<Filter>('active')
  const [editing, setEditing] = useState<Project | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (params.get('nuevo') === '1') {
      setEditing(null)
      setFormOpen(true)
      router.replace(pathname, { scroll: false })
    }
  }, [params, pathname, router])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { active: 0, paused: 0, completed: 0, archived: 0, all: projects.length }
    for (const p of projects) c[p.status]++
    return c
  }, [projects])

  const list = projects
    .filter((p) => filter === 'all' || p.status === filter)
    .sort((a, b) => b.priority - a.priority || (a.target_date ?? '9999').localeCompare(b.target_date ?? '9999'))

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Proyectos"
        description="Agrupa tareas y objetivos. El avance se calcula con tus tareas reales."
        actions={
          <Button
            variant="primary"
            icon={<Plus size={15} strokeWidth={2.4} />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Nuevo proyecto
          </Button>
        }
      />

      {projects.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <Segmented
            label="Filtrar por estado"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: `Activos ${counts.active}` },
              { value: 'paused', label: `En pausa ${counts.paused}` },
              { value: 'completed', label: `Completados ${counts.completed}` },
              { value: 'archived', label: `Archivados ${counts.archived}` },
              { value: 'all', label: 'Todos' },
            ]}
          />
        </div>
      )}

      <div className="mt-5">
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban size={18} />}
            title="Tu primer proyecto"
            description="Un proyecto reúne las tareas de un mismo resultado — un lanzamiento, un examen, una mudanza — y te muestra cuánto falta."
            action={
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setFormOpen(true)}>
                Crear proyecto
              </Button>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState compact title="Nada por aquí" description={`No tienes proyectos ${PROJECT_STATUS_LABEL[filter as ProjectStatus]?.toLowerCase() ?? ''}.`} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => {
                  setEditing(p)
                  setFormOpen(true)
                }}
                taskCount={tasks.filter((t) => t.project_id === p.id && !t.parent_id && t.status !== 'completed').length}
                overdue={tasks.filter((t) => t.project_id === p.id && !t.parent_id && t.status !== 'completed' && dueBucket(t, toDateKey(new Date())) === 'overdue').length}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectForm open={formOpen} onClose={() => setFormOpen(false)} project={editing} />
    </div>
  )
}

export function useProjectMenu(p: Project, onEdit: () => void, onDeleted?: () => void): MenuItem[] {
  const { updateProject, deleteProject, tasks } = useWorkspace()
  const items: MenuItem[] = [{ label: 'Editar', icon: <Pencil size={14} />, onSelect: onEdit }]
  if (p.status === 'active') items.push({ label: 'Pausar', icon: <Pause size={14} />, onSelect: () => updateProject(p.id, { status: 'paused' }) })
  if (p.status !== 'active') items.push({ label: 'Reactivar', icon: <Play size={14} />, onSelect: () => updateProject(p.id, { status: 'active' }) })
  if (p.status !== 'completed') items.push({ label: 'Marcar completado', icon: <CheckCircle2 size={14} />, onSelect: () => updateProject(p.id, { status: 'completed' }) })
  if (p.status !== 'archived') items.push({ label: 'Archivar', icon: <Archive size={14} />, onSelect: () => updateProject(p.id, { status: 'archived' }) })
  items.push({
    label: 'Eliminar',
    icon: <Trash2 size={14} />,
    danger: true,
    onSelect: async () => {
      const n = tasks.filter((t) => t.project_id === p.id).length
      const ok = await confirm({
        title: `¿Eliminar «${p.name}»?`,
        description: n ? `Sus ${n} tareas no se borran: quedarán sin proyecto.` : 'Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar proyecto',
        destructive: true,
      })
      if (ok) {
        await deleteProject(p.id)
        onDeleted?.()
      }
    },
  })
  return items
}

function ProjectCard({ project: p, onEdit, taskCount, overdue }: { project: Project; onEdit: () => void; taskCount: number; overdue: number }) {
  const { tasks } = useWorkspace()
  const [menu, setMenu] = useState(false)
  const items = useProjectMenu(p, onEdit)
  const pr = projectProgress(p.id, tasks)
  const today = toDateKey(new Date())
  const daysLeft = p.target_date ? diffDays(today, p.target_date) : null

  return (
    <article className="group relative flex flex-col rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorHex(p.color) }} />
        <div className="min-w-0 flex-1">
          <Link href={`/proyectos/${p.id}`} className="block text-[16px] font-semibold tracking-[-0.01em] text-ink after:absolute after:inset-0 hover:underline">
            {p.name}
          </Link>
          {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink-dim">{p.description}</p>}
        </div>
        <div className="relative z-10">
          <button type="button" aria-label="Acciones del proyecto" aria-haspopup="menu" onClick={() => setMenu((v) => !v)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink">
            <MoreHorizontal size={16} />
          </button>
          <Menu open={menu} onClose={() => setMenu(false)} items={items} />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-ink-dim">{pr.total ? `${pr.done} de ${pr.total} tareas` : 'Sin tareas todavía'}</span>
          <span className="font-mono text-ink">{pr.total ? `${Math.round(pr.ratio * 100)}%` : '—'}</span>
        </div>
        <ProgressBar value={pr.ratio} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-dim">
        {p.status !== 'active' && <Badge tone={p.status === 'completed' ? 'success' : 'neutral'}>{PROJECT_STATUS_LABEL[p.status]}</Badge>}
        {p.priority >= 3 && <Badge tone="warm">Prioridad {p.priority === 4 ? 'urgente' : 'alta'}</Badge>}
        <span>{taskCount} abiertas</span>
        {overdue > 0 && (
          <span className="inline-flex items-center gap-1 text-danger">
            <AlertTriangle size={12} /> {overdue} vencidas
          </span>
        )}
        {p.target_date && (
          <span className={clsx('ml-auto inline-flex items-center gap-1', daysLeft !== null && daysLeft < 0 && p.status === 'active' && 'text-danger')}>
            <CalendarDays size={12} />
            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 ? `faltan ${daysLeft} d` : relativeDayLabel(p.target_date, today)}
          </span>
        )}
      </div>
    </article>
  )
}
