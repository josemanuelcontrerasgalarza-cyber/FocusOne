'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Archive, Check, Flame, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/ui/Button'
import { confirm, Menu, type MenuItem } from '@/components/ui/Overlay'
import { useWorkspace } from '@/store/workspace'
import { toast } from '@/lib/toast'
import { colorHex } from '@/lib/colors'
import { fromDateKey, MONTHS_SHORT } from '@/lib/kairo/dates'
import type { Habit } from '@/lib/kairo/types'
import { habitStats, plural, WEEKDAY_LETTERS, WEEKDAY_NAMES } from './format'

const dayName = (key: string, i: number) => {
  const d = fromDateKey(key)
  return `${WEEKDAY_NAMES[i]} ${d.getDate()} de ${MONTHS_SHORT[d.getMonth()]}`
}

const stripDate = (key: string) => {
  const d = fromDateKey(key)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function HabitRow({
  habit,
  dates,
  today,
  onEdit,
}: {
  habit: Habit
  dates: string[]
  today: string
  onEdit: (h: Habit) => void
}) {
  const { toggleHabitDay, updateHabit, deleteHabit } = useWorkspace()
  const [menu, setMenu] = useState(false)
  const hex = colorHex(habit.color)
  const st = habitStats(habit, dates, today)
  const set = new Set(dates)
  const target = Math.max(1, Math.min(7, habit.target_per_week))
  const daily = target >= 7
  const weekMet = st.weekDone >= target

  const streakText =
    st.streak.value > 0
      ? plural(st.streak.value, st.streak.unit === 'días' ? 'día' : 'semana', st.streak.unit)
      : null

  // Mensaje amable: nunca "racha rota".
  const nudge = daily
    ? st.doneToday
      ? 'Hecho hoy'
      : 'Hoy aún cuenta'
    : weekMet
      ? 'Meta semanal cumplida'
      : st.doneToday
        ? 'Hecho hoy'
        : 'Hoy aún cuenta'

  const items: MenuItem[] = [
    { label: 'Editar', icon: <Pencil size={14} />, onSelect: () => onEdit(habit) },
    {
      label: 'Archivar',
      icon: <Archive size={14} />,
      onSelect: async () => {
        await updateHabit(habit.id, { archived: true })
        if (useWorkspace.getState().habits.find((h) => h.id === habit.id)?.archived) {
          toast.success('Hábito archivado', {
            action: { label: 'Deshacer', onClick: () => void updateHabit(habit.id, { archived: false }) },
          })
        }
      },
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} />,
      danger: true,
      onSelect: () => void confirmDeleteHabit(habit, deleteHabit),
    },
  ]

  return (
    <li className="group animate-fade-in px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-3 md:flex-nowrap md:items-center">
        {/* Identidad */}
        <div className="flex min-w-0 flex-1 basis-[calc(100%-44px)] items-start gap-3 md:basis-auto">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border text-[18px] leading-none"
            style={{ background: `${hex}1f`, borderColor: `${hex}55` }}
          >
            {habit.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink">{habit.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-dim">
              {streakText ? (
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  <Flame size={12} className="text-warm" aria-hidden />
                  <span className="sr-only">Racha: </span>
                  {streakText}
                </span>
              ) : (
                <span>Empieza cuando quieras</span>
              )}
              {!daily && (
                <span className="font-mono">
                  {st.weekDone}/{target} esta semana
                </span>
              )}
              <span className={clsx(nudge === 'Hoy aún cuenta' ? 'text-accent-fg' : 'text-ink-faint')}>{nudge}</span>
            </p>
          </div>
        </div>

        {/* Menú (en móvil a la derecha del título) */}
        <div className="relative order-2 md:order-3">
          <IconButton
            label={`Acciones de «${habit.title}»`}
            size="sm"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            <MoreHorizontal size={16} />
          </IconButton>
          <Menu open={menu} onClose={() => setMenu(false)} items={items} />
        </div>

        {/* Semana actual (lunes → domingo) */}
        <div
          role="group"
          aria-label={`Semana actual de «${habit.title}»`}
          className="order-3 grid w-full grid-cols-7 gap-1 md:order-2 md:w-auto md:gap-1.5"
        >
          {st.week.map((day, i) => {
            const done = set.has(day)
            const isToday = day === today
            const future = day > today
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <span
                  aria-hidden
                  className={clsx(
                    'font-mono text-[10px] leading-none',
                    isToday ? 'font-semibold text-accent-fg' : 'text-ink-faint',
                  )}
                >
                  {isToday ? 'Hoy' : WEEKDAY_LETTERS[i]}
                </span>
                <button
                  type="button"
                  aria-pressed={done}
                  aria-label={`${done ? 'Desmarcar' : 'Marcar'} ${dayName(day, i)}${isToday ? ' (hoy)' : ''}`}
                  title={future ? 'Aún no llega' : dayName(day, i)}
                  disabled={future}
                  onClick={() => toggleHabitDay(habit.id, day)}
                  className={clsx(
                    'flex h-9 w-full items-center justify-center rounded-control border transition-[background-color,border-color,transform] duration-150 active:scale-95 md:w-9',
                    done
                      ? 'border-transparent'
                      : future
                        ? 'cursor-not-allowed border-dashed border-line bg-transparent opacity-50'
                        : 'border-line bg-raised hover:border-line-strong',
                    isToday && !done && 'border-accent-fg/70 shadow-ring',
                  )}
                  style={done ? { background: hex } : undefined}
                >
                  {done && <Check size={16} strokeWidth={3} className="animate-scale-in text-accent-ink" aria-hidden />}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Historial de 30 días */}
      <div className="mt-3 flex items-center gap-3 md:pl-[52px]">
        <div
          role="img"
          aria-label={`Últimos 30 días: ${st.done30} registrados`}
          className="grid flex-1 grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]"
        >
          {st.last30.map((d) => {
            const on = set.has(d)
            return (
              <span
                key={d}
                title={`${stripDate(d)}${on ? ' · hecho' : ''}`}
                className={clsx('h-2.5 rounded-[3px]', !on && 'bg-sunken', d === today && 'ring-1 ring-ink-faint/60')}
                style={on ? { background: hex } : undefined}
              />
            )
          })}
        </div>
        <p
          className="shrink-0 font-mono text-[11px] text-ink-dim"
          title={`Respecto a tu meta de ${plural(target, 'día', 'días')} por semana, desde que empezaste (máx. 30 días)`}
        >
          {Math.round(st.rate30 * 100)} %<span className="text-ink-faint"> · 30 d</span>
        </p>
      </div>
      {st.best > 1 && (
        <p className="mt-1.5 text-[11px] text-ink-faint md:pl-[52px]">Mejor racha: {plural(st.best, 'día', 'días')} seguidos</p>
      )}
    </li>
  )
}

export async function confirmDeleteHabit(habit: Habit, deleteHabit: (id: string) => Promise<void>) {
  const ok = await confirm({
    title: '¿Eliminar este hábito?',
    description: `«${habit.title}» y todo su historial se eliminarán definitivamente. Si solo quieres pausarlo, archívalo.`,
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (ok) await deleteHabit(habit.id)
}
