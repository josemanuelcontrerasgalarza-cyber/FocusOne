import { NextResponse, type NextRequest } from 'next/server'
import { trending, search } from '@/lib/audius'
import { clientIp, identify } from '@/lib/identify'
import { createRateLimiter } from '@/lib/ai/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Música desde Audius (server como proxy). ?mode=trending (por defecto) o
 * ?mode=search&q=... Devuelve una lista normalizada; cada track trae su
 * streamUrl directo para el <audio> del cliente.
 *
 * Exige sesión y limita el ritmo para que no sirva de proxy abierto hacia Audius.
 */
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 })
const MAX_QUERY = 100

export async function GET(req: NextRequest) {
  const user = await identify()
  if (!user) return NextResponse.json({ tracks: [], error: 'Inicia sesión para usar la música.' }, { status: 401 })

  const rl = limiter.check(user === 'local' ? `ip:${clientIp(req)}` : `user:${user}`)
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
