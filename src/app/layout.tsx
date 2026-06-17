import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CosmosRoot } from '@/cosmos/CosmosRoot'
import { Toaster } from '@/glass/Toaster'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  metadataBase: new URL('https://focusone.vercel.app'),
  title: {
    default: 'FocusOne — Termina lo que empiezas',
    template: '%s · FocusOne',
  },
  description: 'Plataforma de productividad AI-First. Tus misiones, en órbita.',
  applicationName: 'FocusOne',
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#030308',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CosmosRoot />
        <Toaster />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
