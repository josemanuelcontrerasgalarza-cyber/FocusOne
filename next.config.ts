import type { NextConfig } from 'next'

// Content-Security-Policy: defensa en profundidad. 'unsafe-inline' en script/style
// es necesario para el bootstrap de Next y los estilos inline de framer-motion
// (no usamos nonces). Se restringe todo lo demás: sin marcos externos que nos
// embeban (frame-ancestors), conexiones solo a Supabase, y orígenes acotados.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: https:",
  // Audio de streaming (Audius): el <audio> carga desde nodos/CDN https variados.
  "media-src 'self' blob: https:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://open.spotify.com",
  "worker-src 'self' blob:",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), usb=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

// Rutas de versiones anteriores → equivalentes en Kairo (no se rompen enlaces).
const LEGACY_ROUTES: [string, string][] = [
  ['/hoy', '/inicio'],
  ['/app', '/inicio'],
  ['/misiones', '/tareas'],
  ['/ideas', '/tareas'],
  ['/deep-work', '/enfoque'],
  ['/focus', '/enfoque'],
  ['/progreso', '/estadisticas'],
  ['/stats', '/estadisticas'],
  ['/projects', '/proyectos'],
  ['/projects/:id', '/proyectos'],
  ['/achievements', '/objetivos'],
  ['/settings', '/ajustes'],
  ['/music', '/musica'],
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async redirects() {
    return LEGACY_ROUTES.map(([source, destination]) => ({ source, destination, permanent: true }))
  },
}

export default nextConfig
