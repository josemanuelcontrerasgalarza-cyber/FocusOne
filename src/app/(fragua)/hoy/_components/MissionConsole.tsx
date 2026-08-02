'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { notificarESP32 } from '@/lib/notificarESP32'
import { QuizModal } from '@/components/forge/QuizModal'
import type { QuizOutcome } from '@/lib/quiz'
import type { Mission, TodayStat } from '@/types'

interface Props {
  mission: Mission | null
  stats: TodayStat[]
  upcoming: { id: string; title: string }[]
  isDemo: boolean
}

/** mm:ss a partir de segundos restantes. */
function formatTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function MissionConsole({ mission, stats, upcoming, isDemo }: Props) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  return (
    <div className="grid flex-1 grid-cols-1 gap-px bg-forge-line lg:grid-cols-[1.7fr_1fr]">
      {/* Columna protagonista: misión + timer, o estado vacío */}
      <section className="relative flex flex-col justify-center overflow-hidden bg-forge-canvas px-7 py-14 sm:px-14">
        {/* Resplandor ember de fondo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-[10%] -top-[20%] h-[600px] w-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,106,43,0.10), transparent 70%)',
          }}
        />
        {mission ? (
          <MissionTimer
            key={mission.id}
            mission={mission}
            isDemo={isDemo}
            reduceMotion={!!reduceMotion}
            onForged={() => router.refresh()}
          />
        ) : (
          <EmptyMission />
        )}
      </section>

      {/* Panel lateral: Hoy (stats) + Próximas */}
      <aside className="flex flex-col gap-11 bg-forge-canvas px-8 py-14 sm:px-10">
        <div>
          <SectionLabel>Hoy</SectionLabel>
          <div className="grid grid-cols-2 gap-x-6 gap-y-7">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="mb-1 font-num text-2xl font-semibold text-forge-ink">
                  {stat.value}
                </div>
                <div className="text-xs text-forge-ink-dim">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-forge-line" />

        <div>
          <SectionLabel>Próximas</SectionLabel>
          {upcoming.length === 0 ? (
            <p className="text-sm text-forge-ink-faint">
              Sin misiones pendientes.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {upcoming.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-3 opacity-60"
                >
                  <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full border-[1.5px] border-forge-ink-faint" />
                  <span className="text-sm text-forge-ink-dim">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Timer de la misión activa                                                 */
/* -------------------------------------------------------------------------- */

function MissionTimer({
  mission,
  isDemo,
  reduceMotion,
  onForged,
}: {
  mission: Mission
  isDemo: boolean
  reduceMotion: boolean
  onForged: () => void
}) {
  const total = mission.estimated_minutes * 60

  // Id real del usuario (para la notificación ESP32). En demo no hay sesión.
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)

  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [forged, setForged] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  // Chispa de calor que "drena" hacia la racha al forjar (coords fixed).
  const [spark, setSpark] = useState<{ x: number; y: number } | null>(null)

  const barRef = useRef<HTMLDivElement>(null)
  // Instante del primer "Comenzar enfoque" — se registra en focus_sessions al forjar.
  const startedAtRef = useRef<string | null>(null)
  // Evita disparar el pomodoro dos veces por misión.
  const pomodoroFiredRef = useRef(false)
  // Distingue "el timer llegó a 0 solo" (pomodoro) de "Terminar misión" (forzado).
  const forcedRef = useRef(false)

  // Tick de 1s: sube el calor mientras corre. Al llegar al tope se detiene.
  useEffect(() => {
    if (!isRunning || forged) return
    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = Math.min(prev + 1, total)
        if (next >= total) setIsRunning(false)
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, forged, total])

  // Pomodoro completado: el bloque de enfoque de la misión llegó a 00:00 por sí
  // solo. NO cuenta cuando el usuario pulsa "Terminar misión" (forcedRef).
  // Dispara la notificación física ESP32 una sola vez por misión.
  useEffect(() => {
    if (elapsed >= total && !pomodoroFiredRef.current) {
      pomodoroFiredRef.current = true
      if (!forcedRef.current && uid) {
        void notificarESP32(uid, 'pomodoro_completado')
      }
    }
  }, [elapsed, total, uid])

  const remaining = total - elapsed
  const heatPercent = Math.min(100, (elapsed / total) * 100)
  const timeDisplay = formatTime(remaining)

  // "Terminar misión" abre el quiz de cierre. La misión NO se completa hasta
  // que el quiz se verifica (gate del quiz). El timer se pausa mientras tanto.
  function completeMission() {
    if (forged) return
    setIsRunning(false)
    setQuizOpen(true)
  }

  // El quiz ya persistió todo (misión completada + quiz_results + puntos +
  // notificación ESP32 'mision_completada'). Aquí solo hacemos el forjado
  // visual (drenaje de calor hacia la racha) y refrescamos los datos.
  function runForge() {
    forcedRef.current = true
    pomodoroFiredRef.current = true
    setElapsed(total) // llena el calor al máximo antes de drenar

    if (reduceMotion) {
      setForged(true)
      onForged()
      return
    }
    // Lanza la chispa desde el extremo derecho de la barra hacia la racha
    // (esquina superior derecha, donde vive la insignia).
    const rect = barRef.current?.getBoundingClientRect()
    if (rect) {
      setSpark({ x: rect.right, y: rect.top + rect.height / 2 })
    } else {
      setForged(true)
      onForged()
    }
  }

  function handleQuizCompleted(outcome: QuizOutcome) {
    setQuizOpen(false)
    toast.success(`Misión forjada 🔥 +${outcome.pointsEarned} puntos`)
    runForge()
  }

  return (
    <div className="relative">
      <div className="mb-5 font-num text-xs font-semibold uppercase tracking-[0.14em] text-ember">
        {forged ? 'Misión forjada' : 'Misión activa'}
      </div>

      <h1 className="m-0 mb-3.5 max-w-xl font-forge text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-[52px]">
        {mission.title}
      </h1>

      {mission.project && (
        <p className="m-0 mb-12 text-[15px] text-forge-ink-dim">
          {mission.project}
        </p>
      )}

      {/* Timer */}
      <div className="mb-5 flex items-baseline gap-4">
        <span
          className="font-num text-6xl font-semibold tabular-nums tracking-tight transition-colors sm:text-[76px]"
          style={{ color: isRunning ? '#FFB13B' : '#EDEBE7' }}
        >
          {timeDisplay}
        </span>
        <span className="font-num text-base text-forge-ink-faint">
          / {formatTime(total)}
        </span>
      </div>

      {/* Barra de calor */}
      <div
        ref={barRef}
        className="mb-11 h-1.5 w-full max-w-[520px] overflow-hidden rounded-full bg-white/[0.07]"
      >
        <motion.div
          className="h-full rounded-full bg-ember"
          initial={false}
          animate={{ width: forged ? '0%' : `${heatPercent}%` }}
          transition={
            forged
              ? { duration: 0.9, ease: 'easeIn' } // drena
              : { duration: 1, ease: 'linear' } // sube por tick
          }
          style={{ transformOrigin: 'right' }}
        />
      </div>

      {/* Botones */}
      {forged ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-metal/40 bg-metal/10 px-5 py-3 font-forge text-[15px] font-semibold text-metal">
            <Check size={18} strokeWidth={2.6} />
            Forjada
          </span>
          <NextMissionButton isDemo={isDemo} />
        </div>
      ) : (
        <div className="flex items-center gap-3.5">
          <button
            onClick={() =>
              setIsRunning((r) => {
                const next = !r
                if (next && !startedAtRef.current) startedAtRef.current = new Date().toISOString()
                return next
              })
            }
            className="flex items-center gap-2.5 rounded-full bg-ember px-7 py-4 font-forge text-[15px] font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px"
          >
            {isRunning ? 'Pausar' : 'Comenzar enfoque'}
          </button>
          <button
            onClick={completeMission}
            className="rounded-full border border-white/[0.12] px-6 py-4 font-forge text-[15px] font-semibold text-forge-ink-dim transition-colors hover:border-white/30 hover:text-forge-ink"
          >
            Terminar misión
          </button>
        </div>
      )}

      {/* Chispa de drenaje hacia la racha */}
      <AnimatePresence>
        {spark && (
          <motion.div
            className="pointer-events-none fixed left-0 top-0 z-50 h-3 w-3 rounded-full bg-ember shadow-ember"
            initial={{ x: spark.x, y: spark.y, opacity: 1, scale: 1 }}
            animate={{
              x: typeof window !== 'undefined' ? window.innerWidth - 60 : spark.x,
              y: 28,
              opacity: 0,
              scale: 0.4,
            }}
            transition={{ duration: 0.85, ease: 'easeInOut' }}
            onAnimationComplete={() => {
              setSpark(null)
              setForged(true)
              onForged() // refresca stats/racha/próximas
            }}
          />
        )}
      </AnimatePresence>

      {/* Quiz de cierre — se abre al pulsar "Terminar misión" */}
      <AnimatePresence>
        {quizOpen && (
          <QuizModal
            mission={mission}
            uid={uid}
            isDemo={isDemo}
            startedAt={startedAtRef.current ?? undefined}
            onClose={() => setQuizOpen(false)}
            onCompleted={handleQuizCompleted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function NextMissionButton({ isDemo }: { isDemo: boolean }) {
  // En demo no hay a dónde navegar con datos reales; en real lleva a Misiones.
  if (isDemo) {
    return (
      <span className="text-sm text-forge-ink-faint">
        Elige la siguiente en Misiones
      </span>
    )
  }
  return (
    <Link
      href="/misiones"
      className="rounded-full border border-white/[0.12] px-6 py-3 font-forge text-sm font-semibold text-forge-ink-dim transition-colors hover:border-white/30 hover:text-forge-ink"
    >
      Siguiente misión
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/*  Estado vacío: usuario real sin misión activa                              */
/* -------------------------------------------------------------------------- */

function EmptyMission() {
  return (
    <div className="relative max-w-md">
      <div className="mb-5 font-num text-xs font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
        El taller está frío
      </div>
      <h1 className="m-0 mb-4 font-forge text-4xl font-extrabold leading-[1.05] tracking-tight">
        Sin misión activa
      </h1>
      <p className="m-0 mb-8 text-[15px] text-forge-ink-dim">
        Enciende una misión para empezar a forjar. Solo puede haber una activa a
        la vez.
      </p>
      <Link
        href="/misiones"
        className="inline-flex items-center rounded-full bg-ember px-7 py-4 font-forge text-[15px] font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px"
      >
        Ir a Misiones
      </Link>
    </div>
  )
}
