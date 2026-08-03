import type { Metadata, Viewport } from 'next'
import { Sora, IBM_Plex_Mono, Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/glass/Toaster'
import { AuthProvider } from '@/components/AuthProvider'

// Fuentes AUTOALOJADAS por next/font: se descargan en build y se sirven desde
// nuestro propio origen (0 requests a Google, no se filtra la IP del usuario y
// la CSP puede ser font-src 'self').
const sora = Sora({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-forge', display: 'swap' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-num', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display', display: 'swap' })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-data', display: 'swap' })

const fontVars = `${sora.variable} ${plexMono.variable} ${spaceGrotesk.variable} ${inter.variable} ${jetbrains.variable}`

export const metadata: Metadata = {
  metadataBase: new URL('https://focusone.vercel.app'),
  title: {
    default: 'FocusOne — Termina lo que empiezas',
    template: '%s · FocusOne',
  },
  description:
    'FocusOne (Focus One) es tu fragua de enfoque: una misión a la vez, un timer con calor, quiz de cierre, racha y recompensas. La app de productividad para terminar lo importante.',
  applicationName: 'FocusOne',
  keywords: [
    'FocusOne',
    'Focus One',
    'focus one app',
    'productividad',
    'enfoque',
    'app de enfoque',
    'TDAH',
    'deep work',
    'pomodoro',
    'Kratos Labs',
  ],
  authors: [{ name: 'Kratos Labs' }],
  creator: 'Kratos Labs',
  publisher: 'Kratos Labs',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'FocusOne — Termina lo que empiezas',
    description:
      'Tu fragua de enfoque: una misión a la vez, timer con calor, quiz de cierre, racha y recompensas.',
    url: 'https://focusone.vercel.app',
    siteName: 'FocusOne',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FocusOne — Termina lo que empiezas',
    description: 'Tu fragua de enfoque: una misión a la vez, timer con calor, racha y recompensas.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'productivity',
}

export const viewport: Viewport = {
  themeColor: '#0B0C0E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${fontVars}`}>
      <body>
        <Toaster />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
