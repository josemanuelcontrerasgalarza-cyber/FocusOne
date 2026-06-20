'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Zap, ArrowRight, Target, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { GlassPanel } from '@/glass/GlassPanel'
import { PlasmaBar } from '@/glass/PlasmaBar'
import { Button } from '@/glass/Button'
import { useTaskStore } from '@/store/taskStore'
import { useCosmos } from '@/cosmos/state/useCosmos'
import { DailyGoal } from '@/components/DailyGoal'
import { Agenda } from '@/components/Agenda'
import { type Task, type Project, type AgendaTask } from '@/types'

interface Props {
  userId: string
  mainProject: Project | null
  otherProjects: Project[]
  pendingTasks: Task[]
  agenda: AgendaTask[]
  completedToday: number
}

export function DashboardClient({
  userId,
  mainProject,
  otherProjects,
  pendingTasks,
  agenda,
  completedToday,
}: Props) {
  const { completeTask } = useTaskStore()
  const router = useRouter()
  const [tasks, setTasks] = useState(pendingTasks)
  const [agendaItems, setAgendaItems] = useState(agenda)
  // Avance optimista de la meta: refleja al instante lo completado en esta vista
  const [doneToday, setDoneToday] = useState(completedToday)

  async function handleComplete(taskId: string, projectId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setAgendaItems((prev) => prev.filter((t) => t.id !== taskId))
    setDoneToday((n) => n + 1)
    await completeTask(taskId, projectId)
    useCosmos.getState().celebrate()
    router.refresh()
  }

  return (
    <>
      {/* Meta diaria + agenda */}
      <div className={agendaItems.length > 0 ? 'grid gap-4 md:grid-cols-2' : ''}>
        <DailyGoal userId={userId} completedToday={doneToday} delay={0.12} />
        {agendaItems.length > 0 && (
          <Agenda items={agendaItems} onComplete={handleComplete} delay={0.14} />
        )}
      </div>

      {mainProject ? (
        <GlassPanel className="p-6 card-accent-core" delay={0.15}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-data text-[11px] uppercase tracking-[0.25em] text-core">
                ◉ Misión principal
              </p>
              <h2 className="mt-1 truncate font-display text-xl font-semibold">{mainProject.name}</h2>
              {mainProject.goal && (
                <p className="mt-1 text-sm text-ink-dim">{mainProject.goal}</p>
              )}
            </div>
            <span className="font-data text-2xl font-semibold text-core">{mainProject.progress}%</span>
          </div>
          <PlasmaBar value={mainProject.progress} className="mt-4" />

          <div className="mt-5 flex flex-col gap-2">
            {tasks.length === 0 && (
              <p className="rounded-xl border border-glass-border bg-black/20 px-3 py-3 text-sm text-ink-ghost">
                Sin objetivos pendientes. Añade el siguiente paso desde la página de misión.
              </p>
            )}
            <AnimatePresence initial={false}>
              {tasks.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-xl border border-glass-border bg-black/20 px-3 py-2.5"
                >
                  <button
                    onClick={() => handleComplete(t.id, t.project_id)}
                    className="group flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-core/50 transition-all hover:border-core hover:bg-core/20 hover:shadow-glow-core"
                    title="Completar"
                  >
                    <CheckCircle2 size={11} className="opacity-0 text-core transition-opacity group-hover:opacity-100" />
                  </button>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  {t.priority === 'high' && (
                    <span className="badge badge-nova">Alta</span>
                  )}
                  {t.priority === 'medium' && (
                    <span className="badge badge-solar">Media</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-5 flex gap-2">
            <Link href="/focus">
              <Button variant="solid-core" size="md">
                <Zap size={15} /> Deep Work
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
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ink-ghost/10">
            <Target className="text-ink-ghost" size={28} />
          </div>
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
        <div>
          <p className="mb-3 font-data text-[10px] uppercase tracking-[0.25em] text-ink-ghost">
            En órbita
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherProjects.map((p, i) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <GlassPanel className="p-4 transition-all hover:border-glass-border-hi" delay={0.2 + i * 0.05}>
                  <p className="truncate font-display text-sm font-medium">{p.name}</p>
                  <PlasmaBar value={p.progress} size="sm" className="mt-3" />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-data text-xs text-ink-ghost">{p.progress}% completado</p>
                    <ArrowRight size={12} className="text-ink-ghost" />
                  </div>
                </GlassPanel>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
