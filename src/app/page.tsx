import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FocusOne — Termina lo que empiezas | Productividad AI-First',
  description:
    'FocusOne es la plataforma de productividad AI-First para terminar lo que empiezas. Modo Deep Work, misiones con foco único, telemetría de rendimiento y un cosmos inmersivo. Diseñada para mentes que necesitan claridad.',
  keywords: [
    'productividad',
    'deep work',
    'modo enfoque',
    'gestión de tareas',
    'pomodoro',
    'TDAH',
    'foco',
    'misiones',
    'Kratos Labs',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'FocusOne — Termina lo que empiezas',
    description:
      'Plataforma de productividad AI-First. Modo Deep Work, una sola misión a la vez y telemetría real de tu progreso.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'FocusOne',
  },
}

const FEATURES = [
  {
    title: 'Modo Deep Work',
    body: 'Sesiones de foco de 25, 50 o 90 minutos en pantalla completa. El temporizador sobrevive a las recargas: nunca pierdes tu sesión.',
  },
  {
    title: 'Una misión a la vez',
    body: 'Eliges UNA misión principal y la terminas. Sin listas infinitas que paralizan. La regla de FocusOne es simple: termina lo que empiezas.',
  },
  {
    title: 'Telemetría real',
    body: 'Racha de días, objetivos completados y tu récord histórico. Mide tu constancia con datos, no con sensaciones.',
  },
  {
    title: 'Bóveda de ideas',
    body: 'Captura ideas sin romper tu foco y conviértelas en misiones cuando llegue su momento.',
  },
  {
    title: 'Cosmos inmersivo',
    body: 'Una interfaz 3D viva, con cristal líquido y un orbe que reacciona a tu trabajo. Productividad que se siente como ciencia ficción.',
  },
  {
    title: 'Frecuencias de foco',
    body: 'Playlists integradas de música para concentración profunda, lo-fi y calma total, sin salir de la app.',
  },
]

export default function LandingPage() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6">
      {/* Barra superior */}
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-8 w-8 rounded-full bg-gradient-to-br from-core to-plasma shadow-glow-core" />
          <span className="font-display text-lg font-semibold tracking-wide">
            Focus<span className="text-gradient">One</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm text-ink-dim transition-colors hover:text-ink"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-gradient-to-br from-core to-plasma px-4 py-2 text-sm font-medium text-void shadow-glow-core transition-transform hover:scale-[1.03]"
          >
            Crear cuenta
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <p className="font-data text-[11px] uppercase tracking-[0.4em] text-core">
          Productividad AI-First · Kratos Labs
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
          Termina lo que <span className="text-gradient">empiezas</span>.
        </h1>
        <p className="mt-6 max-w-xl text-base text-ink-dim sm:text-lg">
          FocusOne es el sistema operativo de tu enfoque. Una misión a la vez, sesiones
          de Deep Work que no pierdes nunca, y telemetría real de tu constancia. Diseñado
          para mentes que necesitan claridad para avanzar.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-2xl bg-gradient-to-br from-core to-plasma px-8 py-3.5 font-medium text-void shadow-glow-core transition-transform hover:scale-[1.03]"
          >
            Empieza gratis
          </Link>
          <Link
            href="/login"
            className="glass-panel rounded-2xl px-8 py-3.5 text-ink transition-colors hover:text-core"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">
          Hecho para el foco, no para la lista de pendientes
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-dim">
          Cada función de FocusOne existe para una sola cosa: que termines lo importante.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="glass-panel p-6">
              <h3 className="font-display text-lg font-semibold text-core">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 text-center">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          Tu próxima misión te está esperando
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-ink-dim">
          Crea tu cuenta en segundos y entra a tu centro de mando.
        </p>
        <Link
          href="/register"
          className="mt-7 inline-block rounded-2xl bg-gradient-to-br from-core to-plasma px-8 py-3.5 font-medium text-void shadow-glow-core transition-transform hover:scale-[1.03]"
        >
          Empezar ahora
        </Link>
      </section>

      <footer className="mt-auto border-t border-glass-border py-8 text-center">
        <p className="font-data text-[10px] uppercase tracking-[0.3em] text-ink-ghost">
          FocusOne · Horizon v2.0 · Kratos Labs
        </p>
      </footer>
    </main>
  )
}
