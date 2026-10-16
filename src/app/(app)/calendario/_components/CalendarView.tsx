'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, Plus, Timer, AlertTriangle } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { useUI } from '@/store/uiStore'
import { Button, IconButton } from '@/components/ui/Button'
import { Card, CardHeader, PageHeader, Segmented } from '@/components/ui/primitives'
import { TaskCheck } from '@/components/tasks/TaskBits'
import {
  addDays,
  diffDays,
  fromDateKey,
  range,
  relativeDayLabel,
  shortTime,
  startOfWeek,
  toDateKey,
  formatMinutes,
  MONTHS_LONG,
  WEEKDAYS_SHORT,
  WEEKDAYS_LONG,
} from '@/lib/kairo/dates'
import { dueBucket } from '@/lib/kairo/tasks'
import { sessionMinutes, dayOf } from '@/lib/kairo/stats'
import { colorHex } from '@/lib/colors'
import type { Task } from '@/lib/kairo/types'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 06:00–23:00

function rangeLabel(view: 'day' | 'week', anchor: string, today: string) {
  if (view === 'day') {
    const d = fromDateKey(anchor)
    const rel = relativeDayLabel(anchor, today)
    return `${['Hoy', 'Mañana', 'Ayer'].includes(rel) ? rel + ' · ' : ''}${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`
  }
  const s = fromDateKey(startOfWeek(anchor))
  const e = fromDateKey(addDays(startOfWeek(anchor), 6))
  return s.getMonth() === e.getMonth()
    ? `${s.getDate()}–${e.getDate()} de ${MONTHS_LONG[s.getMonth()]} ${e.getFullYear()}`
    : `${s.getDate()} ${MONTHS_LONG[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS_LONG[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`
}

export function CalendarView() {
  const { tasks, sessions, projects, toggleTask, updateTask } = useWorkspace()
  const { openTask, openCapture } = useUI()
  const today = toDateKey(new Date())
  const [view, setView] = useState<'day' | 'week'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'day' : 'week',
  )
  const [anchor, setAnchor] = useState(today)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const step = view === 'day' ? 1 : 7
  const days = view === 'day' ? [anchor] : range(startOfWeek(anchor), 7)

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.due_date || t.parent_id) continue
      m.set(t.due_date, [...(m.get(t.due_date) ?? []), t])
    }
    for (const list of m.values())
      list.sort(
        (a, b) =>
          Number(a.status === 'completed') - Number(b.status === 'completed') ||
          (a.due_time ?? '99').localeCompare(b.due_time ?? '99') ||
          b.priority - a.priority,
      )
    return m
  }, [tasks])

  const overdue = tasks.filter((t) => !t.parent_id && t.status !== 'completed' && dueBucket(t, today) === 'overdue')
  const showOverdue = overdue.length > 0 && days.includes(today)

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => !t.parent_id && t.status !== 'completed' && t.due_date && diffDays(today, t.due_date) >= 0 && diffDays(today, t.due_date) <= 14)
        .sort((a, b) => `${a.due_date}${a.due_time ?? ''}`.localeCompare(`${b.due_date}${b.due_time ?? ''}`))
        .slice(0, 12),
    [tasks, today],
  )

  const dropOn = (day: string, e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('text/kairo-task')
    if (id) void updateTask(id, { due_date: day })
  }

  const projectDot = (t: Task) =>
    t.project_id ? <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorHex(projects.find((p) => p.id === t.project_id)?.color) }} /> : null

  const chip = (t: Task) => (
    <div
      key={t.id}
      draggable={t.status !== 'completed'}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/kairo-task', t.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={clsx(
        'group flex items-start gap-2 rounded-md border border-line bg-raised px-2 py-1.5 text-left shadow-card',
        t.status !== 'completed' && 'cursor-grab active:cursor-grabbing',
      )}
    >
      <div className="pt-[1px]">
        <TaskCheck done={t.status === 'completed'} priority={t.priority} size={14} onToggle={() => toggleTask(t.id)} label={`Completar ${t.title}`} />
      </div>
      <button type="button" onClick={() => openTask(t.id)} className="min-w-0 flex-1 text-left">
        <span className={clsx('line-clamp-2 text-xs leading-snug', t.status === 'completed' ? 'text-ink-faint line-through' : 'text-ink')}>{t.title}</span>
        {(t.due_time || t.project_id) && (
          <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-ink-faint">
            {projectDot(t)}
            {shortTime(t.due_time)}
          </span>
        )}
      </button>
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Calendario"
        description="Organiza tus tareas por fecha. Arrastra para reprogramar."
        actions={
          <Segmented
            label="Vista"
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Día' },
              { value: 'week', label: 'Semana' },
            ]}
          />
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <IconButton label={view === 'day' ? 'Día anterior' : 'Semana anterior'} onClick={() => setAnchor(addDays(anchor, -step))}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton label={view === 'day' ? 'Día siguiente' : 'Semana siguiente'} onClick={() => setAnchor(addDays(anchor, step))}>
            <ChevronRight size={18} />
          </IconButton>
        </div>
        <h2 className="text-[17px] font-semibold first-letter:uppercase tracking-[-0.01em] text-ink" aria-live="polite">
          {rangeLabel(view, anchor, today)}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAnchor(today)} disabled={days.includes(today)}>
            Hoy
          </Button>
          <input
            type="date"
            aria-label="Ir a una fecha"
            value={anchor}
            onChange={(e) => e.target.value && setAnchor(e.target.value)}
            className="k-input h-8 w-auto py-0 text-[13px]"
          />
        </div>
      </div>

      {showOverdue && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-card border border-danger/25 bg-danger/5 px-4 py-3">
          <AlertTriangle size={15} className="text-danger" />
          <p className="text-sm text-ink">
            {overdue.length} {overdue.length === 1 ? 'tarea vencida' : 'tareas vencidas'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {overdue.slice(0, 4).map((t) => (
              <button key={t.id} onClick={() => openTask(t.id)} className="max-w-[200px] truncate rounded-md border border-line bg-raised px-2 py-0.5 text-xs text-ink hover:border-line-strong">
                {t.title}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" className="ml-auto" onClick={() => overdue.forEach((t) => void updateTask(t.id, { due_date: today }))}>
            Pasar todas a hoy
          </Button>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <div className={clsx(view === 'week' ? 'lg:col-span-12 xl:col-span-9' : 'lg:col-span-8')}>
          {view === 'week' ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
              {days.map((d) => {
                const date = fromDateKey(d)
                const items = byDay.get(d) ?? []
                const isToday = d === today
                return (
                  <section
                    key={d}
                    aria-label={`${WEEKDAYS_LONG[date.getDay()]} ${date.getDate()}`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(d)
                    }}
                    onDragLeave={() => setDragOver((x) => (x === d ? null : x))}
                    onDrop={(e) => dropOn(d, e)}
                    className={clsx(
                      'flex min-h-[150px] flex-col rounded-card border p-1.5 transition-colors sm:min-h-[340px]',
                      dragOver === d ? 'border-accent-fg/50 bg-accent/5' : isToday ? 'border-line-strong bg-raised' : 'border-line bg-surface',
                    )}
                  >
                    <header className="flex items-center justify-between px-1.5 pb-1.5 pt-1">
                      <button type="button" onClick={() => { setAnchor(d); setView('day') }} className="text-left">
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-faint">{WEEKDAYS_SHORT[date.getDay()]}</span>
                        <span className={clsx('text-[17px] font-semibold', isToday ? 'text-accent-fg' : 'text-ink')}>{date.getDate()}</span>
                      </button>
                      <IconButton label={`Añadir tarea el ${date.getDate()}`} size="sm" onClick={() => openCapture({ due_date: d })}>
                        <Plus size={14} />
                      </IconButton>
                    </header>
                    <div className="flex flex-col gap-1">{items.map(chip)}</div>
                  </section>
                )
              })}
            </div>
          ) : (
            <DayTimeline
              day={anchor}
              tasks={byDay.get(anchor) ?? []}
              sessions={sessions.filter((s) => dayOf(s.started_at) === anchor)}
              taskTitle={(id) => tasks.find((t) => t.id === id)?.title ?? null}
              renderChip={chip}
              onAdd={(time) => openCapture({ due_date: anchor, due_time: time ?? undefined })}
              isToday={anchor === today}
            />
          )}
        </div>

        <aside className={clsx(view === 'week' ? 'lg:col-span-12 xl:col-span-3' : 'lg:col-span-4')}>
          <Card>
            <CardHeader eyebrow="Próximos 14 días" title="Vencimientos" />
            <div className="px-4 pb-4">
              {upcoming.length ? (
                <ul className="space-y-0.5">
                  {upcoming.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => openTask(t.id)} className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-sunken">
                        <span className={clsx('w-16 shrink-0 font-mono text-[11px]', t.due_date === today ? 'text-accent-fg' : 'text-ink-faint')}>
                          {relativeDayLabel(t.due_date as string, today)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{t.title}</span>
                        {projectDot(t)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-sm text-ink-dim">Nada programado en las próximas dos semanas.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function DayTimeline({
  day,
  tasks,
  sessions,
  taskTitle,
  renderChip,
  onAdd,
  isToday,
}: {
  day: string
  tasks: Task[]
  sessions: ReturnType<typeof useWorkspace.getState>['sessions']
  taskTitle: (id: string) => string | null
  renderChip: (t: Task) => React.ReactNode
  onAdd: (time: string | null) => void
  isToday: boolean
}) {
  const untimed = tasks.filter((t) => !t.due_time)
  const nowH = new Date().getHours()
  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="k-eyebrow">Sin hora</p>
          <button type="button" onClick={() => onAdd(null)} className="inline-flex items-center gap-1 text-xs text-ink-dim hover:text-ink">
            <Plus size={12} /> Añadir
          </button>
        </div>
        {untimed.length ? <div className="grid gap-1 sm:grid-cols-2">{untimed.map(renderChip)}</div> : <p className="px-1 pb-1 text-sm text-ink-faint">Nada sin hora para {isToday ? 'hoy' : 'este día'}.</p>}
      </Card>
      <Card className="overflow-hidden">
        <ol aria-label={`Agenda del ${day}`}>
          {HOURS.map((h) => {
            const hh = String(h).padStart(2, '0')
            const atHour = tasks.filter((t) => t.due_time && Number(t.due_time.slice(0, 2)) === h)
            const sess = sessions.filter((s) => new Date(s.started_at).getHours() === h)
            return (
              <li key={h} className={clsx('group flex min-h-[52px] border-b border-line/70 last:border-0', isToday && h === nowH && 'bg-accent/5')}>
                <span className={clsx('w-14 shrink-0 px-3 pt-2 font-mono text-[11px]', isToday && h === nowH ? 'text-accent-fg' : 'text-ink-faint')}>{hh}:00</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1 py-1.5 pr-2">
                  {sess.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-md border border-accent-fg/25 bg-accent/10 px-2 py-1 text-xs text-ink">
                      <Timer size={12} className="text-accent-fg" />
                      <span className="min-w-0 flex-1 truncate">{(s.task_id && taskTitle(s.task_id)) || s.label || 'Sesión de enfoque'}</span>
                      <span className="font-mono text-[10px] text-ink-dim">
                        {formatMinutes(sessionMinutes(s))}
                        {!s.completed && ' · parcial'}
                      </span>
                    </div>
                  ))}
                  {atHour.map(renderChip)}
                  {!sess.length && !atHour.length && (
                    <button
                      type="button"
                      onClick={() => onAdd(`${hh}:00`)}
                      className="h-full min-h-[36px] w-full rounded-md text-left text-xs text-transparent transition-colors hover:bg-sunken hover:text-ink-faint focus:text-ink-faint"
                      aria-label={`Añadir tarea a las ${hh}:00`}
                    >
                      + Añadir a las {hh}:00
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </Card>
    </div>
  )
}
