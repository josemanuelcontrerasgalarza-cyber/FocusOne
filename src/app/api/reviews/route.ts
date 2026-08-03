import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Publicar una opinión anónima con rate-limit. El cliente ya NO inserta directo
 * en `reviews` (revocado): pasa por aquí. Tomamos la IP del request, la
 * HASHEAMOS (nunca se guarda en claro) y llamamos a la RPC post_review, que
 * limita a 3 opiniones por IP cada hora.
 */
export async function POST(req: NextRequest) {
  let body: { name?: unknown; rating?: unknown; comment?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.slice(0, 80) : null
  const rating = Math.round(Number(body.rating))
  const comment = typeof body.comment === 'string' ? body.comment : ''

  if (!Number.isFinite(rating) || rating < 1 || rating > 5 || comment.trim().length < 1) {
    return NextResponse.json({ error: 'Datos de la opinión inválidos' }, { status: 400 })
  }

  // `x-forwarded-for` es un header que el propio cliente puede enviar y falsificar
  // (basta con anteponer una IP falsa a la lista). En Vercel, `x-vercel-forwarded-for`
  // lo sobrescribe siempre la plataforma con la IP real de conexión y no puede ser
  // manipulado por el cliente, así que es la única fuente fiable para el rate-limit.
  const trustedFwd = req.headers.get('x-vercel-forwarded-for')
  const fwd = trustedFwd || req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0]?.trim() || 'unknown'
  const ipHash = createHash('sha256').update(`${ip}|focusone-reviews`).digest('hex')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .rpc('post_review', {
      p_name: name,
      p_rating: rating,
      p_comment: comment.slice(0, 500),
      p_ip_hash: ipHash,
    })
    .single()

  if (error) {
    const tooMany = error.message?.includes('Demasiadas')
    return NextResponse.json(
      { error: tooMany ? error.message : 'No se pudo enviar tu opinión' },
      { status: tooMany ? 429 : 400 },
    )
  }

  return NextResponse.json({ review: data })
}
