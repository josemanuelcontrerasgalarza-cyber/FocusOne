import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Las rutas privadas no aportan al SEO y requieren sesión
      disallow: ['/app', '/focus', '/projects', '/ideas', '/stats', '/settings'],
    },
    sitemap: 'https://focusone.vercel.app/sitemap.xml',
  }
}
