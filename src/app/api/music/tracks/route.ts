import { NextResponse, type NextRequest } from 'next/server'
import { trending, search } from '@/lib/audius'
import { createRateLimiter } from '@/lib/ai/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Longitud máxima de la búsqueda (más es abuso, no una búsqueda real). */
const MAX_QUERY = 100

/** Proxy público: límite por IP para que no se use como relé gratuito hacia Audius. */
const limiter = createRateLimiter({ limit: 60, windowMs: 5 * 60_000 })

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  return fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Música desde Audius (server como proxy). ?mode=trending (por defecto) o
 * ?mode=search&q=... Devuelve una lista normalizada; cada track trae su
 * streamUrl directo para el <audio> del cliente.
 */
export async function GET(req: NextRequest) {
  const rl = limiter.check(`ip:${clientIp(req)}`)
  if (!rl.ok) {
    return NextResponse.json(
      { tracks: [], error: 'Demasiadas búsquedas seguidas. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'trending'
  const q = (searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY)

  try {
    const tracks = mode === 'search' && q ? await search(q) : await trending()
    return NextResponse.json({ tracks })
  } catch {
    return NextResponse.json(
      { tracks: [], error: 'No se pudo cargar la música ahora mismo.' },
      { status: 502 },
    )
  }
}
