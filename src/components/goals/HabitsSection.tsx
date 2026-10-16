'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ArchiveRestore, ChevronDown, Plus, Repeat, Trash2 } from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { toast } from '@/lib/toast'
import type { Habit } from '@/lib/kairo/types'
import { confirmDeleteHabit, HabitRow } from './HabitRow'
import { SectionHeading } from './SectionHeading'

export function HabitsSection({
  today,
  onNew,
  onEdit,
}: {
  today: string
  onNew: () => void
  onEdit: (h: Habit) => void
}) {
  const { habits, habitLogs, updateHabit, deleteHabit } = useWorkspace()
  const [showArchived, setShowArchived] = useState(false)

  const logsByHabit = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const l of habitLogs) {
      const arr = m.get(l.habit_id)
      if (arr) arr.push(l.log_date)
      else m.set(l.habit_id, [l.log_date])
    }
    return m
  }, [habitLogs])

  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)

  return (
    <section id="habitos" aria-labelledby="habitos-title" className="scroll-mt-20">
      <SectionHeading
        id="habitos-title"
        title="Hábitos"
        description="Lo que repites, semana a semana. Marca el día con un toque."
        action={
          active.length > 0 ? (
            <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={onNew}>
              Nuevo hábito
            </Button>
          ) : undefined
        }
      />

      {active.length ? (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface" aria-label="Hábitos activos">
          {active.map((h) => (
            <HabitRow key={h.id} habit={h} dates={logsByHabit.get(h.id) ?? []} today={today} onEdit={onEdit} />
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-dashed border-line">
          <EmptyState
            icon={<Repeat size={18} />}
            title="Pequeñas repeticiones, grandes cambios"
            description="Un hábito es algo que quieres repetir: leer, moverte, escribir. Lo marcas en segundos y ves cómo se acumula, sin presión: si un día no puedes, el siguiente también cuenta."
            action={
              <Button icon={<Plus size={15} />} onClick={onNew}>
                Crear tu primer hábito
              </Button>
            }
          />
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
            aria-controls="habitos-archivados"
            className="inline-flex h-8 items-center gap-1.5 rounded-control px-1.5 text-[13px] font-medium text-ink-dim transition-colors hover:bg-sunken hover:text-ink"
          >
            <ChevronDown size={14} className={clsx('transition-transform duration-150', !showArchived && '-rotate-90')} aria-hidden />
            Archivados
            <span className="font-mono text-[11px] text-ink-faint">{archived.length}</span>
          </button>
          {showArchived && (
            <ul
              id="habitos-archivados"
              className="mt-2 animate-fade-in divide-y divide-line rounded-card border border-line bg-surface"
            >
              {archived.map((h) => (
                <li key={h.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <span aria-hidden className="text-[16px] leading-none opacity-70">
                    {h.icon}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[14px] text-ink-dim">{h.title}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<ArchiveRestore size={14} />}
                    onClick={async () => {
                      await updateHabit(h.id, { archived: false })
                      if (useWorkspace.getState().habits.find((x) => x.id === h.id)?.archived === false) toast.success('Hábito restaurado')
                    }}
                  >
                    Restaurar
                  </Button>
                  <IconButton label={`Eliminar «${h.title}»`} size="sm" onClick={() => void confirmDeleteHabit(h, deleteHabit)}>
                    <Trash2 size={14} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
