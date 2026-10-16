'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckSquare, Timer } from 'lucide-react'
import { Card, EmptyState, PageHeader, Segmented } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { formatMinutesShort, toDateKey } from '@/lib/kairo/dates'
import { delta, lastDays, summarize } from '@/lib/kairo/stats'
import { activityDays, isRangeKey, previousDays, RANGES, type RangeKey } from '../_lib/period'
import { KpiCard, LinkButton } from './parts'
import {
  ConsistencySection,
  DaypartSection,
  FocusSection,
  GoalsSection,
  ProjectsSection,
  TasksSection,
  WeekdaySection,
} from './sections'

const STORAGE_KEY = 'kairo.stats.range'

export function StatsView() {
  const tasks = useWorkspace((s) => s.tasks)
  const sessions = useWorkspace((s) => s.sessions)
  const projects = useWorkspace((s) => s.projects)
  const goals = useWorkspace((s) => s.goals)
  const dailyGoal = useWorkspace((s) => s.settings.dailyFocusGoalMinutes)

  const [range, setRange] = useState<RangeKey>('30')
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (isRangeKey(saved)) setRange(saved)
    } catch {
      /* almacenamiento no disponible: se queda el rango por defecto */
    }
  }, [])
  const changeRange = (r: RangeKey) => {
    setRange(r)
    try {
      localStorage.setItem(STORAGE_KEY, r)
    } catch {
      /* sin persistencia, sin problema */
    }
  }

  const today = useMemo(() => toDateKey(new Date()), [])
  const n = RANGES.find((r) => r.value === range)?.days ?? 30
  const period = `${n} días`

  const allActive = useMemo(() => activityDays(sessions, tasks), [sessions, tasks])
  const days = useMemo(() => lastDays(today, n), [today, n])
  const daySet = useMemo(() => new Set(days), [days])
  const cur = useMemo(() => summarize(sessions, tasks, days), [sessions, tasks, days])
  const prev = useMemo(() => summarize(sessions, tasks, previousDays(days)), [sessions, tasks, days])

  const header = (
    <PageHeader
      title="Estadísticas"
      description="Dónde va tu tiempo y cómo avanzas. Solo datos reales de tus sesiones y tareas."
      actions={
        allActive.size > 0 ? (
          <Segmented label="Periodo" value={range} onChange={changeRange} options={RANGES.map(({ value, label }) => ({ value, label }))} />
        ) : undefined
      }
    />
  )

  if (allActive.size === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        {header}
        <Card className="mt-6">
          <EmptyState
            icon={<BarChart3 size={18} />}
            title="Tus estadísticas empiezan con tu primer movimiento"
            description="Se llenan solas mientras trabajas: cada sesión de enfoque y cada tarea completada suma aquí. Nada inventado, solo lo que haces."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <LinkButton href="/enfoque" variant="primary" icon={<Timer size={15} />}>
                  Empezar a enfocarte
                </LinkButton>
                <LinkButton href="/tareas" icon={<CheckSquare size={15} />}>
                  Ver tus tareas
                </LinkButton>
              </div>
            }
          />
        </Card>
      </div>
    )
  }

  const common = { days, daySet, n, today, range }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      {header}

      <h2 className="sr-only">Resumen de los últimos {period}</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Tiempo de enfoque"
          value={formatMinutesShort(cur.focusMinutes)}
          delta={delta(cur.focusMinutes, prev.focusMinutes)}
          period={period}
        />
        <KpiCard
          label="Sesiones completadas"
          value={cur.completedSessions}
          delta={delta(cur.completedSessions, prev.completedSessions)}
          period={period}
        />
        <KpiCard label="Tareas completadas" value={cur.tasksDone} delta={delta(cur.tasksDone, prev.tasksDone)} period={period} />
        <KpiCard
          label="Días activos"
          value={cur.activeDays}
          unit={`de ${n}`}
          delta={delta(cur.activeDays, prev.activeDays)}
          period={period}
        />
      </div>

      <div className="mt-3 grid gap-3">
        <FocusSection key={`focus-${range}`} {...common} sessions={sessions} dailyGoal={dailyGoal} total={cur.focusMinutes} />

        <div className="grid gap-3 md:grid-cols-2">
          <TasksSection key={`tasks-${range}`} {...common} tasks={tasks} total={cur.tasksDone} />
          <WeekdaySection key={`wd-${range}`} {...common} sessions={sessions} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <DaypartSection key={`dp-${range}`} {...common} sessions={sessions} />
          <ConsistencySection {...common} allActive={allActive} />
        </div>

        <ProjectsSection key={`pr-${range}`} {...common} sessions={sessions} tasks={tasks} projects={projects} />
        <GoalsSection key={`go-${range}`} {...common} goals={goals} tasks={tasks} />
      </div>
    </div>
  )
}
