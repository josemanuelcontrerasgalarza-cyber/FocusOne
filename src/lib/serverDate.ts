import 'server-only'
import { cookies } from 'next/headers'

/**
 * Offset de zona horaria del navegador (minutos, `Date.getTimezoneOffset()`)
 * guardado por `TimezoneSync` en una cookie. 0 (UTC) si aún no ha llegado
 * (primera carga, demo, sin JS).
 */
export async function getTzOffsetMinutes(): Promise<number> {
  const jar = await cookies()
  const raw = jar.get('tz-offset')?.value
  const offsetMinutes = raw !== undefined ? parseInt(raw, 10) : 0
  return Number.isFinite(offsetMinutes) ? offsetMinutes : 0
}

/**
 * Instante UTC real que representa la medianoche del día LOCAL del usuario
 * (hoy menos `daysAgo` días). Sin esto cualquier consulta "desde hoy" usa
 * medianoche UTC, desincronizada del resto de la app (reclamo diario, Hoy),
 * y para cualquiera al oeste de UTC la actividad de la tarde/noche se cuenta
 * en el día equivocado.
 */
export function localStartOfDay(offsetMinutes: number, daysAgo = 0): Date {
  const shifted = new Date(Date.now() - offsetMinutes * 60000)
  shifted.setUTCHours(0, 0, 0, 0)
  shifted.setUTCDate(shifted.getUTCDate() - daysAgo)
  return new Date(shifted.getTime() + offsetMinutes * 60000)
}

/** Clave YYYY-MM-DD del día LOCAL en el que cae un instante UTC. */
export function localDayKey(value: Date | string, offsetMinutes: number): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return new Date(d.getTime() - offsetMinutes * 60000).toISOString().slice(0, 10)
}
