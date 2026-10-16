'use client'

import { Check, Pause, Play, SkipForward, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/primitives'
import { formatClock, type Phase } from '@/lib/kairo/focusTimer'
import { formatMinutes } from '@/lib/kairo/dates'
import { PHASE_LABEL } from '@/components/focus/storage'
import { FocusRing } from './FocusRing'

const pad = (n: number) => String(n).padStart(2, '0')
const clockTime = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Texto para lectores de pantalla: cambia como mucho una vez por minuto. */
function minuteAnnouncement(phase: Phase, remainingSec: number, paused: boolean) {
  const m = Math.ceil(remainingSec / 60)
  const what = phase === 'focus' ? 'de enfoque' : 'de descanso'
  if (paused) return `En pausa. Quedan ${m} ${m === 1 ? 'minuto' : 'minutos'} ${what}.`
  return `Quedan ${m} ${m === 1 ? 'minuto' : 'minutos'} ${what}.`
}

/**
 * Pantalla del temporizador (en marcha, en pausa o preparado para empezar).
 * `mode="ready"` muestra la fase siguiente sin iniciar.
 */
export function FocusStage({
  mode,
  phase,
  title,
  progress,
  remainingSec,
  paused,
  endsAt,
  sessionIndex,
  nextTitle,
  justDone,
  onPrimary,
  onEnd,
  onSkip,
  onChange,
}: {
  mode: 'live' | 'ready'
  phase: Phase
  title: string
  progress: number
  remainingSec: number
  paused: boolean
  endsAt: number | null
  sessionIndex: { n: number; of: number } | null
  /** en descanso: en qué sigues después */
  nextTitle?: string | null
  /** en descanso: el enfoque que acabas de completar */
  justDone?: { seconds: number } | null
  onPrimary: () => void
  onEnd: () => void
  onSkip?: () => void
  onChange?: () => void
}) {
  const isFocus = phase === 'focus'
  const eyebrow =
    mode === 'ready'
      ? isFocus
        ? 'Descanso terminado'
        : PHASE_LABEL[phase]
      : `${PHASE_LABEL[phase]}${isFocus && sessionIndex ? ` · ${sessionIndex.n} de ${sessionIndex.of}` : ''}`

  return (
    <section aria-label={PHASE_LABEL[phase]} className="flex w-full animate-fade-in flex-col items-center text-center">
      <p className="k-eyebrow">{eyebrow}</p>
      {isFocus ? (
        <h1 className="mt-3 line-clamp-2 max-w-2xl text-balance font-display text-[32px] leading-[1.1] text-ink sm:text-[44px]">
          {title}
        </h1>
      ) : (
        <>
          <h1 className="mt-3 font-display text-[32px] leading-[1.1] text-ink sm:text-[44px]">Descansar también cuenta</h1>
          {nextTitle && <p className="mt-2 line-clamp-1 max-w-md text-sm text-ink-dim">Después: {nextTitle}</p>}
        </>
      )}

      {justDone && !isFocus && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-dim">
          <Check size={12} className="text-accent-fg" strokeWidth={2.6} aria-hidden />
          Sesión completada · {formatMinutes(justDone.seconds / 60)}
        </p>
      )}

      <FocusRing
        progress={progress}
        tone={isFocus ? 'focus' : 'break'}
        head={mode === 'live'}
        className="mt-8 w-[min(78vw,340px)] sm:mt-10"
      >
        <span
          role="timer"
          aria-live="off"
          aria-label={`Tiempo restante: ${formatClock(remainingSec)}`}
          className={
            'font-mono text-[clamp(56px,17vw,88px)] font-medium leading-none tracking-[-0.04em] ' +
            (paused || mode === 'ready' ? 'text-ink-dim' : 'text-ink')
          }
        >
          {formatClock(remainingSec)}
        </span>
        <span className="mt-3 h-4 text-[13px] text-ink-faint">
          {mode === 'ready' ? `${Math.round(remainingSec / 60)} min` : paused ? 'En pausa' : endsAt ? `Termina a las ${clockTime(endsAt)}` : ''}
        </span>
      </FocusRing>

      {mode === 'live' && (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {minuteAnnouncement(phase, remainingSec, paused)}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-10">
        {mode === 'ready' ? (
          <>
            <Button variant="primary" size="lg" icon={<Play size={16} />} onClick={onPrimary} className="min-w-[180px]">
              {isFocus ? 'Iniciar enfoque' : 'Empezar descanso'}
            </Button>
            {onChange && (
              <Button variant="ghost" size="lg" onClick={onChange}>
                Cambiar tarea
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              icon={paused ? <Play size={16} /> : <Pause size={16} />}
              onClick={onPrimary}
              className="min-w-[160px]"
              aria-keyshortcuts="Space"
            >
              {paused ? 'Reanudar' : 'Pausar'}
            </Button>
            {!isFocus && onSkip && (
              <Button size="lg" icon={<SkipForward size={16} />} onClick={onSkip}>
                Saltar descanso
              </Button>
            )}
            <Button variant={isFocus ? 'secondary' : 'ghost'} size="lg" icon={<Square size={14} />} onClick={onEnd}>
              {isFocus ? 'Terminar' : 'Terminar ciclo'}
            </Button>
          </>
        )}
      </div>

      <p className="mt-5 hidden items-center gap-1.5 text-xs text-ink-faint sm:inline-flex">
        <Kbd>Espacio</Kbd> {mode === 'ready' ? 'iniciar' : paused ? 'reanudar' : 'pausar'}
        <span className="mx-1.5 text-line-strong">·</span>
        <Kbd>Esc</Kbd> salir
      </p>
    </section>
  )
}
