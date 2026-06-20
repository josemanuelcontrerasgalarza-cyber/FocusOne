'use client'

import { useState } from 'react'
import { Minus, Plus, Target } from 'lucide-react'
import { GlassPanel } from '@/glass/GlassPanel'
import { Ring } from '@/glass/Ring'
import { useDailyGoal } from '@/lib/useDailyGoal'

interface Props {
  userId: string
  completedToday: number
  delay?: number
}

/**
 * Meta diaria: el usuario fija cuántos objetivos quiere completar hoy y ve su
 * avance en un anillo. La meta se guarda por usuario en localStorage.
 */
export function DailyGoal({ userId, completedToday, delay = 0 }: Props) {
  const { goal, setGoal } = useDailyGoal(userId)
  const [editing, setEditing] = useState(false)

  const progress = goal > 0 ? completedToday / goal : 0
  const reached = completedToday >= goal
  const remaining = Math.max(0, goal - completedToday)

  return (
    <GlassPanel className="p-5" delay={delay} tilt={false}>
      <div className="flex items-center gap-5">
        <Ring progress={progress} size={104} stroke={8}>
          <span className="font-data text-2xl font-semibold leading-none text-ink">
            {completedToday}
          </span>
          <span className="font-data text-[10px] text-ink-ghost">de {goal}</span>
        </Ring>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-solar">
            <Target size={15} />
            <p className="font-data text-[11px] uppercase tracking-[0.2em]">Meta diaria</p>
          </div>
          <p className="mt-1.5 text-sm text-ink-dim">
            {reached ? (
              <>¡Meta alcanzada! <span className="text-core">Excelente disciplina.</span></>
            ) : (
              <>Te {remaining === 1 ? 'queda' : 'quedan'} <span className="font-semibold text-ink">{remaining}</span> {remaining === 1 ? 'objetivo' : 'objetivos'} para hoy.</>
            )}
          </p>

          {editing ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setGoal(goal - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-glass-border text-ink-dim transition-colors hover:border-glass-border-hi hover:text-ink"
              >
                <Minus size={13} />
              </button>
              <span className="w-8 text-center font-data text-sm font-semibold">{goal}</span>
              <button
                onClick={() => setGoal(goal + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-glass-border text-ink-dim transition-colors hover:border-glass-border-hi hover:text-ink"
              >
                <Plus size={13} />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="ml-1 rounded-lg border border-core/35 bg-core/10 px-3 py-1 text-xs text-core transition-colors hover:bg-core/20"
              >
                Listo
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="mt-3 text-xs text-ink-ghost transition-colors hover:text-core"
            >
              Ajustar meta →
            </button>
          )}
        </div>
      </div>
    </GlassPanel>
  )
}
