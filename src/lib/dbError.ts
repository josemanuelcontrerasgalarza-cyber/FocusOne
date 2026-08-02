/**
 * Detecta errores típicos de "la base de datos no está configurada" (falta
 * correr las migraciones): función/tabla inexistente, no está en el schema
 * cache de PostgREST, etc. Sirve para mostrar un mensaje accionable.
 */
export function isDbSetupError(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase()
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('find the function') ||
    m.includes('could not find') ||
    m.includes('relation') ||
    m.includes('42883') ||
    m.includes('42p01') ||
    m.includes('pgrst202')
  )
}

export const DB_SETUP_MSG =
  'Falta activar la base de datos: ejecuta setup_all.sql en Supabase.'
