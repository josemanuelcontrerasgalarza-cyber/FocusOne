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
