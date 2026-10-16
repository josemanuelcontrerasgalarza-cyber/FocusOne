import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Callback de OAuth (Google). Supabase redirige aquí con un `code`; lo
 * intercambiamos por una sesión (que se guarda en cookies) y mandamos al
 * usuario a su espacio de trabajo. El perfil se crea solo con el trigger handle_new_user,
 * así que su progreso se almacena igual que con cualquier cuenta.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  // Solo rutas internas: evita redirecciones abiertas (`//evil.com`, `@evil.com`).
  const raw = searchParams.get('next')
  const next = raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/inicio'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
