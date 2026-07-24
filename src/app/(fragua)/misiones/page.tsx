import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Misiones' }

/**
 * Pantalla "Misiones": lista del día + CRUD.
 * Esqueleto en Fase 1 — se construye en Fase 3 (lista desde Supabase,
 * crear misión, activar una a la vez con validación en backend).
 */
export default function MisionesPage() {
  return (
    <section className="flex flex-col gap-6">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          El yunque
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Misiones
        </h1>
      </header>

      <div className="forge-panel flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="max-w-xs text-sm text-forge-ink-dim">
          Tus misiones del día (apagada · encendida · forjada).
          <br />
          <span className="text-forge-ink-faint">Se construye en la Fase 3.</span>
        </p>
      </div>
    </section>
  )
}
