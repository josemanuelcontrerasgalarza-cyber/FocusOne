'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Square, CheckCircle2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { useTaskStore } from '@/store/taskStore'
import { useCosmos } from '@/cosmos/state/useCosmos'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { type Task } from '@/types'

const DURATIONS = [
  { label: 'Sprint', minutes: 25 },
  { label: 'Profundo', minutes: 50 },
  { label: 'Monk mode', minutes: 90 },
]

type Phase = 'setup' | 'running' | 'done'

function format(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function FocusMode() {
  const user = useAuthStore((s) => s.user)
  const { fetchUserPending, completeTask } = useTaskStore()

  const [phase, setPhase] = useState<Phase>('setup')
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [task, setTask] = useState<Task | null>(null)
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const startedAt = useRef<Date | null>(null)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (user?.id) fetchUserPending(user.id).then(setPendingTasks)
  }, [user?.id, fetchUserPending])

  useEffect(() => {
    return () => {
      if (interval.current) clearInterval(interval.current)
      useCosmos.getState().setFocusActive(false)
      useCosmos.getState().setKratosState('idle')
    }
  }, [])

  function start() {
    setSecondsLeft(minutes * 60)
    setPhase('running')
    startedAt.current = new Date()
    useCosmos.getState().setFocusActive(true)
    useCosmos.getState().setKratosState('listening')
    interval.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finish(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  async function recordSession(completed: boolean) {
    if (!user || !startedAt.current) return
    // Best-effort: si la tabla focus_sessions aún no existe, no rompe nada
    await supabase
      .from('focus_sessions')
      .insert({
        user_id: user.id,
        task_id: task?.id ?? null,
        started_at: startedAt.current.toISOString(),
        ended_at: new Date().toISOString(),
        planned_minutes: minutes,
        completed,
      })
      .then(() => undefined, () => undefined)
  }

  function finish(natural: boolean) {
    if (interval.current) clearInterval(interval.current)
    useCosmos.getState().setFocusActive(false)
    if (natural) {
      setPhase('done')
      useCosmos.getState().celebrate()
      void recordSession(true)
    } else {
      setPhase('setup')
      useCosmos.getState().setKratosState('idle')
      void recordSession(false)
      toast.info('Sesión abortada')
    }
  }

  async function completeMissionTask() {
    if (task) {
      await completeTask(task.id, task.project_id)
      useCosmos.getState().celebrate()
      toast.success('⚡ Objetivo completado')
    }
    setPhase('setup')
    setTask(null)
    if (user?.id) fetchUserPending(user.id).then(setPendingTasks)
  }

  const progress = phase === 'running' ? 1 - secondsLeft / (minutes * 60) : 0

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div
            key="setup"
            className="w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassPanel className="p-6">
              <p className="font-data text-[11px] uppercase tracking-[0.3em] text-core">
                Modo Deep Work
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold">¿Cuál es tu intención?</h1>

              <div className="mt-4 flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
                {pendingTasks.length === 0 && (
                  <p className="text-sm text-ink-ghost">
                    No tienes objetivos pendientes. Crea uno en tus misiones, o entra en foco libre.
                  </p>
                )}
                {pendingTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTask(task?.id === t.id ? null : t)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                      task?.id === t.id
                        ? 'border-core/60 bg-core/10 text-core shadow-glow-core'
                        : 'border-glass-border bg-black/20 text-ink-dim hover:text-ink'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.minutes}
                    onClick={() => setMinutes(d.minutes)}
                    className={`rounded-xl border px-2 py-3 text-center transition-all ${
                      minutes === d.minutes
                        ? 'border-plasma/60 bg-plasma/15 shadow-glow-plasma'
                        : 'border-glass-border bg-black/20 hover:bg-white/5'
                    }`}
                  >
                    <p className="font-data text-lg font-semibold">{d.minutes}′</p>
                    <p className="text-[11px] text-ink-ghost">{d.label}</p>
                  </button>
                ))}
              </div>

              <Button onClick={start} fullWidth size="lg" className="mt-5">
                <Zap size={16} /> Entrar en foco
              </Button>
            </GlassPanel>
          </motion.div>
        )}

        {phase === 'running' && (
          <motion.div
            key="running"
            className="flex flex-col items-center gap-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            {task && (
              <p className="max-w-md font-display text-lg text-ink-dim">
                ◉ <span className="text-ink">{task.title}</span>
              </p>
            )}
            <p className="font-data text-[clamp(4rem,18vw,9rem)] font-semibold leading-none text-ink [text-shadow:0_0_40px_rgba(94,234,212,0.35)]">
              {format(secondsLeft)}
            </p>
            <div className="h-1.5 w-72 overflow-hidden rounded-full bg-white/10">
              <div
                className="plasma-fill h-full rounded-full transition-[width] duration-1000 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <Button variant="ghost" onClick={() => finish(false)}>
              <Square size={14} /> Abortar sesión
            </Button>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            key="done"
            className="w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GlassPanel className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-core/15 shadow-glow-core"
              >
                <CheckCircle2 className="text-core" size={32} />
              </motion.div>
              <h2 className="font-display text-2xl font-semibold">
                Sesión <span className="text-gradient">completada</span>
              </h2>
              <p className="mt-2 text-sm text-ink-dim">{minutes} minutos de foco profundo.</p>
              <div className="mt-6 flex flex-col gap-2">
                {task && (
                  <Button onClick={completeMissionTask} fullWidth>
                    <CheckCircle2 size={15} /> Marcar «{task.title.slice(0, 28)}» como completado
                  </Button>
                )}
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setPhase('setup')
                    useCosmos.getState().setKratosState('idle')
                  }}
                >
                  Nueva sesión
                </Button>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FocusPage() {
  return (
    <AppShell>
      <FocusMode />
    </AppShell>
  )
}
