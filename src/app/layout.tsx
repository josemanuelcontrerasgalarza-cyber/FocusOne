import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CosmosRoot } from '@/cosmos/CosmosRoot'
import { Toaster } from '@/glass/Toaster'

export const metadata: Metadata = {
  title: 'FocusOne — Termina lo que empiezas',
  description: 'Plataforma de productividad AI-First. Tus misiones, en órbita.',
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
        {children}
      </body>
    </html>
  )
}
