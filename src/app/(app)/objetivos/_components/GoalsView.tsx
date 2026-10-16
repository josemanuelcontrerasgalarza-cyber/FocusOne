'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/primitives'
import type { Goal, Habit } from '@/lib/kairo/types'
import { GoalFormModal } from '@/components/goals/GoalForm'
import { HabitFormModal } from '@/components/goals/HabitForm'
import { GoalsSection } from '@/components/goals/GoalsSection'
import { HabitsSection } from '@/components/goals/HabitsSection'
import { WeekSummary } from '@/components/goals/WeekSummary'
import { LevelPanel } from '@/components/goals/LevelPanel'
import { GoalHistory } from '@/components/goals/GoalHistory'
import { todayKey } from '@/components/goals/format'

type ModalState<T> = { open: boolean; item: T | null }

export function GoalsView() {
  const router = useRouter()
  const params = useSearchParams()
  const today = todayKey()

  // El item se conserva al cerrar para que el título no parpadee durante la salida.
  const [goalModal, setGoalModal] = useState<ModalState<Goal>>({ open: false, item: null })
  const [habitModal, setHabitModal] = useState<ModalState<Habit>>({ open: false, item: null })

  const newGoal = useCallback(() => {
    setHabitModal((m) => ({ ...m, open: false }))
    setGoalModal({ open: true, item: null })
  }, [])
  const newHabit = useCallback(() => {
    setGoalModal((m) => ({ ...m, open: false }))
    setHabitModal({ open: true, item: null })
  }, [])
  const editGoal = useCallback((g: Goal) => setGoalModal({ open: true, item: g }), [])
  const editHabit = useCallback((h: Habit) => setHabitModal({ open: true, item: h }), [])
  const closeGoal = useCallback(() => setGoalModal((m) => ({ ...m, open: false })), [])
  const closeHabit = useCallback(() => setHabitModal((m) => ({ ...m, open: false })), [])

  // ?nuevo=1|objetivo → formulario de objetivo (con opción de cambiar a hábito); ?nuevo=habito → hábito.
  const nuevo = params.get('nuevo')
  useEffect(() => {
    if (!nuevo) return
    if (nuevo === 'habito' || nuevo === 'hábito') newHabit()
    else newGoal()
    router.replace('/objetivos', { scroll: false })
  }, [nuevo, newGoal, newHabit, router])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Objetivos"
        description="Hacia dónde vas y lo que repites para llegar."
        actions={
          <>
            <Button icon={<Repeat size={15} />} onClick={newHabit}>
              Nuevo hábito
            </Button>
            <Button variant="primary" icon={<Plus size={15} strokeWidth={2.4} />} onClick={newGoal}>
              Nuevo objetivo
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-8 sm:mt-8 sm:gap-10">
        <WeekSummary today={today} />
        <GoalsSection today={today} onNew={newGoal} onEdit={editGoal} />
        <HabitsSection today={today} onNew={newHabit} onEdit={editHabit} />
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <LevelPanel />
          <GoalHistory />
        </div>
      </div>

      <GoalFormModal open={goalModal.open} goal={goalModal.item} onClose={closeGoal} onSwitchToHabit={newHabit} />
      <HabitFormModal open={habitModal.open} habit={habitModal.item} onClose={closeHabit} onSwitchToGoal={newGoal} />
    </div>
  )
}
