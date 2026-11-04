import { NextResponse, type NextRequest } from 'next/server'
import { trending, search } from '@/lib/audius'
import { createRateLimiter } from '@/lib/ai/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Proxy público hacia Audius: se limita por IP para que no sirva de amplificador.
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 })

/**
 * Música desde Audius (server como proxy). ?mode=trending (por defecto) o
 * ?mode=search&q=... Devuelve una lista normalizada; cada track trae su
 * streamUrl directo para el <audio> del cliente.
 */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  const rl = limiter.check(`music:${ip}`)
  if (!rl.ok) {
    return NextResponse.json(
      { tracks: [], error: 'Demasiadas búsquedas seguidas. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'trending'
  const q = (searchParams.get('q') ?? '').trim().slice(0, 100)

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
