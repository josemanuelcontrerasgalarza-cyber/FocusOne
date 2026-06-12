'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Flame, CheckCircle2, Trophy, Zap, ArrowRight, Target } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { HoloStat } from '@/glass/HoloStat'
import { PlasmaBar } from '@/glass/PlasmaBar'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { useTaskStore } from '@/store/taskStore'
import { useCosmos } from '@/cosmos/state/useCosmos'

function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { mainProject, projects, fetchProjects } = useProjectStore()
  const { tasks, fetchTasks, completeTask } = useTaskStore()

  useEffect(() => {
    if (user?.id) fetchProjects(user.id)
  }, [user?.id, fetchProjects])

  useEffect(() => {
    if (mainProject?.id) fetchTasks(mainProject.id)
  }, [mainProject?.id, fetchTasks])

  const pending = tasks.filter((t) => t.status === 'pending').slice(0, 5)

  async function handleComplete(taskId: string) {
    if (!mainProject) return
    await completeTask(taskId, mainProject.id)
    useCosmos.getState().celebrate()
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
          Centro de mando
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Hola, <span className="text-gradient">{user?.name ?? 'piloto'}</span>
        </h1>
      </header>

      {/* Telemetría */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <HoloStat label="Racha" value={`${user?.streak_current ?? 0}d`} icon={<Flame size={16} />} accent="solar" />
        <HoloStat label="Completadas" value={user?.tasks_completed_total ?? 0} icon={<CheckCircle2 size={16} />} accent="core" delay={0.05} />
        <HoloStat label="Récord" value={`${user?.streak_best ?? 0}d`} icon={<Trophy size={16} />} accent="plasma" delay={0.1} />
      </div>

      {/* Misión principal */}
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

          {/* Objetivos en órbita */}
          <div className="mt-5 flex flex-col gap-2">
            {pending.length === 0 && (
              <p className="text-sm text-ink-ghost">
                Sin objetivos pendientes. Añade el siguiente paso de tu misión.
              </p>
            )}
            {pending.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-3 rounded-xl border border-glass-border bg-black/20 px-3 py-2.5"
              >
                <button
                  onClick={() => handleComplete(t.id)}
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

      {/* Otras misiones */}
      {projects.filter((p) => !p.is_main && p.status === 'active').length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects
            .filter((p) => !p.is_main && p.status === 'active')
            .slice(0, 4)
            .map((p, i) => (
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
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  )
}
