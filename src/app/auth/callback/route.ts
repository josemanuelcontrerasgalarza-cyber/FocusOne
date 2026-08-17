import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Callback de OAuth (Google). Supabase redirige aquí con un `code`; lo
 * intercambiamos por una sesión (que se guarda en cookies) y mandamos al
 * usuario a su dashboard. El perfil se crea solo con el trigger handle_new_user,
 * así que su progreso se almacena igual que con cualquier cuenta.
 */
// Solo permite rutas internas relativas: deben empezar con un único "/" (no
// "//" ni "/\", que los navegadores interpretan como protocol-relative y
// abrirían un open redirect a un host externo).
function safeNextPath(next: string | null): string {
  if (next && /^\/(?!\/|\\)/.test(next)) return next
  return '/hoy'
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
