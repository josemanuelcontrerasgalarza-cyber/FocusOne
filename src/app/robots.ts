import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Rutas privadas (requieren sesión) + endpoints: no aportan al SEO.
      disallow: [
        '/api',
        '/auth',
        '/dev',
        '/amigos',
        '/hoy',
        '/misiones',
        '/tienda',
        '/mascota',
        '/perfil',
        '/progreso',
        '/deep-work',
        '/musica',
        // Rutas del diseño anterior
        '/app',
        '/focus',
        '/projects',
        '/ideas',
        '/stats',
        '/settings',
      ],
    },
    sitemap: 'https://focusone.vercel.app/sitemap.xml',
  }
}
