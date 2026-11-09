import { NextResponse, type NextRequest } from 'next/server'
import { trending, search } from '@/lib/audius'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createRateLimiter } from '@/lib/ai/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Música desde Audius (server como proxy). ?mode=trending (por defecto) o
 * ?mode=search&q=... Devuelve una lista normalizada; cada track trae su
 * streamUrl directo para el <audio> del cliente.
 *
 * Endurecido: exige sesión (cuando hay backend), acota la consulta y limita el
 * ritmo para que no sirva de proxy abierto hacia Audius.
 */
const limiter = createRateLimiter({ limit: 60, windowMs: 5 * 60_000 })
const MAX_QUERY = 80
const NO_STORE = { 'Cache-Control': 'no-store' }

async function identify(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return 'local'
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    return error || !data.user ? null : data.user.id
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const user = await identify()
  if (!user) {
    return NextResponse.json({ tracks: [], error: 'Inicia sesión para escuchar música.' }, { status: 401, headers: NO_STORE })
  }

  const key =
    user === 'local'
      ? `ip:${(req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || 'unknown'}`
      : `user:${user}`
  const rl = limiter.check(key)
  if (!rl.ok) {
    return NextResponse.json(
      { tracks: [], error: 'Demasiadas búsquedas seguidas. Espera un momento.' },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') === 'search' ? 'search' : 'trending'
  const q = (searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY)

  try {
    const tracks = mode === 'search' && q ? await search(q) : await trending()
    return NextResponse.json({ tracks }, { headers: NO_STORE })
  } catch {
    return NextResponse.json(
      { tracks: [], error: 'No se pudo cargar la música ahora mismo.' },
      { status: 502, headers: NO_STORE },
    )
  }
}
