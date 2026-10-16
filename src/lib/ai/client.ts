/**
 * Llamadas del NAVEGADOR a /api/assistant. La clave de Groq vive solo en el
 * servidor; aquí únicamente se envía el contexto compacto.
 */
import type { AssistantErrorCode, AssistantRequest, AssistantResponse } from './types.ts'

export type AiStatus = 'checking' | 'ready' | 'not_configured' | 'offline' | 'unauthorized'

export type AskResult =
  | { ok: true; data: AssistantResponse }
  | { ok: false; code: AssistantErrorCode | 'offline' | 'network' | 'aborted'; message: string }

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

export async function fetchAiStatus(): Promise<AiStatus> {
  if (isOffline()) return 'offline'
  try {
    const res = await fetch('/api/assistant', { method: 'GET', cache: 'no-store' })
    if (res.status === 401) return 'unauthorized'
    if (!res.ok) return 'ready' // el POST dará un error más concreto
    const data = (await res.json().catch(() => null)) as { configured?: boolean } | null
    return data?.configured ? 'ready' : 'not_configured'
  } catch {
    return 'offline'
  }
}

export async function askAssistant(req: AssistantRequest, signal?: AbortSignal): Promise<AskResult> {
  if (isOffline()) {
    return { ok: false, code: 'offline', message: 'Sin conexión. Las funciones locales siguen disponibles.' }
  }
  let res: Response
  try {
    res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return { ok: false, code: 'aborted', message: '' }
    return { ok: false, code: 'network', message: 'No se pudo contactar con el asistente. Revisa tu conexión.' }
  }
  const data = (await res.json().catch(() => null)) as (AssistantResponse & { error?: AssistantErrorCode; message?: string }) | null
  if (!res.ok || !data || data.error) {
    const code: AssistantErrorCode =
      data?.error ??
      (res.status === 503
        ? 'ai_not_configured'
        : res.status === 401
          ? 'unauthorized'
          : res.status === 429
            ? 'rate_limited'
            : res.status === 400
              ? 'invalid_request'
              : 'upstream_error')
    return { ok: false, code, message: data?.message || 'El asistente no pudo responder. Inténtalo otra vez.' }
  }
  return { ok: true, data }
}
