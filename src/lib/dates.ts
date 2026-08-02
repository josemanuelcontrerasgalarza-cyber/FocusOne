export type DueTone = 'overdue' | 'today' | 'soon' | 'later'

export interface DueInfo {
  text: string
  tone: DueTone
  /** días hasta el vencimiento (negativo si está atrasado) */
  diff: number
}

/**
 * Etiqueta legible para una fecha de vencimiento (columna `date` YYYY-MM-DD),
 * relativa al día de hoy. Compartida por la agenda y el detalle de misión.
 */
export function dueLabel(due: string): DueInfo {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { text: diff === -1 ? 'Ayer' : `Hace ${-diff}d`, tone: 'overdue', diff }
  if (diff === 0) return { text: 'Hoy', tone: 'today', diff }
  if (diff === 1) return { text: 'Mañana', tone: 'soon', diff }
  if (diff <= 7) return { text: `En ${diff}d`, tone: 'soon', diff }
  return {
    text: d.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
    tone: 'later',
    diff,
  }
}

export const dueToneBadge: Record<DueTone, string> = {
  overdue: 'badge badge-nova',
  today: 'badge badge-solar',
  soon: 'badge badge-ghost',
  later: 'badge badge-ghost',
}

/**
 * `streak_current` solo se recalcula (y se rompe a 1) al completar la
 * próxima misión — mientras tanto sigue mostrando el valor viejo aunque
 * hayan pasado varios días sin actividad. Para no mostrar una racha
 * engañosa en la UI, se considera "viva" solo si la última actividad fue
 * hoy o ayer; si no, se muestra rota (0) hasta que el usuario vuelva a forjar.
 */
export function effectiveStreak(current: number | null | undefined, lastDate: string | null | undefined): number {
  if (!lastDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const last = new Date(lastDate + 'T00:00:00')
  const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000)
  return diffDays <= 1 ? current ?? 0 : 0
}
