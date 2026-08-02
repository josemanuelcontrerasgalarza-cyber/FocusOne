'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Zap, Square, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { notificarESP32 } from '@/lib/notificarESP32'
import { isDbSetupError } from '@/lib/dbError'

const PRESETS = [
  { label: 'Express', minutes: 15 },
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

/**
 * Deep Work nativo de La Fragua (reemplaza la entrada al /focus glass).
 * Timer de enfoque con presets + duración personalizada. Registra la sesión en
 * focus_sessions y dispara la notificación ESP32 'deep_work_completado' al
 * completar de forma natural (no al abortar).
 */
export default function DeepWorkPage() {
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const reduceMotion = useReducedMotion()

  const [phase, setPhase] = useState<Phase>('setup')
  const [minutes, setMinutes] = useState(25)
  const [intention, setIntention] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  // Abortar pierde la sesión en curso: exige un segundo toque para confirmar.
  const [confirmAbort, setConfirmAbort] = useState(false)
  const endRef = useRef<number | null>(null)
  const startRef = useRef<Date | null>(null)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (tick.current) clearInterval(tick.current) }, [])

  async function recordSession(completed: boolean) {
    if (!uid || !startRef.current) return
    const { error } = await supabase.from('focus_sessions').insert({
      user_id: uid,
      task_id: null,
      started_at: startRef.current.toISOString(),
      ended_at: new Date().toISOString(),
      planned_minutes: minutes,
      completed,
    })
    // Si falta la tabla (setup no corrido) no molestamos con un toast en cada
    // sesión; solo avisamos ante un error real e inesperado.
    if (error && !isDbSetupError(error)) {
      toast.error('No se pudo guardar la sesión.')
    }
    // Deep Work completado → notificación física ESP32 (fire-and-forget).
    if (completed) void notificarESP32(uid, 'deep_work_completado')
  }

  function start() {
    setConfirmAbort(false)
    const total = minutes * 60
    startRef.current = new Date()
    endRef.current = Date.now() + total * 1000
    setSecondsLeft(total)
    setPhase('running')
    if (tick.current) clearInterval(tick.current)
    tick.current = setInterval(() => {
      if (endRef.current == null) return
      const left = Math.round((endRef.current - Date.now()) / 1000)
      if (left <= 0) {
        setSecondsLeft(0)
        finish(true)
      } else {
        setSecondsLeft(left)
      }
    }, 250)
  }

  function finish(natural: boolean) {
    if (tick.current) clearInterval(tick.current)
    endRef.current = null
    setConfirmAbort(false)
    if (natural) {
      setPhase('done')
      void recordSession(true)
    } else {
      setPhase('setup')
      void recordSession(false)
      toast.info('Sesión abortada')
    }
  }

  // Primer toque: arma la confirmación. Segundo toque: aborta de verdad.
  function handleAbortClick() {
    if (confirmAbort) {
      finish(false)
    } else {
      setConfirmAbort(true)
    }
  }

  const progress = phase === 'running' ? 1 - secondsLeft / (minutes * 60) : 0

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10 sm:px-12">
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="forge-panel p-6"
          >
            <p className="font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-ember">
              Modo Deep Work
            </p>
            <h1 className="mt-1 font-forge text-2xl font-extrabold tracking-tight">
              ¿Cuál es tu intención?
            </h1>
            <p className="mt-1 text-sm text-forge-ink-dim">
              Define tu foco y la duración.
            </p>

            <input
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="¿En qué te vas a concentrar?"
              className="mt-5 w-full rounded-lg border border-forge-line bg-forge-canvas px-3 py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint focus:border-ember/50"
            />

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map((d) => (
                <button
                  key={d.minutes}
                  onClick={() => setMinutes(d.minutes)}
                  className={`rounded-forge border px-2 py-3.5 text-center transition-colors ${
                    minutes === d.minutes
                      ? 'border-ember/50 bg-ember/[0.06] shadow-ember'
                      : 'border-forge-line bg-forge-surface hover:border-forge-ink-faint'
                  }`}
                >
                  <p className="font-num text-lg font-semibold text-forge-ink">{d.minutes}′</p>
                  <p className="text-[11px] text-forge-ink-faint">{d.label}</p>
                </button>
              ))}
            </div>

            {/* Duración personalizada: los minutos que el usuario necesite */}
            <div className="mt-3 flex items-center gap-3 rounded-forge border border-forge-line bg-forge-surface px-4 py-2.5">
              <span className="text-sm text-forge-ink-dim">Personalizado</span>
              <input
                type="number"
                min={1}
                max={180}
                value={minutes}
                onChange={(e) =>
                  setMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))
                }
                aria-label="Minutos personalizados"
                className="ml-auto w-20 rounded-lg border border-forge-line bg-forge-canvas px-2 py-1.5 text-center font-num text-sm text-forge-ink outline-none focus:border-ember/50"
              />
              <span className="text-sm text-forge-ink-dim">min</span>
            </div>

            <button
              onClick={start}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ember px-6 py-3.5 font-forge text-[15px] font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px"
            >
              <Zap size={16} /> Entrar en foco
            </button>
          </motion.div>
        )}

        {phase === 'running' && (
          <motion.div
            key="running"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-8 py-10 text-center"
          >
            {intention && (
              <p className="max-w-md font-forge text-lg text-forge-ink-dim">
                {intention}
              </p>
            )}
            <p
              className="font-num text-[clamp(4rem,16vw,8rem)] font-semibold leading-none tabular-nums"
              style={{ color: '#FFB13B' }}
            >
              {format(secondsLeft)}
            </p>
            <div className="h-1.5 w-72 max-w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-ember transition-[width] duration-1000 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <button
              onClick={handleAbortClick}
              onBlur={() => setConfirmAbort(false)}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-forge text-sm font-semibold transition-colors ${
                confirmAbort
                  ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:text-red-200'
                  : 'border-white/[0.12] text-forge-ink-dim hover:border-white/30 hover:text-forge-ink'
              }`}
            >
              <Square size={14} /> {confirmAbort ? '¿Seguro? Toca de nuevo' : 'Abortar sesión'}
            </button>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            key="done"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="forge-panel p-8 text-center"
          >
            <motion.div
              initial={reduceMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ember/15 shadow-ember"
            >
              <CheckCircle2 className="text-ember" size={32} />
            </motion.div>
            <h2 className="font-forge text-2xl font-extrabold">Sesión completada</h2>
            <p className="mt-2 text-sm text-forge-ink-dim">
              {minutes} minutos de foco profundo.
            </p>
            <button
              onClick={() => setPhase('setup')}
              className="mt-6 inline-flex rounded-full border border-white/[0.12] px-6 py-3 font-forge text-sm font-semibold text-forge-ink-dim transition-colors hover:border-white/30 hover:text-forge-ink"
            >
              Nueva sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
