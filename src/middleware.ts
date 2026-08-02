import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * CSP sin nonce: el App Router de Next 15 no engancha automáticamente el
 * nonce a sus propios scripts de hidratación (probado — con
 * script-src 'nonce-x' 'strict-dynamic' la app entera queda en blanco).
 * 'unsafe-inline' en script-src es el trade-off pragmático: sigue bloqueando
 * la carga de JS desde dominios externos (el vector más común de XSS →
 * exfiltración) sin arriesgar romper la hidratación en producción.
 * connect-src/frame-src usan comodines de host porque el proyecto Supabase
 * concreto depende del entorno (dev/preview/prod) y no está disponible en
 * build time.
 */
const CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' data: blob:`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
  `frame-src https://open.spotify.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ')

/**
 * Refresca el token de sesión de Supabase en cada request para que los
 * Server Components puedan leer `auth.getUser()` sin el token caducado, y
 * aplica una Content-Security-Policy a la respuesta.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  supabaseResponse.headers.set('Content-Security-Policy', CSP)

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
          supabaseResponse.headers.set('Content-Security-Policy', CSP)
        },
      },
    },
  )

  // Refrescar la sesión — importante: no usar getSession() aquí porque
  // puede ser falsificada; getUser() hace la llamada al servidor.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
