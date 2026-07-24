import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Hoy' }

/**
 * Pantalla "Hoy": la misión protagonista + timer de calor.
 * Esqueleto en Fase 1 — se construye en Fase 2 (misión activa, timer real,
 * barra de calor, drenaje a racha).
 */
export default function HoyPage() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          El taller
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Hoy
        </h1>
      </header>

      {/* Placeholder de la misión protagonista */}
      <div className="forge-panel flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
        <span className="font-num text-xs uppercase tracking-[0.2em] text-ember">
          Misión activa
        </span>
        <p className="max-w-xs text-sm text-forge-ink-dim">
          Aquí vivirá tu misión protagonista con el timer de calor.
          <br />
          <span className="text-forge-ink-faint">Se construye en la Fase 2.</span>
        </p>
      </div>
    </section>
  )
}
