import type { NextConfig } from 'next'

// CSP pragmática: no usa nonces (requeriría reescribir el middleware y el
// layout raíz), así que permite 'unsafe-inline'/'unsafe-eval' en script/style
// para no romper la hidratación de Next ni el canvas de Three.js. Lo que sí
// cierra de verdad es connect-src/frame-src/object-src/base-uri: aunque un
// XSS lograra inyectar un script, no podría exfiltrar datos a un host
// arbitrario, ni enmarcar el sitio, ni inyectar <object>/<embed>.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src https://open.spotify.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default nextConfig
