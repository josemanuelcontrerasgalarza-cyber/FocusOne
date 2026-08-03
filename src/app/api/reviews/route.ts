import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Publicar una opinión anónima con rate-limit. El cliente ya NO inserta directo
 * en `reviews` (revocado): pasa por aquí, que llama a la RPC post_review.
 * La RPC hashea la IP ELLA MISMA a partir de los headers del request de
 * Postgres (no de un parámetro que el cliente pudiera falsificar llamando a
 * la RPC directo por REST con un hash aleatorio en cada intento).
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

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .rpc('post_review', {
      p_name: name,
      p_rating: rating,
      p_comment: comment.slice(0, 500),
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
