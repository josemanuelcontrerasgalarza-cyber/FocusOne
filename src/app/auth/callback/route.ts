import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Callback de OAuth (Google). Supabase redirige aquí con un `code`; lo
 * intercambiamos por una sesión (que se guarda en cookies) y mandamos al
 * usuario a su dashboard. El perfil se crea solo con el trigger handle_new_user,
 * así que su progreso se almacena igual que con cualquier cuenta.
 */
/** Solo permite rutas relativas propias ("/hoy"), nunca otro host ("//evil.com", "https://evil.com"). */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/hoy'
  return raw
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
