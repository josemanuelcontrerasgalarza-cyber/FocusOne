'use client'

import { useEffect, useState } from 'react'
import { Check, Coffee, Gem, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/primitives'
import { formatMinutes } from '@/lib/kairo/dates'
import type { Phase } from '@/lib/kairo/focusTimer'
import type { Task } from '@/lib/kairo/types'
import { FocusRing } from './FocusRing'

/**
 * Cierre de un bloque de enfoque completado: breve y sereno. El anillo se
 * llena, aparece el check y la cifra en serif. Sin confeti ni ventanas.
 */
export function FocusSummary({
  seconds,
  title,
  task,
  today,
  goalMinutes,
  nextBreak,
  canReflect,
  onBreak,
  onAgain,
  onMarkDone,
  onReflect,
  onNewSetup,
}: {
  seconds: number
  title: string
  task: Task | null
  today: { minutes: number; sessions: number }
  goalMinutes: number
  nextBreak: { phase: Phase; minutes: number } | null
  canReflect: boolean
  onBreak: () => void
  onAgain: () => void
  onMarkDone: () => void
  onReflect: () => void
  onNewSetup: () => void
}) {
  const [fill, setFill] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(1))
    return () => cancelAnimationFrame(id)
  }, [])

  const minutes = Math.round(seconds / 60)
  const goal = Math.max(1, goalMinutes)
  const reached = today.minutes >= goal
  const taskDone = task?.status === 'completed'

  return (
    <section aria-labelledby="summary-title" className="flex w-full animate-fade-in flex-col items-center text-center">
      <div className="relative w-[min(44vw,168px)]">
        <FocusRing progress={fill} head={false} timing="900ms cubic-bezier(.16,1,.3,1)" className="w-full">
          <span className="flex h-12 w-12 animate-check-pop items-center justify-center rounded-full bg-accent text-accent-ink">
            <Check size={24} strokeWidth={2.6} aria-hidden />
          </span>
        </FocusRing>
      </div>

      <p className="k-eyebrow mt-6">Sesión completada</p>
      <h1 id="summary-title" className="mt-2 font-display text-[44px] leading-none text-ink sm:text-[56px]">
        {formatMinutes(minutes)} de enfoque
      </h1>
      <p className="mt-3 line-clamp-2 max-w-md text-[15px] text-ink-dim">{title}</p>

      <div className="mt-8 w-full max-w-sm rounded-card border border-line bg-surface px-4 py-3.5 text-left">
        <div className="flex items-baseline justify-between gap-3">
          <p className="k-eyebrow">Hoy</p>
          <p className="font-mono text-[13px] text-ink">
            {today.minutes}
            <span className="text-ink-faint"> / {goal} min</span>
          </p>
        </div>
        <ProgressBar value={today.minutes / goal} className="mt-2" />
        <p className="mt-2 text-xs text-ink-dim">
          {today.sessions} {today.sessions === 1 ? 'sesión' : 'sesiones'} ·{' '}
          {reached ? 'Meta diaria cumplida.' : `Te faltan ${formatMinutes(goal - today.minutes)} para tu meta.`}
        </p>
      </div>

      <div className="mt-8 flex w-full max-w-md flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        {nextBreak && (
          <Button variant="primary" size="lg" icon={<Coffee size={16} />} onClick={onBreak}>
            Tomar un descanso · {nextBreak.minutes} min
          </Button>
        )}
        <Button size="lg" icon={<RotateCcw size={15} />} onClick={taskDone ? onNewSetup : onAgain}>
          Otra sesión
        </Button>
      </div>

      {task && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {canReflect && !taskDone && (
            <Button variant="ghost" icon={<Gem size={15} />} onClick={onReflect}>
              Cerrar con reflexión
              <span className="font-mono text-xs text-accent-fg">+diamantes</span>
            </Button>
          )}
          <Button
            variant="ghost"
            icon={<Check size={15} className={taskDone ? 'text-success' : undefined} />}
            onClick={onMarkDone}
            disabled={taskDone}
          >
            {taskDone ? 'Tarea hecha' : 'Marcar tarea como hecha'}
          </Button>
        </div>
      )}
    </section>
  )
}
