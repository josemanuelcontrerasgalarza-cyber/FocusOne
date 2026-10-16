import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Refresca el token de sesión de Supabase en cada request para que los
 * Server Components puedan leer `auth.getUser()` sin el token caducado.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refrescar la sesión — importante: no usar getSession() aquí porque
  // puede ser falsificada; getUser() hace la llamada al servidor.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // El espacio de trabajo exige sesión (cuando el backend está configurado).
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const path = request.nextUrl.pathname
  if (configured && !user && PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(path)}`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

const PROTECTED = [
  '/inicio', '/tareas', '/enfoque', '/calendario', '/proyectos', '/objetivos', '/estadisticas',
  '/asistente', '/ajustes', '/perfil', '/amigos', '/tienda', '/mascota', '/musica', '/dev',
]

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
