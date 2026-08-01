import type { Metadata } from 'next'
import { getMissionsBoard } from '@/lib/missions'
import { MissionsManager } from './_components/MissionsManager'

export const metadata: Metadata = { title: 'Misiones' }

// Se leen las misiones del usuario por request.
export const dynamic = 'force-dynamic'

/**
 * Pantalla "Misiones" (Fase 3): CRUD completo del día.
 * Server Component: lee el tablero (activa / apagadas / forjadas hoy) y lo
 * pasa al manager interactivo.
 */
export default async function MisionesPage() {
  const { active, pending, completedToday, isDemo } = await getMissionsBoard()

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          El yunque
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Misiones
        </h1>
      </header>

      <MissionsManager
        active={active}
        pending={pending}
        completedToday={completedToday}
        isDemo={isDemo}
      />
    </section>
  )
}
