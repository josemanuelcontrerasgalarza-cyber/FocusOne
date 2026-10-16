/**
 * Persistencia del modo Enfoque en localStorage (`kairo:focus:v1`).
 *
 * Guarda el TimerState (reloj de pared, ver lib/kairo/focusTimer) junto con lo
 * necesario para retomar el ciclo tras una recarga: plan del ciclo, objetivo
 * (tarea o etiqueta), fase preparada, último enfoque completado y una "bandeja
 * de salida" de sesiones pendientes de guardar en el servidor (reintentos).
 */
import type { Phase, TimerState } from '@/lib/kairo/focusTimer'

export const FOCUS_KEY = 'kairo:focus:v1'

/** Cada cuánto se registra un latido mientras la pantalla está abierta. */
export const BEAT_MS = 5_000

export type PresetId = 'pomodoro' | 'deep' | 'custom'

export interface CyclePlan {
  preset: PresetId
  focusMin: number
  shortMin: number
  longMin: number
  longEvery: number
}

export interface FocusTarget {
  taskId: string | null
  label: string | null
}

export interface LastDone {
  taskId: string | null
  label: string | null
  seconds: number
  /** epoch ms */
  endedAt: number
}

/** Resultado de una sesión de enfoque pendiente de guardar. */
export interface OutboxItem {
  startedAt: number
  sessionId: string | null
  taskId: string | null
  label: string | null
  plannedMin: number
  endedAt: number
  seconds: number
  completed: boolean
}

export interface FocusPrefs {
  preset: PresetId
  customMin: number
}

export interface FocusPersisted {
  v: 1
  timer: TimerState | null
  /** Fase lista para empezar cuando no hay temporizador (null → configuración). */
  armed: { phase: Phase; cycle: number } | null
  plan: CyclePlan | null
  target: FocusTarget | null
  lastDone: LastDone | null
  prefs: FocusPrefs
  outbox: OutboxItem[]
}

export const EMPTY_FOCUS: FocusPersisted = {
  v: 1,
  timer: null,
  armed: null,
  plan: null,
  target: null,
  lastDone: null,
  prefs: { preset: 'pomodoro', customMin: 40 },
  outbox: [],
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const isPhase = (x: unknown): x is Phase => x === 'focus' || x === 'short' || x === 'long'

function validTimer(t: unknown): t is TimerState {
  if (!t || typeof t !== 'object') return false
  const x = t as Record<string, unknown>
  return (
    isPhase(x.phase) &&
    isNum(x.startedAt) &&
    isNum(x.durationSec) &&
    x.durationSec > 0 &&
    (x.pausedAt === null || isNum(x.pausedAt)) &&
    isNum(x.pausedMs) &&
    isNum(x.lastBeat) &&
    isNum(x.cycle)
  )
}

function validPlan(p: unknown): p is CyclePlan {
  if (!p || typeof p !== 'object') return false
  const x = p as Record<string, unknown>
  return isNum(x.focusMin) && isNum(x.shortMin) && isNum(x.longMin) && isNum(x.longEvery)
}

/** Lee el estado guardado. Cualquier dato corrupto se descarta con seguridad. */
export function readFocus(): FocusPersisted {
  if (typeof window === 'undefined') return EMPTY_FOCUS
  try {
    const raw = window.localStorage.getItem(FOCUS_KEY)
    if (!raw) return EMPTY_FOCUS
    const s = JSON.parse(raw) as Partial<FocusPersisted>
    if (!s || s.v !== 1) return EMPTY_FOCUS
    const plan = validPlan(s.plan) ? s.plan : null
    const timer = plan && validTimer(s.timer) ? s.timer : null
    const armed =
      plan && s.armed && isPhase(s.armed.phase) && isNum(s.armed.cycle) ? { phase: s.armed.phase, cycle: s.armed.cycle } : null
    const prefs: FocusPrefs = {
      preset: s.prefs?.preset === 'deep' || s.prefs?.preset === 'custom' ? s.prefs.preset : 'pomodoro',
      customMin: isNum(s.prefs?.customMin) ? clampMinutes(s.prefs.customMin) : EMPTY_FOCUS.prefs.customMin,
    }
    return {
      v: 1,
      timer,
      armed,
      plan,
      target: s.target ?? null,
      lastDone: s.lastDone && isNum(s.lastDone.seconds) && isNum(s.lastDone.endedAt) ? s.lastDone : null,
      prefs,
      outbox: Array.isArray(s.outbox) ? s.outbox.filter((o) => o && isNum(o.startedAt) && isNum(o.seconds)) : [],
    }
  } catch {
    return EMPTY_FOCUS
  }
}

export function writeFocus(s: FocusPersisted) {
  try {
    window.localStorage.setItem(FOCUS_KEY, JSON.stringify(s))
  } catch {
    /* almacenamiento lleno o bloqueado: el temporizador sigue en memoria */
  }
}

export const MIN_CUSTOM = 5
export const MAX_CUSTOM = 180

export function clampMinutes(n: number): number {
  return Math.min(MAX_CUSTOM, Math.max(MIN_CUSTOM, Math.round(n)))
}

export function minutesFor(phase: Phase, plan: CyclePlan): number {
  return phase === 'focus' ? plan.focusMin : phase === 'short' ? plan.shortMin : plan.longMin
}

export const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Enfoque',
  short: 'Descanso corto',
  long: 'Descanso largo',
}
