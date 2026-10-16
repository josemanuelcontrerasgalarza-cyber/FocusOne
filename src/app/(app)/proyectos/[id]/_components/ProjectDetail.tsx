'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { ArrowLeft, MoreHorizontal, Pencil, ChevronDown, CheckCircle2, Timer, Plus, Target, FolderX } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CardHeader, EmptyState, ProgressBar, ProgressRing, Stat } from '@/components/ui/primitives'
import { Menu } from '@/components/ui/Overlay'
import { QuickAddBar } from '@/components/tasks/QuickCapture'
import { TaskRow } from '@/components/tasks/TaskRow'
import { ProjectForm, PROJECT_STATUS_LABEL } from '@/components/projects/ProjectForm'
import { useProjectMenu } from '../../_components/ProjectsView'
import { projectProgress, goalProgress, sortTasks, dueBucket } from '@/lib/kairo/tasks'
import { sessionMinutes } from '@/lib/kairo/stats'
import { diffDays, relativeDayLabel, toDateKey, formatMinutes, formatMinutesShort } from '@/lib/kairo/dates'
import { colorHex } from '@/lib/colors'
import type { Project } from '@/lib/kairo/types'

export function ProjectDetail({ id }: { id: string }) {
  const project = useWorkspace((s) => s.projects.find((p) => p.id === id) ?? null)
  if (!project) {
    return (
      <EmptyState
        className="mt-16"
        icon={<FolderX size={18} />}
        title="Proyecto no encontrado"
        description="Puede que se haya eliminado o que el enlace no sea correcto."
        action={
          <Link href="/proyectos" className="text-sm text-accent-fg hover:underline">
            Volver a proyectos
          </Link>
        }
      />
    )
  }
  return <Detail project={project} />
}

function Detail({ project: p }: { project: Project }) {
  const router = useRouter()
  const { tasks, goals, sessions } = useWorkspace()
  const [menu, setMenu] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const items = useProjectMenu(p, () => setEditOpen(true), () => router.push('/proyectos'))
  const today = toDateKey(new Date())

  const own = useMemo(() => tasks.filter((t) => t.project_id === p.id && !t.parent_id), [tasks, p.id])
  const open = sortTasks(own.filter((t) => t.status !== 'completed'), 'due')
  const done = sortTasks(own.filter((t) => t.status === 'completed'), 'created')
  const pr = projectProgress(p.id, tasks)
  const overdue = open.filter((t) => dueBucket(t, today) === 'overdue').length
  const ownIds = useMemo(() => new Set(tasks.filter((t) => t.project_id === p.id).map((t) => t.id)), [tasks, p.id])
  const projectSessions = sessions.filter((s) => s.task_id && ownIds.has(s.task_id))
  const focusMin = Math.round(projectSessions.reduce((a, s) => a + sessionMinutes(s), 0))
  const linkedGoals = goals.filter((g) => g.project_id === p.id)
  const daysLeft = p.target_date ? diffDays(today, p.target_date) : null

  const activity = useMemo(() => {
    const ev: { at: string; text: string; icon: React.ReactNode }[] = []
    for (const t of tasks) {
      if (t.project_id !== p.id) continue
      if (t.completed_at) ev.push({ at: t.completed_at, text: `Completaste «${t.title}»`, icon: <CheckCircle2 size={13} className="text-success" /> })
      ev.push({ at: t.created_at, text: `Añadiste «${t.title}»`, icon: <Plus size={13} className="text-ink-faint" /> })
    }
    for (const s of projectSessions) {
      const t = tasks.find((x) => x.id === s.task_id)
      ev.push({ at: s.started_at, text: `${formatMinutes(sessionMinutes(s))} de enfoque en «${t?.title ?? 'tarea'}»`, icon: <Timer size={13} className="text-accent-fg" /> })
    }
    return ev.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12)
  }, [tasks, projectSessions, p.id])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <Link href="/proyectos" className="inline-flex items-center gap-1.5 text-[13px] text-ink-dim hover:text-ink">
        <ArrowLeft size={14} /> Proyectos
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorHex(p.color) }} />
            <h1 className="truncate text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[32px]">{p.name}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
            <Badge tone={p.status === 'active' ? 'accent' : p.status === 'completed' ? 'success' : 'neutral'}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
            {p.priority >= 3 && <Badge tone="warm">Prioridad {p.priority === 4 ? 'urgente' : 'alta'}</Badge>}
          </div>
          {p.description && <p className="mt-3 max-w-2xl pl-6 text-[15px] text-ink-dim">{p.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          <div className="relative">
            <Button variant="ghost" aria-label="Más acciones" aria-haspopup="menu" onClick={() => setMenu((v) => !v)}>
              <MoreHorizontal size={16} />
            </Button>
            <Menu open={menu} onClose={() => setMenu(false)} items={items} />
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-4 rounded-card border border-line bg-surface p-5 sm:grid-cols-4">
        <div className="flex items-center gap-4 sm:col-span-1">
          <ProgressRing value={pr.ratio} size={64} stroke={5}>
            <span className="font-mono text-xs font-medium text-ink">{pr.total ? `${Math.round(pr.ratio * 100)}%` : '—'}</span>
          </ProgressRing>
          <div>
            <p className="k-eyebrow">Avance</p>
            <p className="mt-1 text-sm text-ink">
              {pr.done}/{pr.total} tareas
            </p>
          </div>
        </div>
        <Stat label="Abiertas" value={open.length} hint={overdue ? <span className="text-danger">{overdue} vencidas</span> : 'Nada vencido'} />
        <Stat label="Enfoque" value={formatMinutesShort(focusMin)} hint={`${projectSessions.length} sesiones`} />
        <Stat
          label="Fecha objetivo"
          value={p.target_date ? relativeDayLabel(p.target_date, today) : '—'}
          hint={daysLeft == null ? 'Sin fecha límite' : daysLeft >= 0 ? `Faltan ${daysLeft} días` : <span className="text-danger">Hace {-daysLeft} días</span>}
        />
      </div>
      {pr.total > 0 && <ProgressBar value={pr.ratio} className="mt-3" />}

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <QuickAddBar defaults={{ project_id: p.id }} placeholder={`Añade una tarea a ${p.name}…`} />
          <Card>
            <CardHeader title={`Tareas abiertas · ${open.length}`} />
            <div className="px-1.5 pb-2">
              {open.length ? (
                open.map((t) => <TaskRow key={t.id} task={t} today={today} showProject={false} />)
              ) : (
                <EmptyState compact title={pr.total ? 'Todo hecho aquí' : 'Sin tareas todavía'} description={pr.total ? '¿Lo marcas como completado?' : 'Escribe arriba la primera tarea del proyecto.'} />
              )}
            </div>
            {done.length > 0 && (
              <div className="border-t border-line px-1.5 py-2">
                <button
                  type="button"
                  onClick={() => setShowDone((v) => !v)}
                  aria-expanded={showDone}
                  className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-dim hover:text-ink"
                >
                  <ChevronDown size={14} className={clsx('transition-transform', !showDone && '-rotate-90')} />
                  Completadas · {done.length}
                </button>
                {showDone && done.map((t) => <TaskRow key={t.id} task={t} today={today} showProject={false} dense />)}
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <Card>
            <CardHeader
              eyebrow="Objetivos"
              title="Vinculados"
              action={
                <Link href="/objetivos?nuevo=1" className="text-[13px] text-ink-dim hover:text-ink">
                  Nuevo
                </Link>
              }
            />
            <div className="space-y-3 px-4 pb-4">
              {linkedGoals.length ? (
                linkedGoals.map((g) => {
                  const gp = goalProgress(g, tasks)
                  return (
                    <div key={g.id}>
                      <div className="mb-1.5 flex items-center gap-2 text-sm">
                        <Target size={13} className="text-ink-faint" />
                        <span className="min-w-0 flex-1 truncate text-ink">{g.title}</span>
                        <span className="font-mono text-xs text-ink-faint">{Math.round(gp.ratio * 100)}%</span>
                      </div>
                      <ProgressBar value={gp.ratio} />
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-ink-dim">Vincula un objetivo a este proyecto desde Objetivos.</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow="Actividad" title="Reciente" />
            <div className="px-4 pb-4">
              {activity.length ? (
                <ol className="space-y-2.5">
                  {activity.map((a, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px]">
                      <span className="mt-0.5">{a.icon}</span>
                      <div className="min-w-0">
                        <p className="text-ink">{a.text}</p>
                        <p className="font-mono text-[10px] text-ink-faint">{relativeDayLabel(toDateKey(new Date(a.at)), today)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-dim">Aún no hay actividad.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <ProjectForm open={editOpen} onClose={() => setEditOpen(false)} project={p} />
    </div>
  )
}
