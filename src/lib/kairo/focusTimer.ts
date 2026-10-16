/**
 * Temporizador de enfoque basado en el RELOJ (no en ticks), persistible y
 * resistente a recargas. Un "latido" periódico registra que la pantalla
 * seguía abierta: si al volver hubo un hueco largo, solo se acredita el
 * tiempo hasta el último latido (no se convierte en sesión completa algo que
 * no se vio terminar).
 */

export type Phase = 'focus' | 'short' | 'long'

export interface TimerState {
  phase: Phase
  /** epoch ms del inicio */
  startedAt: number
  durationSec: number
  /** epoch ms en que se pausó (null si corre) */
  pausedAt: number | null
  /** ms acumulados en pausa (pausas ya cerradas) */
  pausedMs: number
  /** epoch ms del último latido con la pantalla abierta */
  lastBeat: number
  taskId: string | null
  label: string | null
  /** id de la fila en focus_sessions (si ya se creó) */
  sessionId: string | null
  /** nº de sesiones de enfoque completadas en este ciclo (para el descanso largo) */
  cycle: number
}

/** ms enfocados hasta `now` (descontando pausas). */
export function elapsedMs(t: TimerState, now: number): number {
  const end = t.pausedAt ?? now
  return Math.max(0, end - t.startedAt - t.pausedMs)
}

export function remainingSec(t: TimerState, now: number): number {
  return Math.max(0, Math.ceil(t.durationSec - elapsedMs(t, now) / 1000))
}

export function pause(t: TimerState, now: number): TimerState {
  return t.pausedAt ? t : { ...t, pausedAt: now, lastBeat: now }
}

export function resume(t: TimerState, now: number): TimerState {
  if (!t.pausedAt) return t
  return { ...t, pausedMs: t.pausedMs + (now - t.pausedAt), pausedAt: null, lastBeat: now }
}

export type Reconciled =
  | { kind: 'running'; state: TimerState }
  | { kind: 'paused'; state: TimerState }
  | { kind: 'finished'; state: TimerState; creditedSec: number }
  /** estuvo fuera: el tiempo acreditable es el visto hasta el último latido */
  | { kind: 'away'; state: TimerState; creditedSec: number }

/**
 * Decide qué pasó con un temporizador restaurado tras recargar/volver.
 * `gapMs`: hueco máximo entre latidos para considerar que la pantalla seguía abierta.
 */
export function reconcile(t: TimerState, now: number, gapMs = 90_000): Reconciled {
  if (t.pausedAt) return { kind: 'paused', state: t }
  const away = now - t.lastBeat > gapMs
  if (away) {
    const seenMs = Math.max(0, t.lastBeat - t.startedAt - t.pausedMs)
    const credited = Math.min(t.durationSec, Math.floor(seenMs / 1000))
    if (credited >= t.durationSec) return { kind: 'finished', state: t, creditedSec: t.durationSec }
    return { kind: 'away', state: t, creditedSec: credited }
  }
  if (remainingSec(t, now) <= 0) return { kind: 'finished', state: t, creditedSec: t.durationSec }
  return { kind: 'running', state: { ...t, lastBeat: now } }
}

/** Fase siguiente tras completar una (ciclo Pomodoro). */
export function nextPhase(t: Pick<TimerState, 'phase' | 'cycle'>, longEvery: number): { phase: Phase; cycle: number } {
  if (t.phase === 'focus') {
    const cycle = t.cycle + 1
    return { phase: cycle % Math.max(1, longEvery) === 0 ? 'long' : 'short', cycle }
  }
  return { phase: 'focus', cycle: t.phase === 'long' ? 0 : t.cycle }
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(r).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
