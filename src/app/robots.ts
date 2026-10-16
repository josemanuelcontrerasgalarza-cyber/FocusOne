import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El espacio de trabajo es privado (requiere sesión) y no aporta al SEO.
      disallow: [
        '/api',
        '/auth',
        '/dev',
        '/inicio',
        '/tareas',
        '/enfoque',
        '/calendario',
        '/proyectos',
        '/objetivos',
        '/estadisticas',
        '/asistente',
        '/ajustes',
        '/perfil',
        '/amigos',
        '/tienda',
        '/mascota',
        '/musica',
      ],
    },
    sitemap: 'https://focusone.vercel.app/sitemap.xml',
  }
}
