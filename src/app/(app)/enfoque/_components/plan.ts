import type { KairoSettings } from '@/lib/kairo/types'
import { formatMinutes } from '@/lib/kairo/dates'
import { clampMinutes, type CyclePlan, type PresetId } from '@/components/focus/storage'

export const PRESETS: { id: PresetId; name: string; hint: string }[] = [
  { id: 'pomodoro', name: 'Pomodoro', hint: 'Bloques cortos con descansos' },
  { id: 'deep', name: 'Profundo', hint: 'Trabajo exigente, sin cortes' },
  { id: 'custom', name: 'Personalizado', hint: 'Tú decides la duración' },
]

export function buildPlan(preset: PresetId, customMin: number, f: KairoSettings['focus']): CyclePlan {
  const longEvery = Math.max(1, Math.round(f.longBreakEvery || 4))
  if (preset === 'deep') return { preset, focusMin: 50, shortMin: 10, longMin: 10, longEvery }
  if (preset === 'custom')
    return { preset, focusMin: clampMinutes(customMin), shortMin: f.shortBreakMinutes, longMin: f.longBreakMinutes, longEvery }
  return {
    preset,
    focusMin: f.focusMinutes,
    shortMin: f.shortBreakMinutes,
    longMin: f.longBreakMinutes,
    longEvery,
  }
}

export const hasLongBreak = (p: CyclePlan) => p.longMin !== p.shortMin

/** Segmentos de un ciclo completo, para la vista previa. */
export function cycleSegments(p: CyclePlan): { kind: 'focus' | 'short' | 'long'; min: number }[] {
  const n = hasLongBreak(p) ? Math.min(p.longEvery, 8) : 1
  const out: { kind: 'focus' | 'short' | 'long'; min: number }[] = []
  for (let i = 1; i <= n; i++) {
    out.push({ kind: 'focus', min: p.focusMin })
    out.push(i === n && hasLongBreak(p) ? { kind: 'long', min: p.longMin } : { kind: 'short', min: p.shortMin })
  }
  return out
}

/** "4 bloques de 25 min · descansos de 5 min · descanso largo de 15 min tras el 4.º" */
export function describeCycle(p: CyclePlan): string {
  if (!hasLongBreak(p)) return `${formatMinutes(p.focusMin)} de enfoque y ${formatMinutes(p.shortMin)} de descanso, las veces que quieras.`
  const total = p.longEvery * p.focusMin + (p.longEvery - 1) * p.shortMin + p.longMin
  return `${p.longEvery} ${p.longEvery === 1 ? 'bloque' : 'bloques'} de ${formatMinutes(p.focusMin)} con descansos de ${formatMinutes(
    p.shortMin,
  )}; tras el ${p.longEvery}.º, descanso largo de ${formatMinutes(p.longMin)}. Ciclo completo: ${formatMinutes(total)}.`
}
