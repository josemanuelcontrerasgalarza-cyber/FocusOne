/**
 * Cliente Groq (API compatible con OpenAI) para el SERVIDOR. Usa fetch y nunca
 * expone ni registra la clave.
 */
import type { ChatMessage } from './prompts.ts'

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
const TIMEOUT_MS = 25_000

export type GroqFailure = 'auth' | 'rate_limited' | 'timeout' | 'upstream' | 'empty'

export type GroqResult = { ok: true; content: string } | { ok: false; kind: GroqFailure; status?: number }

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim())
}

export async function groqChat(opts: {
  messages: ChatMessage[]
  json: boolean
  maxTokens: number
  temperature?: number
}): Promise<GroqResult> {
  const key = process.env.GROQ_API_KEY?.trim()
  if (!key) return { ok: false, kind: 'auth' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      // Se descarta el cuerpo: puede contener detalles internos del proveedor.
      await res.body?.cancel().catch(() => {})
      if (res.status === 401 || res.status === 403) return { ok: false, kind: 'auth', status: res.status }
      if (res.status === 429) return { ok: false, kind: 'rate_limited', status: res.status }
      return { ok: false, kind: 'upstream', status: res.status }
    }

    const data = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: unknown } }[]
    } | null
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) return { ok: false, kind: 'empty' }
    return { ok: true, content }
  } catch (err) {
    if (controller.signal.aborted || (err as { name?: string })?.name === 'AbortError') {
      return { ok: false, kind: 'timeout' }
    }
    return { ok: false, kind: 'upstream' }
  } finally {
    clearTimeout(timer)
  }
}
