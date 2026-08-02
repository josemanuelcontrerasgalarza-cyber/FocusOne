import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono, Sora, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { CosmosRoot } from '@/cosmos/CosmosRoot'
import { Toaster } from '@/glass/Toaster'
import { AuthProvider } from '@/components/AuthProvider'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})
const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

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
    <html
      lang="es"
      className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} ${sora.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <CosmosRoot />
        <Toaster />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
