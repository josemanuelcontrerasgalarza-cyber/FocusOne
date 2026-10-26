import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/Toaster'
import { AuthProvider } from '@/components/AuthProvider'
import { MotionProvider } from '@/components/MotionProvider'

// Tipografía Kairo (autoalojada por next/font): Geist para la interfaz,
// Geist Mono para números y datos, Instrument Serif para titulares expresivos.
const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://focusone.vercel.app'),
  title: { default: 'Kairo — Lo importante, ahora', template: '%s · Kairo' },
  description:
    'Kairo es tu centro de control personal: te dice qué hacer ahora, organiza tus tareas y proyectos, te ayuda a concentrarte y mide tu progreso real.',
  applicationName: 'Kairo',
  keywords: ['Kairo', 'productividad', 'tareas', 'enfoque', 'pomodoro', 'proyectos', 'objetivos', 'hábitos', 'asistente IA'],
  authors: [{ name: 'Kratos Labs' }],
  creator: 'Kratos Labs',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Kairo — Lo importante, ahora',
    description: 'Decide qué hacer, concéntrate y mide tu progreso real.',
    url: 'https://focusone.vercel.app',
    siteName: 'Kairo',
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kairo — Lo importante, ahora',
    description: 'Decide qué hacer, concéntrate y mide tu progreso real.',
  },
  robots: { index: true, follow: true },
  category: 'productivity',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F2EA' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1012' },
  ],
}

// Aplica el tema ANTES del primer pintado (evita el destello claro/oscuro).
const themeScript = `(function(){try{var t=localStorage.getItem('kairo:theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <MotionProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </MotionProvider>
      </body>
    </html>
  )
}
