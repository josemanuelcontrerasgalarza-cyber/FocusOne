import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * Callback de OAuth (Google). Supabase redirige aquí con un `code`; lo
 * intercambiamos por una sesión (que se guarda en cookies) y mandamos al
 * usuario a su dashboard. El perfil se crea solo con el trigger handle_new_user,
 * así que su progreso se almacena igual que con cualquier cuenta.
 */
/**
 * Solo se acepta una ruta relativa propia (p. ej. `/hoy`): rechaza cualquier
 * intento de redirigir a otro host (`next=//evil.com`, `next=/@evil.com`,
 * `next=https://evil.com`), que sería un open redirect explotable para
 * phishing justo después de un login legítimo.
 */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/hoy'
  }
  try {
    // Una URL con host distinto al nuestro (p. ej. `/\evil.com` o `/@evil.com`
    // interpretado como userinfo) resuelve a otro origin al parsearla.
    const resolved = new URL(next, 'http://localhost')
    if (resolved.origin !== 'http://localhost') return '/hoy'
    return `${resolved.pathname}${resolved.search}`
  } catch {
    return '/hoy'
  }
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
