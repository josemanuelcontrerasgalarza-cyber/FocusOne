'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Zap, ArrowRight, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { GlassPanel } from '@/glass/GlassPanel'
import { PlasmaBar } from '@/glass/PlasmaBar'
import { Button } from '@/glass/Button'
import { useTaskStore } from '@/store/taskStore'
import { useCosmos } from '@/cosmos/state/useCosmos'
import { type Task, type Project } from '@/types'

interface Props {
  mainProject: Project | null
  otherProjects: Project[]
  pendingTasks: Task[]
}

/**
 * Parte interactiva del dashboard: recibe los datos pre-cargados del RSC
 * y maneja únicamente las interacciones del usuario (completar tarea, celebrate).
 */
export function DashboardClient({ mainProject, otherProjects, pendingTasks }: Props) {
  const { completeTask } = useTaskStore()
  const router = useRouter()
  const [tasks, setTasks] = useState(pendingTasks)

  async function handleComplete(taskId: string, projectId: string) {
    // Optimistic: quita la tarea de la lista al instante
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    await completeTask(taskId, projectId)
    useCosmos.getState().celebrate()
    // Revalida la página para que el RSC re-lea el progreso actualizado
    router.refresh()
  }

  return (
    <>
      {mainProject ? (
        <GlassPanel className="p-6" delay={0.15}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-data text-[11px] uppercase tracking-[0.25em] text-core">
                ◉ Misión principal
              </p>
              <h2 className="mt-1 truncate font-display text-xl font-semibold">{mainProject.name}</h2>
              {mainProject.goal && <p className="mt-1 text-sm text-ink-dim">{mainProject.goal}</p>}
            </div>
            <span className="font-data text-2xl font-semibold text-core">{mainProject.progress}%</span>
          </div>
          <PlasmaBar value={mainProject.progress} className="mt-4" />

          <div className="mt-5 flex flex-col gap-2">
            {tasks.length === 0 && (
              <p className="text-sm text-ink-ghost">
                Sin objetivos pendientes. Añade el siguiente paso de tu misión.
              </p>
            )}
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-glass-border bg-black/20 px-3 py-2.5"
              >
                <button
                  onClick={() => handleComplete(t.id, t.project_id)}
                  className="h-5 w-5 shrink-0 rounded-full border border-core/50 transition-all hover:bg-core/30 hover:shadow-glow-core"
                  title="Completar"
                />
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                {t.priority === 'high' && (
                  <span className="font-data text-[10px] uppercase tracking-wider text-nova">Alta</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <Link href="/focus">
              <Button variant="core" size="md">
                <Zap size={15} /> Iniciar Deep Work
              </Button>
            </Link>
            <Link href={`/projects/${mainProject.id}`}>
              <Button variant="ghost" size="md">
                Ver misión <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel className="p-8 text-center" delay={0.15}>
          <Target className="mx-auto mb-3 text-ink-ghost" size={32} />
          <h2 className="font-display text-lg font-semibold">Sin misión principal</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-dim">
            Elige UNA misión y termínala. Esa es la regla de FocusOne.
          </p>
          <Link href="/projects" className="mt-4 inline-block">
            <Button variant="plasma">Definir misión principal</Button>
          </Link>
        </GlassPanel>
      )}

      {otherProjects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {otherProjects.map((p, i) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <GlassPanel className="p-4" delay={0.2 + i * 0.05}>
                <p className="truncate font-display text-sm font-medium">{p.name}</p>
                <PlasmaBar value={p.progress} className="mt-3" />
                <p className="mt-2 font-data text-xs text-ink-ghost">{p.progress}% completado</p>
              </GlassPanel>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
