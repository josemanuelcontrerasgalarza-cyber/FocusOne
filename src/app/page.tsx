import type { Metadata } from 'next'
import Link from 'next/link'
import { Flame, Target, Timer, Trophy, Music, Sparkles } from 'lucide-react'
import { ForgeDemoButton } from '@/components/forge/ForgeDemoButton'
import { IntroStories } from '@/components/intro/IntroStories'
import { APP_VERSION } from '@/lib/changelog'

export const metadata: Metadata = {
  title: 'FocusOne — Termina lo que empiezas | Enfoque para mentes TDAH',
  description:
    'FocusOne es tu fragua de enfoque: una misión a la vez, un timer que sube de calor mientras trabajas, quiz de cierre, racha y recompensas. Diseñado para terminar lo importante.',
  keywords: [
    'productividad',
    'enfoque',
    'TDAH',
    'deep work',
    'pomodoro',
    'misiones',
    'racha',
    'Kratos Labs',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'FocusOne — Termina lo que empiezas',
    description:
      'Tu fragua de enfoque: una misión a la vez, timer con calor, quiz de cierre, racha y recompensas.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'FocusOne',
  },
}

const FEATURES = [
  {
    icon: Target,
    title: 'Una misión a la vez',
    body: 'Eliges UNA misión protagonista y la forjas. Sin listas infinitas que paralizan: termina lo importante.',
  },
  {
    icon: Timer,
    title: 'Timer con calor',
    body: 'Un temporizador real cuya barra de calor sube mientras te concentras. El enfoque se vuelve visible.',
  },
  {
    icon: Flame,
    title: 'Quiz de cierre',
    body: 'Al terminar, un breve cierre verifica tu misión, la forja y te otorga puntos por lo que lograste.',
  },
  {
    icon: Trophy,
    title: 'Racha y recompensas',
    body: 'Forja al menos una misión al día y mantén tu racha. Gana puntos y desbloquea recompensas.',
  },
  {
    icon: Sparkles,
    title: 'Deep Work a tu medida',
    body: 'Sesiones de foco de 15, 25, 50, 90 minutos… o la duración exacta que necesites.',
  },
  {
    icon: Music,
    title: 'Frecuencias de foco',
    body: 'Playlists integradas para concentración profunda, lo-fi y calma total, sin salir de la app.',
  },
]

export default function LandingPage() {
  // Datos estructurados (Schema.org) para que Google entienda la marca FocusOne
  // (y su variante "Focus One") y pueda mostrarla como resultado enriquecido.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'FocusOne',
    alternateName: ['Focus One', 'FocusOne App'],
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    url: 'https://focusone.vercel.app',
    description:
      'FocusOne (Focus One) es una app de productividad y enfoque: una misión a la vez, timer con calor, quiz de cierre, racha y recompensas.',
    inLanguage: 'es',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Kratos Labs' },
  }

  return (
    <main className="relative z-10 min-h-screen bg-forge-canvas font-forge text-forge-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6 sm:px-8">
        {/* Barra superior */}
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-ember" />
            <span className="font-forge text-lg font-bold tracking-tight">FocusOne</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="#descubre"
              className="hidden rounded-full px-4 py-2 text-sm text-forge-ink-dim transition-colors hover:text-forge-ink sm:block"
            >
              Descúbrela
            </Link>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm text-forge-ink-dim transition-colors hover:text-forge-ink"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-ember px-4 py-2 text-sm font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px"
            >
              Crear cuenta
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,106,43,0.12), transparent 70%)' }}
          />
          <p className="relative font-num text-[11px] uppercase tracking-[0.3em] text-ember">
            Tu fragua de enfoque · Kratos Labs
          </p>
          <h1 className="relative mt-6 max-w-3xl font-forge text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Termina lo que <span className="text-ember">empiezas</span>.
          </h1>
          <p className="relative mt-6 max-w-xl text-base text-forge-ink-dim sm:text-lg">
            FocusOne convierte tu trabajo en misiones que forjas una a una. Un timer que
            sube de calor, un cierre que las sella, y una racha que te mantiene volviendo.
            Hecho para mentes que necesitan claridad para avanzar.
          </p>
          <div className="relative mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-full bg-ember px-8 py-3.5 font-forge font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px"
            >
              Empieza gratis
            </Link>
            <ForgeDemoButton />
          </div>
          <p className="relative mt-4 text-xs text-forge-ink-faint">
            Prueba el modo demo sin crear cuenta · guarda tu progreso después
          </p>
        </section>

        {/* Descúbrela — historias: qué es · Kratos Labs · opiniones · novedades */}
        <section id="descubre" className="scroll-mt-6 py-10">
          <div className="mb-6 text-center">
            <p className="font-num text-[11px] uppercase tracking-[0.3em] text-ember">
              Conócela en un minuto
            </p>
            <h2 className="mt-2 font-forge text-2xl font-extrabold sm:text-3xl">
              Descubre <span className="text-ember">FocusOne</span>
            </h2>
          </div>
          <IntroStories />
        </section>

        {/* Features */}
        <section className="py-12">
          <h2 className="text-center font-forge text-2xl font-extrabold sm:text-3xl">
            Hecho para el foco, no para la lista de pendientes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-forge-ink-dim">
            Cada pieza de FocusOne existe para una sola cosa: que termines lo importante.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="forge-panel p-6">
                <Icon size={22} className="text-ember" />
                <h3 className="mt-4 font-forge text-lg font-bold text-forge-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-forge-ink-dim">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="py-16 text-center">
          <h2 className="font-forge text-2xl font-extrabold sm:text-3xl">
            Tu próxima misión te está esperando
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-forge-ink-dim">
            Crea tu cuenta en segundos y enciende tu primera misión.
          </p>
          <Link
            href="/register"
            className="mt-7 inline-block rounded-full bg-ember px-8 py-3.5 font-forge font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px"
          >
            Empezar ahora
          </Link>
        </section>

        <footer className="mt-auto border-t border-forge-line py-8 text-center">
          <p className="font-num text-[10px] uppercase tracking-[0.3em] text-forge-ink-faint">
            FocusOne v{APP_VERSION} · La Fragua · Kratos Labs
          </p>
        </footer>
      </div>
    </main>
  )
}
