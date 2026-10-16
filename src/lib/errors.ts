import { DB_SETUP_MSG, isDbSetupError } from '@/lib/dbError'

/** Traduce cualquier error (Supabase, red, excepción SQL) a un mensaje útil en español. */
export function errorMessage(err: unknown, fallback = 'Algo salió mal. Inténtalo de nuevo.'): string {
  if (!err) return fallback
  const msg =
    typeof err === 'string'
      ? err
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message: unknown }).message)
        : ''
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return 'Sin conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.'
  }
  if (isDbSetupError(err)) return DB_SETUP_MSG
  if (/jwt|not authenticated|permission denied|row-level security/i.test(msg)) {
    return 'Tu sesión no tiene permiso para esto. Vuelve a iniciar sesión.'
  }
  // Las excepciones de nuestras funciones SQL ya vienen en español y son claras.
  if (msg && msg.length < 160 && !/^[A-Z0-9_]+$/.test(msg)) return msg
  return fallback
}
