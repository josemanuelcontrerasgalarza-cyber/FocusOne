'use client'

import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { BarChart, BarList, ChartEmpty, type BarDatum, type BarListItem } from '@/components/charts'
import { colorHex } from '@/lib/colors'
import { fromDateKey, formatMinutes, formatMinutesShort, weekday, WEEKDAYS_SHORT } from '@/lib/kairo/dates'
import { byProject, dayOf, focusByDay, focusByDaypart, focusByWeekday, tasksDoneByDay, type DayPoint } from '@/lib/kairo/stats'
import { bestDailyStreak, dailyStreak } from '@/lib/kairo/streaks'
import { goalProgress, projectProgress } from '@/lib/kairo/tasks'
import type { FocusSession, Goal, Project, Task } from '@/lib/kairo/types'
import {
  argMax,
  dayLabel,
  formatPct,
  plural,
  shortDate,
  tasksForPeriod,
  weekBuckets,
  WEEKDAYS_MON_LONG,
  WEEKDAYS_MON_SHORT,
  type RangeKey,
} from '../_lib/period'
import { LinkButton, Panel } from './parts'

interface Common {
  days: string[]
  daySet: Set<string>
  n: number
  today: string
  range: RangeKey
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const tickMinutes = (v: number) => (v === 0 ? '0' : formatMinutesShort(v))
const num = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })
const sessionsIn = (sessions: FocusSession[], daySet: Set<string>) => sessions.filter((s) => daySet.has(dayOf(s.started_at)))

/** Serie diaria → datos del gráfico (por día o, en 90 días, por semana). */
function toBars(points: DayPoint[], weekly: boolean, opts: { target?: number; noteFor?: (value: number, target: number) => string | null } = {}): BarDatum[] {
  const { target = 0, noteFor } = opts
  if (weekly) {
    return weekBuckets(points).map((b) => {
      const t = target * b.days.length
      const notes = [
        b.days.length < 7 ? `${plural(b.days.length, 'día')} dentro del periodo` : null,
        t > 0 && noteFor ? noteFor(b.value, t) : null,
      ].filter(Boolean)
      return {
        key: b.start,
        tick: shortDate(b.start),
        label: `Semana del ${shortDate(b.start)}`,
        value: b.value,
        target: t > 0 ? t : null,
        note: notes.length ? notes.join(' · ') : undefined,
      }
    })
  }
  return points.map((p) => ({
    key: p.day,
    tick: WEEKDAYS_SHORT[weekday(p.day)],
    tickSub: String(fromDateKey(p.day).getDate()),
    label: dayLabel(p.day),
    value: p.value,
    target: target > 0 ? target : null,
    note: (target > 0 && noteFor ? noteFor(p.value, target) : null) ?? undefined,
  }))
}

/* ───────────────────────── Enfoque por día ───────────────────────── */

export function FocusSection({
  days,
  n,
  range,
  sessions,
  dailyGoal,
  total,
}: Common & { sessions: FocusSession[]; dailyGoal: number; total: number }) {
  const daily = useMemo(() => focusByDay(sessions, days), [sessions, days])
  const weekly = range === '90'
  const goal = dailyGoal > 0 ? dailyGoal : 0
  const data = useMemo(
    () => toBars(daily, weekly, { target: goal, noteFor: (v, t) => (v > 0 ? `${formatPct(v / t)} de la meta` : null) }),
    [daily, weekly, goal],
  )
  const metDays = goal ? daily.filter((p) => p.value >= goal).length : 0
  const bestIdx = argMax(daily.map((p) => p.value))
  const title = weekly ? 'Enfoque por semana' : 'Enfoque por día'

  const summary = [
    `${title}, últimos ${n} días.`,
    `Total ${formatMinutes(total)}, media de ${formatMinutes(total / n)} al día.`,
    bestIdx != null ? `Día con más enfoque: ${dayLabel(daily[bestIdx].day)}, ${formatMinutes(daily[bestIdx].value)}.` : '',
    goal ? `Meta diaria de ${formatMinutes(goal)} cumplida ${metDays} de ${n} días.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Panel
      title={title}
      subtitle={weekly ? 'Minutos de enfoque por semana (de lunes a domingo).' : 'Minutos de enfoque cada día.'}
      aside={
        total > 0 && (
          <>
            <p>
              Media <span className="font-mono text-ink">{formatMinutesShort(total / n)}</span> al día
            </p>
            {goal > 0 && (
              <p className="mt-0.5 text-ink-faint">
                Meta cumplida {metDays} de {n} días
              </p>
            )}
          </>
        )
      }
    >
      {total > 0 ? (
        <BarChart
          title={title}
          summary={summary}
          data={data}
          kind="minutes"
          format={formatMinutesShort}
          formatTick={tickMinutes}
          formatLong={formatMinutes}
          height={220}
          categoryHeader={weekly ? 'Semana' : 'Día'}
          valueHeader="Enfoque"
          seriesLabel="Enfoque"
          targetLabel={goal ? (weekly ? `Meta (${formatMinutesShort(goal)} al día)` : `Meta diaria · ${formatMinutesShort(goal)}`) : undefined}
        />
      ) : (
        <ChartEmpty height={220} hint="Inicia una sesión en Enfoque y la verás aquí." />
      )}
    </Panel>
  )
}

/* ───────────────────────── Tareas completadas ───────────────────────── */

export function TasksSection({ days, n, range, tasks, total }: Common & { tasks: Task[]; total: number }) {
  const daily = useMemo(() => tasksDoneByDay(tasks, days), [tasks, days])
  const weekly = range === '90'
  const data = useMemo(() => toBars(daily, weekly), [daily, weekly])
  const title = weekly ? 'Tareas completadas por semana' : 'Tareas completadas por día'
  const bestIdx = argMax(daily.map((p) => p.value))
  const avg = num.format(Math.round((total / n) * 10) / 10)
  const tareas = (v: number) => plural(v, 'tarea completada', 'tareas completadas')

  const summary = [
    `${title}, últimos ${n} días.`,
    `${tareas(total)}, media de ${avg} al día.`,
    bestIdx != null ? `Día con más tareas: ${dayLabel(daily[bestIdx].day)}, ${daily[bestIdx].value}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Panel
      title="Tareas completadas"
      subtitle={weekly ? 'Por semana.' : 'Por día.'}
      aside={
        total > 0 && (
          <p>
            Media <span className="font-mono text-ink">{avg}</span> al día
          </p>
        )
      }
    >
      {total > 0 ? (
        <BarChart
          title={title}
          summary={summary}
          data={data}
          kind="count"
          tone="ink"
          format={(v) => String(v)}
          formatLong={tareas}
          height={180}
          categoryHeader={weekly ? 'Semana' : 'Día'}
          valueHeader="Tareas completadas"
        />
      ) : (
        <ChartEmpty height={180} hint="Completa una tarea y empezará a contar." />
      )}
    </Panel>
  )
}

/* ───────────────────────── Días de mayor actividad ───────────────────────── */

export function WeekdaySection({ daySet, n, sessions }: Common & { sessions: FocusSession[] }) {
  const values = useMemo(() => mondayFirstFocus(sessionsIn(sessions, daySet)), [sessions, daySet])
  const total = values.reduce((a, b) => a + b, 0)
  const top = argMax(values)
  const data: BarDatum[] = values.map((v, i) => ({
    key: WEEKDAYS_MON_SHORT[i],
    tick: WEEKDAYS_MON_SHORT[i],
    label: cap(WEEKDAYS_MON_LONG[i]),
    value: v,
    note: total > 0 && v > 0 ? `${formatPct(v / total)} del enfoque` : undefined,
  }))
  const summary =
    top != null
      ? `Enfoque por día de la semana, últimos ${n} días. El ${WEEKDAYS_MON_LONG[top]} es tu día más fuerte, con ${formatMinutes(values[top])}.`
      : ''

  return (
    <Panel
      title="Días de mayor actividad"
      subtitle="Enfoque acumulado por día de la semana."
      aside={
        top != null && (
          <p>
            Tu día fuerte: <span className="font-medium text-ink">{WEEKDAYS_MON_LONG[top]}</span>
          </p>
        )
      }
    >
      {top != null ? (
        <BarChart
          title="Enfoque por día de la semana"
          summary={summary}
          data={data}
          kind="minutes"
          format={formatMinutesShort}
          formatTick={tickMinutes}
          formatLong={formatMinutes}
          highlightIndex={top}
          height={180}
          categoryHeader="Día de la semana"
          valueHeader="Enfoque"
        />
      ) : (
        <ChartEmpty height={180} />
      )}
    </Panel>
  )
}

function mondayFirstFocus(sessions: FocusSession[]): number[] {
  const byDay = focusByWeekday(sessions)
  return [1, 2, 3, 4, 5, 6, 0].map((i) => byDay[i])
}

/* ───────────────────────── Distribución del tiempo ───────────────────────── */

const DAYPART_META: Record<string, { hours: string; phrase: string }> = {
  Madrugada: { hours: '0–6 h', phrase: 'de madrugada' },
  Mañana: { hours: '6–12 h', phrase: 'por la mañana' },
  Tarde: { hours: '12–19 h', phrase: 'por la tarde' },
  Noche: { hours: '19–24 h', phrase: 'por la noche' },
}

export function DaypartSection({ daySet, sessions }: Common & { sessions: FocusSession[] }) {
  const parts = useMemo(() => focusByDaypart(sessionsIn(sessions, daySet)), [sessions, daySet])
  const total = parts.reduce((a, p) => a + p.minutes, 0)
  const top = argMax(parts.map((p) => p.minutes))
  const items: BarListItem[] = parts.map((p, i) => ({
    key: p.label,
    label: (
      <>
        {p.label} <span className="ml-1 font-mono text-2xs text-ink-faint">{DAYPART_META[p.label]?.hours}</span>
      </>
    ),
    value: p.minutes,
    display: formatMinutesShort(p.minutes),
    secondary: total > 0 ? formatPct(p.minutes / total) : undefined,
    muted: top != null && i !== top,
  }))

  return (
    <Panel
      title="Distribución del tiempo"
      subtitle="Cuándo te enfocas a lo largo del día."
      aside={top != null && <p>Más enfoque {DAYPART_META[parts[top].label]?.phrase ?? parts[top].label.toLowerCase()}</p>}
    >
      {total > 0 ? <BarList items={items} max={total} label="Enfoque por franja horaria" /> : <ChartEmpty height={168} />}
    </Panel>
  )
}

/* ───────────────────────── Constancia ───────────────────────── */

export function ConsistencySection({ days, n, today, allActive }: Common & { allActive: Set<string> }) {
  const current = dailyStreak(allActive, today)
  const best = bestDailyStreak(allActive)
  const activeInPeriod = days.filter((d) => allActive.has(d)).length
  const cols = n === 7 ? 7 : n === 30 ? 15 : 18

  let message: string
  if (current === 0) message = best > 0 ? 'Hoy puedes empezar una racha nueva.' : 'Tu primera racha empieza el día que actúes.'
  else if (!allActive.has(today)) message = 'Hoy todavía suma: un paso pequeño mantiene la racha.'
  else if (current >= best) message = 'Estás en tu mejor racha.'
  else message = `Te faltan ${plural(best - current + 1, 'día')} para superar tu mejor racha.`

  return (
    <Panel title="Constancia" subtitle="Un día cuenta si completas una tarea o te enfocas un rato.">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="k-eyebrow">Racha actual</p>
          <p className="mt-1 font-mono text-[26px] font-medium leading-none tracking-[-0.02em] text-ink">
            {current}
            <span className="ml-1 text-sm font-normal text-ink-faint">{current === 1 ? 'día' : 'días'}</span>
          </p>
        </div>
        <div>
          <p className="k-eyebrow">Mejor racha</p>
          <p className="mt-1 font-mono text-[26px] font-medium leading-none tracking-[-0.02em] text-ink">
            {best}
            <span className="ml-1 text-sm font-normal text-ink-faint">{best === 1 ? 'día' : 'días'}</span>
          </p>
          <p className="mt-1 text-2xs text-ink-faint">últimos 6 meses</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-dim">{message}</p>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2 text-2xs text-ink-faint">
          <span>
            <span className="font-mono text-ink-dim">{activeInPeriod}</span> de {n} días con actividad
          </span>
          <span className="inline-flex items-center gap-2" aria-hidden>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-[2px] bg-accent-fg" />
              Activo
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-[2px] bg-sunken ring-1 ring-inset ring-line" />
              Sin actividad
            </span>
          </span>
        </div>
        <div className="mt-2 grid max-w-[420px] gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden>
          {days.map((d) => {
            const on = allActive.has(d)
            return (
              <span
                key={d}
                title={`${dayLabel(d)} · ${on ? 'con actividad' : 'sin actividad'}`}
                className={
                  'aspect-square rounded-[3px] ' +
                  (on ? 'bg-accent-fg' : 'bg-sunken') +
                  (d === today ? ' outline outline-1 outline-offset-1 outline-ink-faint' : '')
                }
              />
            )
          })}
        </div>
      </div>
    </Panel>
  )
}

/* ───────────────────────── Por proyecto ───────────────────────── */

const MAX_ROWS = 6

export function ProjectsSection({
  daySet,
  sessions,
  tasks,
  projects,
}: Common & { sessions: FocusSession[]; tasks: Task[]; projects: Project[] }) {
  const rows = useMemo(() => {
    const all = byProject(sessionsIn(sessions, daySet), tasksForPeriod(tasks, daySet), projects)
    if (all.length <= MAX_ROWS) return all
    const head = all.slice(0, MAX_ROWS - 1)
    const rest = all.slice(MAX_ROWS - 1)
    return [
      ...head,
      {
        id: '__otros',
        name: `Otros (${rest.length})`,
        color: 'slate',
        minutes: rest.reduce((a, r) => a + r.minutes, 0),
        tasksDone: rest.reduce((a, r) => a + r.tasksDone, 0),
      },
    ]
  }, [sessions, tasks, projects, daySet])

  const byMinutes = rows.some((r) => r.minutes > 0)
  const items: BarListItem[] = rows.map((r) => ({
    key: r.id ?? '__none',
    label: r.name,
    color: colorHex(r.color),
    value: byMinutes ? r.minutes : r.tasksDone,
    display: byMinutes ? formatMinutesShort(r.minutes) : plural(r.tasksDone, 'tarea'),
    secondary: byMinutes ? plural(r.tasksDone, 'tarea') : undefined,
  }))

  const active = useMemo(
    () =>
      projects
        .filter((p) => p.status === 'active')
        .map((p) => ({ p, prog: projectProgress(p.id, tasks) }))
        .sort((a, b) => Number(b.prog.total > 0) - Number(a.prog.total > 0) || b.prog.ratio - a.prog.ratio || a.p.name.localeCompare(b.p.name, 'es')),
    [projects, tasks],
  )
  const activeItems: BarListItem[] = active.slice(0, MAX_ROWS).map(({ p, prog }) => ({
    key: p.id,
    label: p.name,
    color: colorHex(p.color),
    value: prog.ratio,
    display: prog.total ? formatPct(prog.ratio) : '—',
    secondary: prog.total ? `${prog.done}/${prog.total}` : 'sin tareas',
  }))

  return (
    <Panel title="Por proyecto" subtitle="A qué dedicas el enfoque y cómo avanzan tus proyectos.">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="min-w-0">
          <h3 className="k-eyebrow mb-3">En este periodo</h3>
          {items.length ? (
            <BarList items={items} label="Enfoque y tareas por proyecto en el periodo" />
          ) : (
            <ChartEmpty height={140} hint="Enfócate en tareas con proyecto para ver aquí su reparto." />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="k-eyebrow mb-3">Avance de proyectos activos</h3>
          {activeItems.length ? (
            <>
              <BarList items={activeItems} max={1} label="Avance de proyectos activos" />
              {active.length > MAX_ROWS && (
                <div className="mt-3">
                  <LinkButton href="/proyectos" variant="quiet" size="sm" icon={<ArrowRight size={14} />}>
                    Ver los {active.length} proyectos
                  </LinkButton>
                </div>
              )}
            </>
          ) : (
            <ChartEmpty
              height={140}
              title="Sin proyectos activos"
              hint="Agrupa tus tareas en proyectos para seguir su avance."
            />
          )}
        </div>
      </div>
    </Panel>
  )
}

/* ───────────────────────── Objetivos ───────────────────────── */

export function GoalsSection({ daySet, n, goals, tasks }: Common & { goals: Goal[]; tasks: Task[] }) {
  const active = goals.filter((g) => g.status === 'active')
  const achieved = goals.filter((g) => g.achieved_at && daySet.has(dayOf(g.achieved_at))).length

  const items: BarListItem[] = active
    .map((g) => ({ g, prog: goalProgress(g, tasks) }))
    .sort((a, b) => b.prog.ratio - a.prog.ratio)
    .map(({ g, prog }) => {
      let secondary: string
      if (g.target_value) secondary = `${num.format(prog.done)}/${num.format(prog.total)}${g.unit ? ` ${g.unit}` : ''}`
      else secondary = prog.total ? `${prog.done}/${prog.total} tareas` : 'sin tareas'
      return {
        key: g.id,
        label: g.title,
        color: colorHex(g.color),
        value: prog.ratio,
        display: prog.total ? formatPct(prog.ratio) : '—',
        secondary,
      }
    })

  return (
    <Panel
      title="Objetivos"
      subtitle="Avance de tus objetivos activos."
      aside={
        <p>
          <span className="font-mono text-ink">{achieved}</span> {achieved === 1 ? 'logrado' : 'logrados'} en {n} días
        </p>
      }
    >
      {items.length ? (
        <BarList items={items} max={1} label="Avance de objetivos activos" />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-control border border-dashed border-line px-4 py-8 text-center">
          <div>
            <p className="text-[13px] font-medium text-ink-dim">
              {achieved > 0 ? 'Todo logrado. No te quedan objetivos activos.' : 'Sin objetivos activos'}
            </p>
            <p className="mt-1 text-xs text-ink-faint">Define un objetivo medible y verás aquí cómo avanzas.</p>
          </div>
          <LinkButton href="/objetivos" size="sm">
            Ir a Objetivos
          </LinkButton>
        </div>
      )}
    </Panel>
  )
}
