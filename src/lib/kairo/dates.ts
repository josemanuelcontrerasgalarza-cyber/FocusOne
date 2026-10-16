/**
 * Utilidades de fecha en zona LOCAL, sin dependencias. Las fechas de tareas se
 * guardan como claves 'YYYY-MM-DD' (sin hora ni zona) para que "hoy" sea el
 * hoy del usuario y no el del servidor.
 */

export const pad = (n: number) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD' en hora local. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' → Date a las 00:00 locales. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

export function addMonths(key: string, n: number): string {
  const d = fromDateKey(key)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toDateKey(d)
}

/** Días enteros de a → b (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime()
  return Math.round(ms / 86400000)
}

/** 0 = domingo … 6 = sábado */
export function weekday(key: string): number {
  return fromDateKey(key).getDay()
}

/** Inicio de semana (lunes por defecto). */
export function startOfWeek(key: string, weekStartsOn: 0 | 1 = 1): string {
  const wd = weekday(key)
  const delta = (wd - weekStartsOn + 7) % 7
  return addDays(key, -delta)
}

export function range(startKey: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(startKey, i))
}

export const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
export const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Etiqueta humana relativa a hoy: Hoy, Mañana, Ayer, "vie 24 oct". */
export function relativeDayLabel(key: string, today: string): string {
  const d = diffDays(today, key)
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Mañana'
  if (d === -1) return 'Ayer'
  const date = fromDateKey(key)
  const base = `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
  return date.getFullYear() !== fromDateKey(today).getFullYear() ? `${base} ${date.getFullYear()}` : base
}

/** 'HH:MM[:SS]' → 'HH:MM' */
export function shortTime(t: string | null | undefined): string | null {
  if (!t) return null
  const [h, m] = t.split(':')
  return `${pad(Number(h))}:${pad(Number(m ?? 0))}`
}

/** Minutos → "1 h 20 min" / "45 min". */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

/** Minutos → "1h 20m" compacto (para cifras). */
export function formatMinutesShort(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}
