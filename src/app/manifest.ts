import type { MetadataRoute } from 'next'

// Metadatos de aplicación (nombre, colores, icono). No declara soporte offline:
// la app no tiene service worker.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kairo',
    short_name: 'Kairo',
    description: 'Tu centro de control personal: decide qué hacer, concéntrate y mide tu progreso.',
    start_url: '/inicio',
    display: 'standalone',
    background_color: '#0F1012',
    theme_color: '#0F1012',
    lang: 'es',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
