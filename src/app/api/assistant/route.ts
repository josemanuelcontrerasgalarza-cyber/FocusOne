import { NextResponse, type NextRequest } from 'next/server'
import { clientIp, identify } from '@/lib/identify'
import { groqChat, groqConfigured, type GroqFailure } from '@/lib/ai/groq'
import { buildMessages, JSON_MODES, maxTokensFor } from '@/lib/ai/prompts'
import { createRateLimiter } from '@/lib/ai/rateLimit'
import { contextTaskIds, parseBreakdown, parsePlan, parseText, validateRequest } from '@/lib/ai/validate'
import type { AssistantErrorBody, AssistantErrorCode, AssistantResponse } from '@/lib/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Asistente de Kairo (Groq). El cliente envía un contexto compacto de su
 * espacio de trabajo; aquí se valida, se limita el ritmo, se llama al modelo y
 * se valida su salida. Nunca ejecuta acciones: el usuario las confirma en la UI.
 */

const limiter = createRateLimiter({ limit: 20, windowMs: 10 * 60_000 })

const NO_STORE = { 'Cache-Control': 'no-store' }

function fail(status: number, error: AssistantErrorCode, message: string, headers?: Record<string, string>) {
  const body: AssistantErrorBody = { error, message }
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } })
}

const UPSTREAM: Record<GroqFailure, { code: AssistantErrorCode; message: string }> = {
  auth: {
    code: 'upstream_auth',
    message: 'El proveedor de IA rechazó la clave configurada. Revisa GROQ_API_KEY en el servidor.',
  },
  rate_limited: {
    code: 'upstream_rate_limited',
    message: 'El servicio de IA está saturado ahora mismo. Prueba de nuevo en un minuto.',
  },
  timeout: { code: 'upstream_timeout', message: 'La IA tardó demasiado en responder. Inténtalo otra vez.' },
  upstream: { code: 'upstream_error', message: 'El servicio de IA no está respondiendo bien. Inténtalo en unos segundos.' },
  empty: { code: 'upstream_error', message: 'La IA devolvió una respuesta vacía. Inténtalo otra vez.' },
}

const NOT_CONFIGURED = 'El asistente necesita GROQ_API_KEY en el servidor.'

/** Estado del asistente (para que la UI avise antes de que el usuario escriba). */
export async function GET() {
  const user = await identify()
  if (!user) return fail(401, 'unauthorized', 'Inicia sesión para usar el asistente.')
  return NextResponse.json({ configured: groqConfigured() }, { headers: NO_STORE })
}

export async function POST(req: NextRequest) {
  const user = await identify()
  if (!user) return fail(401, 'unauthorized', 'Inicia sesión para usar el asistente.')

  if (!groqConfigured()) return fail(503, 'ai_not_configured', NOT_CONFIGURED)

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return fail(400, 'invalid_request', 'Solicitud inválida.')
  }
  const parsed = validateRequest(raw)
  if (!parsed.ok) return fail(400, 'invalid_request', parsed.error)
  const body = parsed.value

  const key = user === 'local' ? `ip:${clientIp(req)}` : `user:${user}`
  const rl = limiter.check(key)
  if (!rl.ok) {
    const mins = Math.ceil(rl.retryAfterSec / 60)
    return fail(
      429,
      'rate_limited',
      `Has hecho muchas consultas seguidas. Respira un momento y vuelve a probar en ${mins} min.`,
      { 'Retry-After': String(rl.retryAfterSec) },
    )
  }

  const messages = buildMessages(body)
  const json = JSON_MODES.has(body.mode)
  const knownIds = contextTaskIds(body.context)

  // Los modos JSON tienen un reintento si la salida no se puede interpretar.
  for (let attempt = 0; attempt < (json ? 2 : 1); attempt++) {
    const res = await groqChat({
      messages,
      json,
      maxTokens: maxTokensFor(body.mode),
      temperature: attempt === 0 ? 0.4 : 0.2,
    })
    if (!res.ok) {
      console.error(`[assistant] upstream ${res.kind}${res.status ? ` (${res.status})` : ''}`)
      const m = UPSTREAM[res.kind]
      return fail(502, m.code, m.message)
    }

    let out: AssistantResponse | null = null
    if (body.mode === 'plan') {
      const plan = parsePlan(res.content, knownIds)
      if (plan) out = { mode: 'plan', plan }
    } else if (body.mode === 'breakdown') {
      const breakdown = parseBreakdown(res.content)
      if (breakdown) out = { mode: 'breakdown', taskId: body.taskId as string, breakdown }
    } else {
      const text = parseText(res.content)
      if (text) out = { mode: body.mode, text }
    }
    if (out) return NextResponse.json(out, { headers: NO_STORE })
  }

  console.error(`[assistant] bad model output (${body.mode})`)
  return fail(502, 'bad_model_output', 'La IA devolvió una respuesta que no se pudo interpretar. Inténtalo otra vez.')
}
