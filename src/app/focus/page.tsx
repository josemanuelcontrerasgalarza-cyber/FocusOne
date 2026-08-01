'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Square, CheckCircle2, Coffee, SkipForward } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { Button } from '@/glass/Button'
import { Ring } from '@/glass/Ring'
import { useAuthStore } from '@/store/authStore'
import { useTaskStore } from '@/store/taskStore'
import { useFocusStore } from '@/store/focusStore'
import { useCosmos } from '@/cosmos/state/useCosmos'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { type Task } from '@/types'

const DURATIONS = [
  { label: 'Express', minutes: 15 },
  { label: 'Sprint', minutes: 25 },
  { label: 'Profundo', minutes: 50 },
  { label: 'Monk mode', minutes: 90 },
]

const BREAKS = [5, 15]

const STORAGE_KEY = 'focusone_active_session'

type Phase = 'setup' | 'running' | 'done' | 'break'

interface PersistedSession {
  task: Task | null
  minutes: number
  startedAt: string
  endTime: number
}

function format(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function enterFullscreen() {
  const el = document.documentElement
  el.requestFullscreen?.().catch(() => undefined)
}

function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined)
}

function FocusMode() {
  const user = useAuthStore((s) => s.user)
  const { fetchUserPending, completeTask } = useTaskStore()
  const { stats: focusStats, fetchSessions } = useFocusStore()

  const [phase, setPhase] = useState<Phase>('setup')
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [task, setTask] = useState<Task | null>(null)
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [restored, setRestored] = useState(false)
  const [breakLeft, setBreakLeft] = useState(0)
  const [breakTotal, setBreakTotal] = useState(0)
  const startedAt = useRef<Date | null>(null)
  const endTime = useRef<number | null>(null)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const breakEnd = useRef<number | null>(null)
  const breakInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  function tick() {
    if (endTime.current == null) return
    const left = Math.round((endTime.current - Date.now()) / 1000)
    if (left <= 0) {
      setSecondsLeft(0)
      finish(true)
    } else {
      setSecondsLeft(left)
    }
  }

  function beginInterval() {
    if (interval.current) clearInterval(interval.current)
    interval.current = setInterval(tick, 250)
  }

  function persist(session: PersistedSession) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      /* almacenamiento no disponible */
    }
  }

  function clearPersisted() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchUserPending(user.id).then(setPendingTasks)
      fetchSessions(user.id)
    }
  }, [user?.id, fetchUserPending, fetchSessions])

  // Restaurar una sesión activa tras recarga o cierre accidental
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const s = JSON.parse(raw) as PersistedSession
        if (s.endTime > Date.now()) {
          // La sesión sigue viva: reanudar exactamente donde quedó
          setTask(s.task)
          setMinutes(s.minutes)
          startedAt.current = new Date(s.startedAt)
          endTime.current = s.endTime
          setSecondsLeft(Math.round((s.endTime - Date.now()) / 1000))
          setPhase('running')
          useCosmos.getState().setFocusActive(true)
          useCosmos.getState().setKratosState('listening')
          beginInterval()
          toast.info('Sesión de foco reanudada')
        } else {
          // Expiró mientras la pestaña estaba cerrada: contar como completada
          setTask(s.task)
          setMinutes(s.minutes)
          startedAt.current = new Date(s.startedAt)
          setPhase('done')
          useCosmos.getState().celebrate()
          void recordSession(true, {
            task: s.task,
            minutes: s.minutes,
            startedAt: new Date(s.startedAt),
          })
          clearPersisted()
        }
      }
    } catch {
      /* sesión corrupta: ignorar */
    }
    setRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (interval.current) clearInterval(interval.current)
      if (breakInterval.current) clearInterval(breakInterval.current)
      useCosmos.getState().setFocusActive(false)
      useCosmos.getState().setKratosState('idle')
      exitFullscreen()
    }
  }, [])

  function start() {
    const totalSeconds = minutes * 60
    const end = Date.now() + totalSeconds * 1000
    startedAt.current = new Date()
    endTime.current = end
    setSecondsLeft(totalSeconds)
    setPhase('running')
    useCosmos.getState().setFocusActive(true)
    useCosmos.getState().setKratosState('listening')
    persist({ task, minutes, startedAt: startedAt.current.toISOString(), endTime: end })
    beginInterval()
    enterFullscreen()
  }

  async function recordSession(
    completed: boolean,
    override?: { task: Task | null; minutes: number; startedAt: Date },
  ) {
    // Al restaurar una sesión tras recarga, `user` y el estado aún no están
    // poblados en el primer render; leemos del store y aceptamos overrides para
    // no registrar valores obsoletos (planned_minutes/task_id incorrectos).
    const activeUser = user ?? useAuthStore.getState().user
    const start = override?.startedAt ?? startedAt.current
    if (!activeUser || !start) return
    // Best-effort: si la tabla focus_sessions aún no existe, no rompe nada
    await supabase
      .from('focus_sessions')
      .insert({
        user_id: activeUser.id,
        task_id: (override ? override.task?.id : task?.id) ?? null,
        started_at: start.toISOString(),
        ended_at: new Date().toISOString(),
        planned_minutes: override?.minutes ?? minutes,
        completed,
      })
      .then(() => undefined, () => undefined)
  }

  function finish(natural: boolean) {
    if (interval.current) clearInterval(interval.current)
    endTime.current = null
    clearPersisted()
    useCosmos.getState().setFocusActive(false)
    exitFullscreen()
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

  function breakTick() {
    if (breakEnd.current == null) return
    const left = Math.round((breakEnd.current - Date.now()) / 1000)
    if (left <= 0) {
      setBreakLeft(0)
      endBreak(true)
    } else {
      setBreakLeft(left)
    }
  }

  function startBreak(min: number) {
    const total = min * 60
    breakEnd.current = Date.now() + total * 1000
    setBreakTotal(total)
    setBreakLeft(total)
    setPhase('break')
    useCosmos.getState().setKratosState('idle')
    if (breakInterval.current) clearInterval(breakInterval.current)
    breakInterval.current = setInterval(breakTick, 250)
  }

  function endBreak(natural: boolean) {
    if (breakInterval.current) clearInterval(breakInterval.current)
    breakEnd.current = null
    setPhase('setup')
    if (natural) toast.success('Descanso terminado. ¿List@ para otra ronda?')
  }

  const progress = phase === 'running' ? 1 - secondsLeft / (minutes * 60) : 0
  const breakProgress = breakTotal > 0 ? 1 - breakLeft / breakTotal : 0

  // Evitar parpadeo de "setup" antes de restaurar una sesión activa
  if (!restored) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gradient-to-br from-core to-plasma shadow-glow-core" />
      </div>
    )
  }

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
            <GlassPanel className="p-6 card-accent-core">
              <p className="font-data text-[11px] uppercase tracking-[0.3em] text-core">
                ◉ Modo Deep Work
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold">¿Cuál es tu intención?</h1>

              <p className="mt-0.5 text-sm text-ink-ghost">Selecciona un objetivo y una duración.</p>

              {(focusStats.todayMinutes > 0 || focusStats.totalSessions > 0) && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-glass-border bg-black/20 px-3 py-2 font-data text-[11px] text-ink-ghost">
                  <span className="text-core">◉ Hoy</span>
                  <span>{focusStats.todayMinutes} min de foco</span>
                </div>
              )}

              <div className="mt-4 flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-1">
                {pendingTasks.length === 0 && (
                  <p className="rounded-xl border border-glass-border bg-black/20 px-3 py-3 text-sm text-ink-ghost">
                    Sin objetivos pendientes — puedes entrar en foco libre.
                  </p>
                )}
                {pendingTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTask(task?.id === t.id ? null : t)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                      task?.id === t.id
                        ? 'border-core/55 bg-core/10 text-core shadow-glow-core'
                        : 'border-glass-border bg-black/20 text-ink-dim hover:border-glass-border-hi hover:text-ink'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DURATIONS.map((d) => (
                  <button
                    key={d.minutes}
                    onClick={() => setMinutes(d.minutes)}
                    className={`rounded-xl border px-2 py-3.5 text-center transition-all ${
                      minutes === d.minutes
                        ? 'border-plasma/55 bg-plasma/15 shadow-glow-plasma'
                        : 'border-glass-border bg-black/20 hover:bg-white/[0.06]'
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
            className="flex flex-col items-center gap-6 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            {task && (
              <motion.p
                className="max-w-md rounded-full border border-core/25 bg-core/8 px-4 py-1.5 font-display text-sm text-core"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ◉ {task.title}
              </motion.p>
            )}

            {/* Progreso circular */}
            <div className="relative flex items-center justify-center">
              <svg width="240" height="240" className="-rotate-90">
                <circle cx="120" cy="120" r="108" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <motion.circle
                  cx="120" cy="120" r="108" fill="none"
                  stroke="url(#timerGrad)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 108}
                  animate={{ strokeDashoffset: 2 * Math.PI * 108 * (1 - progress) }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#5EEAD4" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center">
                <p className="font-data text-[3.5rem] font-semibold leading-none text-ink [text-shadow:0_0_32px_rgba(94,234,212,0.4)]">
                  {format(secondsLeft)}
                </p>
                <p className="mt-1 font-data text-[10px] uppercase tracking-[0.3em] text-ink-ghost">
                  {minutes} min · {Math.round(progress * 100)}%
                </p>
              </div>
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

                {/* Descanso (ciclo Pomodoro) */}
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-data text-[11px] uppercase tracking-wider text-ink-ghost">
                    <Coffee size={13} /> Descanso
                  </span>
                  {BREAKS.map((b) => (
                    <button
                      key={b}
                      onClick={() => startBreak(b)}
                      className="flex-1 rounded-xl border border-solar/35 bg-solar/10 py-2 font-data text-sm text-solar transition-all hover:bg-solar/20 hover:shadow-glow-solar"
                    >
                      {b} min
                    </button>
                  ))}
                </div>

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

        {phase === 'break' && (
          <motion.div
            key="break"
            className="flex flex-col items-center gap-6 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <p className="flex items-center gap-2 rounded-full border border-solar/25 bg-solar/10 px-4 py-1.5 font-display text-sm text-solar">
              <Coffee size={15} /> Descanso
            </p>
            <Ring progress={breakProgress} size={240} stroke={6} from="#F59E0B" to="#FB7185">
              <p className="font-data text-[3.5rem] font-semibold leading-none text-ink [text-shadow:0_0_32px_rgba(245,158,11,0.4)]">
                {format(breakLeft)}
              </p>
              <p className="mt-1 font-data text-[10px] uppercase tracking-[0.3em] text-ink-ghost">
                Respira · recarga
              </p>
            </Ring>
            <Button variant="ghost" onClick={() => endBreak(false)}>
              <SkipForward size={14} /> Saltar descanso
            </Button>
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
