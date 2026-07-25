import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Progreso' }

/**
 * Pantalla "Progreso": racha, puntos e historial de quizzes.
 * Esqueleto en Fase 1 — se construye en las Fases 4 y 5.
 */
export default function ProgresoPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          El temple
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Progreso
        </h1>
      </header>

      <div className="forge-panel flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="max-w-xs text-sm text-forge-ink-dim">
          Racha, puntos e historial de tus cierres.
          <br />
          <span className="text-forge-ink-faint">
            Se construye en las Fases 4 y 5.
          </span>
        </p>
      </div>
    </section>
  )
}
