/**
 * Detecta errores típicos de "la base de datos no está configurada" (falta
 * correr las migraciones): función/tabla inexistente, no está en el schema
 * cache de PostgREST, etc. Sirve para mostrar un mensaje accionable.
 *
 * Los errores de Supabase (PostgrestError) son objetos planos, NO instancias de
 * Error, así que extraemos message/code/details/hint del objeto.
 */
export function isDbSetupError(err: unknown): boolean {
  if (!err) return false
  const parts: string[] = []
  if (typeof err === 'string') {
    parts.push(err)
  } else if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    for (const k of ['message', 'code', 'details', 'hint']) {
      if (e[k] != null) parts.push(String(e[k]))
    }
  }
  const m = parts.join(' ').toLowerCase()
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('find the function') ||
    m.includes('could not find') ||
    m.includes('relation') ||
    m.includes('42883') || // undefined_function
    m.includes('42p01') || // undefined_table
    m.includes('pgrst') // PostgREST (p.ej. PGRST202: función no encontrada)
  )
}

export const DB_SETUP_MSG =
  'Falta activar la base de datos: ejecuta setup_all.sql en Supabase.'

/**
 * Extrae el mensaje real de un error de Supabase. Los PostgrestError son
 * objetos planos (NO instancias de Error), así que `err instanceof Error`
 * es siempre falso para ellos y `err.message` queda inaccesible con ese
 * chequeo — por eso las excepciones del servidor (p. ej. "Puntos
 * insuficientes") nunca llegaban a la UI.
 */
export function errText(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message ?? '')
  }
  return typeof err === 'string' ? err : ''
}
