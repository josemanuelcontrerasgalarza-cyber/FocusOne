import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Perfil' }

/**
 * Pantalla "Perfil": datos del usuario + tienda de recompensas.
 * Esqueleto en Fase 1 — la tienda se construye en la Fase 6.
 */
export default function PerfilPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          El herrero
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Perfil
        </h1>
      </header>

      <div className="forge-panel flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="max-w-xs text-sm text-forge-ink-dim">
          Tu cuenta y la tienda de recompensas.
          <br />
          <span className="text-forge-ink-faint">
            La tienda se construye en la Fase 6.
          </span>
        </p>
      </div>
    </section>
  )
}
