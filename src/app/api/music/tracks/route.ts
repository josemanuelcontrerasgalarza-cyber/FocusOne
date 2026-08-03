import { NextResponse, type NextRequest } from 'next/server'
import { trending, search } from '@/lib/audius'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Música desde Audius (server como proxy). ?mode=trending (por defecto) o
 * ?mode=search&q=... Devuelve una lista normalizada; cada track trae su
 * streamUrl directo para el <audio> del cliente.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'trending'
  const q = (searchParams.get('q') ?? '').trim()

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
