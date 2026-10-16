'use client'

import { useMemo, useState } from 'react'
import { Archive, Plus, Target, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, Segmented } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import type { Goal, GoalStatus } from '@/lib/kairo/types'
import { GoalCard } from './GoalCard'
import { SectionHeading } from './SectionHeading'

const byDueThenCreated = (a: Goal, b: Goal) => {
  if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1
  if (a.due_date && !b.due_date) return -1
  if (!a.due_date && b.due_date) return 1
  return a.created_at.localeCompare(b.created_at)
}

export function GoalsSection({
  today,
  onNew,
  onEdit,
}: {
  today: string
  onNew: () => void
  onEdit: (g: Goal) => void
}) {
  const goals = useWorkspace((s) => s.goals)
  const [tab, setTab] = useState<GoalStatus>('active')

  const groups = useMemo(() => {
    const active = goals.filter((g) => g.status === 'active').sort(byDueThenCreated)
    const achieved = goals
      .filter((g) => g.status === 'achieved')
      .sort((a, b) => (b.achieved_at ?? '').localeCompare(a.achieved_at ?? ''))
    const archived = goals.filter((g) => g.status === 'archived').sort((a, b) => b.created_at.localeCompare(a.created_at))
    return { active, achieved, archived }
  }, [goals])

  const list = tab === 'active' ? groups.active : tab === 'achieved' ? groups.achieved : groups.archived
  const count = (n: number) => <span className="font-mono text-[11px] text-ink-faint">{n}</span>

  return (
    <section aria-labelledby="objetivos-title" className="scroll-mt-20">
      <SectionHeading
        id="objetivos-title"
        title="Objetivos"
        description="Lo que quieres lograr y cuánto te falta."
        action={
          <Segmented<GoalStatus>
            label="Filtrar objetivos"
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'active', label: <>Activos {count(groups.active.length)}</> },
              { value: 'achieved', label: <>Cumplidos {count(groups.achieved.length)}</> },
              { value: 'archived', label: <>Archivados {count(groups.archived.length)}</> },
            ]}
          />
        }
      />

      {list.length ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label={`Objetivos ${tab === 'active' ? 'activos' : tab === 'achieved' ? 'cumplidos' : 'archivados'}`}>
          {list.map((g) => (
            <li key={g.id} className="flex">
              <div className="flex w-full flex-col [&>article]:flex-1">
                <GoalCard goal={g} today={today} onEdit={onEdit} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-dashed border-line">
          {tab === 'active' ? (
            <EmptyState
              icon={<Target size={18} />}
              title={groups.achieved.length ? 'Sin objetivos en marcha' : 'Define hacia dónde vas'}
              description="Un objetivo da sentido a tus tareas. Mídelo con un número (12 libros) o con las tareas que lo acercan."
              action={
                <Button icon={<Plus size={15} />} onClick={onNew}>
                  Nuevo objetivo
                </Button>
              }
            />
          ) : tab === 'achieved' ? (
            <EmptyState
              icon={<Trophy size={18} />}
              title="Aún no hay objetivos cumplidos"
              description="Cuando cumplas uno, lo verás aquí con su fecha. Paso a paso."
            />
          ) : (
            <EmptyState
              icon={<Archive size={18} />}
              title="Nada archivado"
              description="Archiva los objetivos que pausas: salen de tu vista sin perder su progreso."
            />
          )}
        </div>
      )}
    </section>
  )
}
