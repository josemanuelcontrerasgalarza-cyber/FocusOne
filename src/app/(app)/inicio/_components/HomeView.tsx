'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  ArrowRight,
  Timer,
  Check,
  Plus,
  CalendarDays,
  Sparkles,
  BarChart3,
  Music2,
  FolderPlus,
  Target,
  Settings2,
  Sun,
  CornerDownRight,
} from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, EmptyState, ProgressBar, ProgressRing, Badge } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Overlay'
import { QuickAddBar } from '@/components/tasks/QuickCapture'
import { TaskRow } from '@/components/tasks/TaskRow'
import { nextMove, nowContext } from '@/lib/kairo/priority'
import { dueBucket, projectProgress } from '@/lib/kairo/tasks'
import { sessionMinutes, dayOf } from '@/lib/kairo/stats'
import { habitStreak } from '@/lib/kairo/streaks'
import { toDateKey, relativeDayLabel, formatMinutes, formatMinutesShort, WEEKDAYS_LONG, MONTHS_LONG } from '@/lib/kairo/dates'
import { colorHex } from '@/lib/colors'
import type { QuickActionId } from '@/lib/kairo/types'

function greeting(h: number) {
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

const QUICK: Record<QuickActionId, { label: string; icon: React.ReactNode; href?: string; capture?: boolean }> = {
  'new-task': { label: 'Nueva tarea', icon: <Plus size={16} />, capture: true },
  'start-focus': { label: 'Iniciar enfoque', icon: <Timer size={16} />, href: '/enfoque' },
  'new-project': { label: 'Nuevo proyecto', icon: <FolderPlus size={16} />, href: '/proyectos?nuevo=1' },
  'new-goal': { label: 'Nuevo objetivo', icon: <Target size={16} />, href: '/objetivos?nuevo=1' },
  'open-calendar': { label: 'Calendario', icon: <CalendarDays size={16} />, href: '/calendario' },
  'open-assistant': { label: 'Planificar con IA', icon: <Sparkles size={16} />, href: '/asistente?prompt=plan' },
  'open-stats': { label: 'Estadísticas', icon: <BarChart3 size={16} />, href: '/estadisticas' },
  'open-music': { label: 'Música', icon: <Music2 size={16} />, href: '/musica' },
}

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function HomeView() {
  const router = useRouter()
  const now = useNow()
  const ws = useWorkspace()
  const { tasks, projects, sessions, habits, habitLogs, settings, profile } = ws
  const openCapture = useUI((s) => s.openCapture)
  const openTask = useUI((s) => s.openTask)
  const [customize, setCustomize] = useState(false)
  const today = toDateKey(now)

  const move = useMemo(() => nextMove(tasks, nowContext(now, projects)), [tasks, projects, now])
  const open = tasks.filter((t) => t.status !== 'completed')
  const topLevelOpen = open.filter((t) => !t.parent_id)
  const overdue = topLevelOpen.filter((t) => dueBucket(t, today) === 'overdue')
  const dueToday = topLevelOpen.filter((t) => dueBucket(t, today) === 'today')
  const forToday = [...overdue, ...dueToday].sort((a, b) => b.priority - a.priority).slice(0, 8)
  const upcoming = topLevelOpen
    .filter((t) => ['tomorrow', 'week'].includes(dueBucket(t, today)))
    .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string))
    .slice(0, 6)
  const doneToday = tasks.filter((t) => t.status === 'completed' && t.completed_at && dayOf(t.completed_at) === today && !t.parent_id).length
  const todaySessions = sessions.filter((s) => dayOf(s.started_at) === today)
  const focusToday = Math.round(todaySessions.reduce((a, s) => a + sessionMinutes(s), 0))
  const sessionsDone = todaySessions.filter((s) => s.completed).length
  const activeProjects = projects.filter((p) => p.status === 'active').slice(0, 4)
  const liveHabits = habits.filter((h) => !h.archived)
  const name = profile?.name?.split(' ')[0] || ''

  const summary = (() => {
    const parts: string[] = []
    if (overdue.length) parts.push(`${overdue.length} ${overdue.length === 1 ? 'tarea vencida' : 'tareas vencidas'}`)
    if (dueToday.length) parts.push(`${dueToday.length} para hoy`)
    if (!parts.length) parts.push(topLevelOpen.length ? 'nada urgente para hoy' : 'el día despejado')
    return parts.join(' y ')
  })()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      {/* Saludo */}
      <header className="flex flex-col gap-1">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
          {WEEKDAYS_LONG[now.getDay()]} {now.getDate()} de {MONTHS_LONG[now.getMonth()]} ·{' '}
          {now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[52px]">
          {greeting(now.getHours())}
          {name ? <span className="italic">, {name}</span> : null}.
        </h1>
        <p className="mt-1 text-[15px] text-ink-dim">
          Tienes {summary}
          {focusToday > 0 ? ` · llevas ${formatMinutes(focusToday)} de enfoque` : ''}.
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-12">
        {/* Columna principal */}
        <div className="space-y-5 lg:col-span-8">
          {/* Tu siguiente movimiento */}
          <section aria-labelledby="next-move" className="relative overflow-hidden rounded-card border border-line bg-raised shadow-card">
            <div className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden />
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <p id="next-move" className="k-eyebrow flex items-center gap-1.5">
                <CornerDownRight size={12} /> Tu siguiente movimiento
              </p>
              {move ? (
                <>
                  {move.parent && <p className="mt-3 text-xs text-ink-faint">Paso de «{move.parent.title}»</p>}
                  <button
                    type="button"
                    onClick={() => openTask(move.task.id)}
                    className="mt-1 block text-left text-[22px] font-semibold leading-snug tracking-[-0.02em] text-ink hover:underline sm:text-[26px]"
                  >
                    {move.task.title}
                  </button>
                  {move.reasons.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Por qué ahora">
                      {move.reasons.slice(0, 3).map((r) => (
                        <li key={r}>
                          <Badge tone={/Venci|Debía/.test(r) ? 'danger' : r.includes('curso') ? 'accent' : 'neutral'}>{r}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="primary" icon={<Timer size={15} />} onClick={() => router.push(`/enfoque?task=${move.task.id}`)}>
                      Empezar {move.task.estimated_minutes ? formatMinutes(move.task.estimated_minutes) : 'enfoque'}
                    </Button>
                    <Button icon={<Check size={15} />} onClick={() => ws.toggleTask(move.task.id)}>
                      Ya está hecha
                    </Button>
                    <Button variant="ghost" onClick={() => openTask(move.task.id)}>
                      Detalles
                    </Button>
                  </div>
                </>
              ) : (
                <div className="mt-3">
                  <p className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Todo despejado.</p>
                  <p className="mt-1 text-sm text-ink-dim">
                    No tienes tareas abiertas. Captura lo siguiente que quieras lograr o pide al asistente un plan.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="primary" icon={<Plus size={15} />} onClick={() => openCapture()}>
                      Nueva tarea
                    </Button>
                    <Button icon={<Sparkles size={15} />} onClick={() => router.push('/asistente?prompt=plan')}>
                      Planificar con IA
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <QuickAddBar placeholder="Captura algo… «Revisar contrato mañana a las 9 urgente»" />

          {/* Para hoy */}
          <Card>
            <CardHeader
              eyebrow="Hoy"
              title={forToday.length ? `Para hoy · ${forToday.length}` : 'Para hoy'}
              action={
                <Link href="/tareas?vence=hoy" className="inline-flex items-center gap-1 text-[13px] text-ink-dim hover:text-ink">
                  Todas <ArrowRight size={13} />
                </Link>
              }
            />
            <div className="px-1.5 pb-2">
              {forToday.length ? (
                forToday.map((t) => <TaskRow key={t.id} task={t} today={today} dense />)
              ) : (
                <EmptyState compact icon={<Sun size={16} />} title="Nada vence hoy" description="Aprovecha para avanzar en algo importante sin prisa." />
              )}
            </div>
          </Card>

          {/* Próximos vencimientos */}
          <Card>
            <CardHeader
              eyebrow="Próximos 7 días"
              title="Próximos vencimientos"
              action={
                <Link href="/calendario" className="inline-flex items-center gap-1 text-[13px] text-ink-dim hover:text-ink">
                  Calendario <ArrowRight size={13} />
                </Link>
              }
            />
            <div className="px-4 pb-4 sm:px-5">
              {upcoming.length ? (
                <ul className="divide-y divide-line">
                  {upcoming.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openTask(t.id)}
                        className="flex w-full items-center gap-3 py-2.5 text-left text-sm hover:text-ink"
                      >
                        <span className="w-20 shrink-0 font-mono text-xs text-ink-faint">{relativeDayLabel(t.due_date as string, today)}</span>
                        <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                        {t.project_id && (
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorHex(projects.find((p) => p.id === t.project_id)?.color) }} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-sm text-ink-dim">Sin vencimientos en los próximos días.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Columna lateral */}
        <aside className="space-y-5 lg:col-span-4">
          {/* Progreso de hoy */}
          <Card className="p-5">
            <p className="k-eyebrow">Progreso de hoy</p>
            <div className="mt-4 flex items-center gap-4">
              <ProgressRing value={focusToday / Math.max(1, settings.dailyFocusGoalMinutes)} size={76} stroke={6}>
                <span className="font-mono text-sm font-medium text-ink">{Math.min(100, Math.round((focusToday / Math.max(1, settings.dailyFocusGoalMinutes)) * 100))}%</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="font-mono text-2xl font-medium tracking-[-0.02em] text-ink">{formatMinutesShort(focusToday)}</p>
                <p className="text-xs text-ink-dim">de {formatMinutes(settings.dailyFocusGoalMinutes)} de enfoque</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {sessionsDone} {sessionsDone === 1 ? 'sesión completa' : 'sesiones completas'}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-ink-dim">Tareas completadas</span>
                <span className="font-mono text-ink">
                  {doneToday}/{settings.dailyTaskGoal}
                </span>
              </div>
              <ProgressBar value={doneToday / Math.max(1, settings.dailyTaskGoal)} />
            </div>
            <Button className="mt-5 w-full" icon={<Timer size={15} />} onClick={() => router.push('/enfoque')}>
              Iniciar sesión de enfoque
            </Button>
          </Card>

          {/* Hábitos */}
          {liveHabits.length > 0 && (
            <Card>
              <CardHeader
                eyebrow="Hábitos"
                title="Hoy"
                action={
                  <Link href="/objetivos" className="text-[13px] text-ink-dim hover:text-ink">
                    Ver
                  </Link>
                }
              />
              <ul className="space-y-0.5 px-2 pb-3">
                {liveHabits.slice(0, 6).map((h) => {
                  const dates = habitLogs.filter((l) => l.habit_id === h.id).map((l) => l.log_date)
                  const done = dates.includes(today)
                  const streak = habitStreak(dates, h.target_per_week, today)
                  return (
                    <li key={h.id}>
                      <button
                        type="button"
                        aria-pressed={done}
                        onClick={() => ws.toggleHabitDay(h.id, today)}
                        className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left hover:bg-sunken"
                      >
                        <span
                          className={clsx(
                            'flex h-7 w-7 items-center justify-center rounded-full border text-sm transition-colors',
                            done ? 'border-accent-fg bg-accent-fg text-canvas' : 'border-line bg-sunken',
                          )}
                        >
                          {done ? <Check size={14} strokeWidth={3} /> : h.icon}
                        </span>
                        <span className={clsx('min-w-0 flex-1 truncate text-sm', done ? 'text-ink-dim' : 'text-ink')}>{h.title}</span>
                        {streak.value > 0 && (
                          <span className="font-mono text-[11px] text-ink-faint">
                            {streak.value} {streak.unit === 'días' ? 'd' : 'sem'}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {/* Proyectos activos */}
          <Card>
            <CardHeader
              eyebrow="Proyectos"
              title="Activos"
              action={
                <Link href="/proyectos" className="text-[13px] text-ink-dim hover:text-ink">
                  Ver
                </Link>
              }
            />
            <div className="space-y-3 px-4 pb-4 sm:px-5">
              {activeProjects.length ? (
                activeProjects.map((p) => {
                  const pr = projectProgress(p.id, tasks)
                  return (
                    <Link key={p.id} href={`/proyectos/${p.id}`} className="block rounded-control py-1 hover:opacity-90">
                      <div className="mb-1.5 flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{ background: colorHex(p.color) }} />
                        <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
                        <span className="font-mono text-xs text-ink-faint">{pr.total ? `${Math.round(pr.ratio * 100)}%` : '—'}</span>
                      </div>
                      <ProgressBar value={pr.ratio} />
                    </Link>
                  )
                })
              ) : (
                <p className="text-sm text-ink-dim">
                  Agrupa tareas en proyectos para ver su avance real.{' '}
                  <Link href="/proyectos?nuevo=1" className="text-accent-fg hover:underline">
                    Crear proyecto
                  </Link>
                </p>
              )}
            </div>
          </Card>

          {/* Accesos rápidos */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="k-eyebrow">Accesos rápidos</p>
              <button type="button" onClick={() => setCustomize(true)} className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink">
                <Settings2 size={12} /> Personalizar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {settings.quickActions.map((id) => {
                const a = QUICK[id]
                if (!a) return null
                const cls =
                  'flex items-center gap-2 rounded-control border border-line bg-raised px-3 py-2.5 text-[13px] text-ink transition-colors hover:border-line-strong'
                return a.capture ? (
                  <button key={id} type="button" onClick={() => openCapture()} className={cls}>
                    <span className="text-ink-dim">{a.icon}</span>
                    {a.label}
                  </button>
                ) : (
                  <Link key={id} href={a.href as string} className={cls}>
                    <span className="text-ink-dim">{a.icon}</span>
                    {a.label}
                  </Link>
                )
              })}
            </div>
          </Card>
        </aside>
      </div>

      <Modal
        open={customize}
        onClose={() => setCustomize(false)}
        title="Accesos rápidos"
        description="Elige hasta 6 atajos para tu pantalla de inicio."
        footer={
          <Button variant="primary" onClick={() => setCustomize(false)}>
            Listo
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2 pb-2">
          {(Object.keys(QUICK) as QuickActionId[]).map((id) => {
            const on = settings.quickActions.includes(id)
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on ? settings.quickActions.filter((x) => x !== id) : [...settings.quickActions, id].slice(0, 6)
                  ws.updateSettings({ quickActions: next })
                }}
                className={clsx(
                  'flex items-center gap-2 rounded-control border px-3 py-2.5 text-left text-[13px] transition-colors',
                  on ? 'border-accent-fg/50 bg-accent/10 text-ink' : 'border-line text-ink-dim hover:bg-sunken',
                )}
              >
                {QUICK[id].icon}
                <span className="flex-1">{QUICK[id].label}</span>
                {on && <Check size={14} className="text-accent-fg" />}
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
