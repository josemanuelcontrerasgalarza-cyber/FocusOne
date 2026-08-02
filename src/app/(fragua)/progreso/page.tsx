import type { Metadata } from 'next'
import { Flame, Trophy, Gem, Hammer, Clock, Timer, Hourglass, type LucideIcon } from 'lucide-react'
import { getProgressDashboard, type DaySlot, type CalendarDay, type ActivityItem } from '@/lib/progress'

export const metadata: Metadata = { title: 'Progreso' }
export const dynamic = 'force-dynamic'

/** "95 min" → "1h 35m" (o "0m"). */
function formatMinutes(total: number): string {
  if (total <= 0) return '0m'
  const h = Math.floor(total / 60)
  const min = total % 60
  return h > 0 ? `${h}h ${min}m` : `${min}m`
}

/**
 * Pantalla "Progreso" (dashboard renovado): stats de racha/puntos, productividad
 * semanal, tiempo enfocado, calendario del mes y actividad reciente. Todo con
 * datos reales derivados de misiones y sesiones de Deep Work.
 */
export default async function ProgresoPage() {
  const d = await getProgressDashboard()

  const stats = [
    { label: 'Racha actual', value: `${d.streak}`, unit: d.streak === 1 ? 'día' : 'días', icon: Flame, tone: 'text-metal' },
    { label: 'Récord', value: `${d.best}`, unit: d.best === 1 ? 'día' : 'días', icon: Trophy, tone: 'text-metal' },
    { label: 'Puntos', value: d.isDeveloper ? '∞' : `${d.points}`, unit: 'pts', icon: Gem, tone: d.isDeveloper ? 'text-ember' : 'text-forge-ink' },
    { label: 'Forjadas', value: `${d.forgedTotal}`, unit: 'misiones', icon: Hammer, tone: 'text-ember' },
  ]

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">El temple</p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">Progreso</h1>
      </header>

      {/* Stats principales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, unit, icon: Icon, tone }) => (
          <div key={label} className="forge-panel p-5">
            <Icon size={18} className={tone} />
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className={`font-num text-3xl font-semibold ${tone}`}>{value}</span>
              <span className="text-sm text-forge-ink-faint">{unit}</span>
            </div>
            <p className="mt-1 text-[13px] text-forge-ink-dim">{label}</p>
          </div>
        ))}
      </div>

      {/* Productividad semanal + tiempo enfocado */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyProductivity week={d.week} forgedWeek={d.forgedWeek} />
        <FocusTime minutes={d.focusMinutesWeek} sessions={d.focusSessionsWeek} />
      </div>

      {/* Calendario del mes */}
      <MonthCalendar calendar={d.calendar} monthLabel={d.monthLabel} />

      {/* Actividad reciente */}
      <RecentActivity activity={d.activity} />

      {d.isDemo && (
        <p className="text-center text-xs text-forge-ink-faint">
          Vista previa (demo): inicia sesión para ver tu progreso real.
        </p>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */

function PanelTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
      <Icon size={13} className="text-ember" />
      {children}
    </div>
  )
}

/** Barras de misiones forjadas por día en los últimos 7 días. */
function WeeklyProductivity({ week, forgedWeek }: { week: DaySlot[]; forgedWeek: number }) {
  const max = Math.max(1, ...week.map((s) => s.forged))
  return (
    <div className="forge-panel p-5">
      <PanelTitle icon={Timer}>Productividad · 7 días</PanelTitle>
      <div className="flex items-end justify-between gap-2" style={{ height: 128 }}>
        {week.map((s, i) => {
          // Altura en píxeles (no en %) para que la barra no colapse dentro del flex.
          const barPx = s.forged > 0 ? Math.max(10, Math.round((s.forged / max) * 104)) : 3
          return (
            <div key={s.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div
                className={`w-full rounded-t-md ${
                  s.forged > 0 ? 'bg-ember shadow-ember' : 'bg-forge-line'
                }`}
                style={{ height: barPx }}
                title={`${s.forged} forjada${s.forged === 1 ? '' : 's'}`}
                aria-label={`Día ${i + 1}: ${s.forged} forjadas`}
              />
              <span className="font-num text-[11px] text-forge-ink-faint">{s.label}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[13px] text-forge-ink-dim">
        <span className="font-num font-semibold text-forge-ink">{forgedWeek}</span> misiones forjadas esta semana
      </p>
    </div>
  )
}

/** Tiempo total de enfoque (Deep Work) de la semana. */
function FocusTime({ minutes, sessions }: { minutes: number; sessions: number }) {
  return (
    <div className="forge-panel flex flex-col p-5">
      <PanelTitle icon={Clock}>Tiempo enfocado · 7 días</PanelTitle>
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex items-baseline gap-2">
          <Hourglass size={22} className="text-ember" />
          <span className="font-num text-4xl font-semibold text-forge-ink">{formatMinutes(minutes)}</span>
        </div>
        <p className="mt-2 text-[13px] text-forge-ink-dim">
          en <span className="font-num font-semibold text-forge-ink">{sessions}</span>{' '}
          {sessions === 1 ? 'sesión' : 'sesiones'} de Deep Work
        </p>
      </div>
    </div>
  )
}

/** Calendario del mes: puntos de brasa en los días con actividad. */
function MonthCalendar({ calendar, monthLabel }: { calendar: CalendarDay[]; monthLabel: string }) {
  return (
    <div className="forge-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <PanelTitle icon={Flame}>Actividad del mes</PanelTitle>
        <span className="font-forge text-sm font-semibold capitalize text-forge-ink-dim">{monthLabel}</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((h, i) => (
          <div key={`h-${i}`} className="pb-1 text-center font-num text-[10px] text-forge-ink-faint">
            {h}
          </div>
        ))}
        {calendar.map((c) =>
          c.inMonth ? (
            <div
              key={c.key}
              className={`flex aspect-square items-center justify-center rounded-md text-[13px] font-num ${
                c.active
                  ? 'bg-ember/15 font-semibold text-ember'
                  : 'bg-forge-canvas text-forge-ink-faint'
              } ${c.today ? 'ring-1 ring-inset ring-ember' : ''}`}
              title={c.active ? 'Con actividad' : ''}
            >
              {c.day}
            </div>
          ) : (
            <div key={c.key} className="aspect-square" />
          ),
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[11px] text-forge-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-ember/15 ring-1 ring-inset ring-ember/30" /> con actividad
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm ring-1 ring-inset ring-ember" /> hoy
        </span>
      </div>
    </div>
  )
}

/** Últimos eventos: misiones forjadas y sesiones de Deep Work. */
function RecentActivity({ activity }: { activity: ActivityItem[] }) {
  return (
    <div className="forge-panel p-5">
      <PanelTitle icon={Hammer}>Actividad reciente</PanelTitle>
      {activity.length === 0 ? (
        <p className="text-sm text-forge-ink-faint">
          Aún no hay actividad. Forja una misión o inicia un Deep Work.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-forge-line">
          {activity.map((a, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  a.kind === 'mission' ? 'bg-ember/15 text-ember' : 'bg-metal/15 text-metal'
                }`}
              >
                {a.kind === 'mission' ? <Hammer size={15} /> : <Clock size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-forge text-[15px] font-semibold text-forge-ink">{a.title}</p>
                <p className="text-[12px] text-forge-ink-faint">{a.meta}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
