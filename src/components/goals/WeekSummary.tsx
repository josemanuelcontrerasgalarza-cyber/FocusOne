'use client'

import { useMemo, type ReactNode } from 'react'
import { useWorkspace } from '@/store/workspace'
import { diffDays, formatMinutesShort, range, startOfWeek } from '@/lib/kairo/dates'
import { summarize } from '@/lib/kairo/stats'
import { weekCount } from '@/lib/kairo/streaks'
import { ProgressBar } from '@/components/ui/primitives'
import { shortDate } from './format'

function Metric({
  label,
  value,
  goal,
  ratio,
  hint,
}: {
  label: string
  value: ReactNode
  goal?: ReactNode
  ratio: number | null
  hint: ReactNode
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <p className="k-eyebrow">{label}</p>
      <p className="mt-1.5 font-mono text-[24px] font-medium leading-none tracking-[-0.02em] text-ink">
        {value}
        {goal != null && <span className="ml-1 text-[13px] font-normal tracking-normal text-ink-faint">/ {goal}</span>}
      </p>
      {ratio != null ? (
        <ProgressBar value={ratio} className="mt-3" tone={ratio >= 1 ? 'accent' : 'ink'} />
      ) : (
        <div className="mt-3 h-1.5 rounded-full bg-sunken" aria-hidden />
      )}
      <p className="mt-2 text-xs text-ink-dim">{hint}</p>
    </div>
  )
}

/** Metas semanales con datos reales (lunes → domingo). */
export function WeekSummary({ today }: { today: string }) {
  const { tasks, sessions, habits, habitLogs, settings } = useWorkspace()

  const data = useMemo(() => {
    const start = startOfWeek(today)
    const days = range(start, 7)
    const s = summarize(sessions, tasks, days)
    const taskGoal = Math.max(0, settings.dailyTaskGoal * 7)
    const focusGoal = Math.max(0, settings.dailyFocusGoalMinutes * 7)

    const active = habits.filter((h) => !h.archived)
    let habitDone = 0
    let habitTarget = 0
    for (const h of active) {
      const target = Math.max(1, Math.min(7, h.target_per_week))
      const dates = habitLogs.filter((l) => l.habit_id === h.id).map((l) => l.log_date)
      habitDone += Math.min(target, weekCount(dates, today))
      habitTarget += target
    }
    return {
      start,
      end: days[6],
      dayN: diffDays(start, today) + 1,
      s,
      taskGoal,
      focusGoal,
      habitsActive: active.length,
      habitDone,
      habitTarget,
    }
  }, [today, sessions, tasks, habits, habitLogs, settings.dailyTaskGoal, settings.dailyFocusGoalMinutes])

  const { s } = data
  const taskRatio = data.taskGoal ? s.tasksDone / data.taskGoal : null
  const focusRatio = data.focusGoal ? s.focusMinutes / data.focusGoal : null
  const habitRatio = data.habitTarget ? data.habitDone / data.habitTarget : null

  return (
    <section aria-labelledby="semana-title" className="rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-2 px-4 pt-4 sm:px-5">
        <div>
          <p className="k-eyebrow mb-0.5">
            {shortDate(data.start, today)} – {shortDate(data.end, today)}
          </p>
          <h2 id="semana-title" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Esta semana
          </h2>
        </div>
        <p className="font-mono text-xs text-ink-faint">Día {data.dayN} de 7</p>
      </div>
      <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Metric
          label="Tareas completadas"
          value={s.tasksDone}
          goal={data.taskGoal || undefined}
          ratio={taskRatio}
          hint={
            !data.taskGoal
              ? 'Sin meta diaria de tareas en Ajustes.'
              : s.tasksDone >= data.taskGoal
                ? 'Meta semanal alcanzada.'
                : `Meta: ${settings.dailyTaskGoal} al día.`
          }
        />
        <Metric
          label="Enfoque"
          value={formatMinutesShort(s.focusMinutes)}
          goal={data.focusGoal ? formatMinutesShort(data.focusGoal) : undefined}
          ratio={focusRatio}
          hint={
            !data.focusGoal
              ? 'Sin meta diaria de enfoque en Ajustes.'
              : s.focusMinutes >= data.focusGoal
                ? 'Meta semanal alcanzada.'
                : `${s.sessions ? `${s.sessions} ${s.sessions === 1 ? 'sesión' : 'sesiones'} · ` : ''}meta: ${formatMinutesShort(settings.dailyFocusGoalMinutes)} al día.`
          }
        />
        <Metric
          label="Hábitos"
          value={habitRatio != null ? `${Math.round(habitRatio * 100)} %` : '—'}
          ratio={habitRatio}
          hint={
            data.habitsActive
              ? `${data.habitDone} de ${data.habitTarget} registros de la semana.`
              : 'Crea un hábito para medirlo aquí.'
          }
        />
      </div>
    </section>
  )
}
