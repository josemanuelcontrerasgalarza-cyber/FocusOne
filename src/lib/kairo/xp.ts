/**
 * Experiencia y niveles — gamificación discreta calculada a partir de la
 * actividad REAL (no se almacena, no se puede "comprar"). Descansar no resta.
 */
import type { Totals } from './types.ts'

export const XP_RULES = { task: 10, focusMinute: 1, habitLog: 5, goal: 50 } as const

export function computeXP(t: Totals): number {
  return (
    t.tasksCompleted * XP_RULES.task +
    Math.floor(t.focusMinutes) * XP_RULES.focusMinute +
    t.habitLogs * XP_RULES.habitLog +
    t.goalsAchieved * XP_RULES.goal
  )
}

/** XP total necesaria para alcanzar el nivel L (L ≥ 1): 0, 100, 300, 600, 1000… */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level
}

export interface LevelInfo {
  level: number
  xp: number
  /** XP dentro del nivel actual */
  into: number
  /** XP que separa este nivel del siguiente */
  span: number
  progress: number
  title: string
}

const TITLES: [number, string][] = [
  [20, 'Maestría'],
  [15, 'Imparable'],
  [10, 'Enfocado'],
  [5, 'Constante'],
  [1, 'En marcha'],
]

export function levelFromXP(xp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(xp))
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.08 * safe)) / 2))
  // Corrección por redondeo de coma flotante.
  while (xpForLevel(level + 1) <= safe) level++
  while (level > 1 && xpForLevel(level) > safe) level--
  const base = xpForLevel(level)
  const span = xpForLevel(level + 1) - base
  const into = safe - base
  const title = TITLES.find(([min]) => level >= min)?.[1] ?? 'En marcha'
  return { level, xp: safe, into, span, progress: span ? into / span : 0, title }
}
