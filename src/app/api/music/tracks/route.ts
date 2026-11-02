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
 */
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 })
const MAX_QUERY = 100

/** Id de usuario (o IP sin backend); null si hay backend y no hay sesión. */
async function identify(req: NextRequest): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return `ip:${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`
  }
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    return error || !data.user ? null : `user:${data.user.id}`
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  // Proxy a un servicio externo: exige sesión y limita el ritmo para que no
  // pueda usarse como relay anónimo ni agotar la cuota de Audius.
  const who = await identify(req)
  if (!who) return NextResponse.json({ tracks: [], error: 'Inicia sesión para escuchar música.' }, { status: 401 })
  const rl = limiter.check(who)
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
