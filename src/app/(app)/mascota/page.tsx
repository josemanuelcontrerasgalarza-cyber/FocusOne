import type { Metadata } from 'next'
import { getPetData } from '@/lib/pet'
import { PageHeader } from '@/components/ui/primitives'
import { PetStudio } from './_components/PetStudio'

export const metadata: Metadata = { title: 'Mascota' }
export const dynamic = 'force-dynamic'

/**
 * Mascota: tu compañero de enfoque. Se adopta y personaliza (ropa/accesorios)
 * con los puntos que ganas completando tareas.
 */
export default async function MascotaPage() {
  const { catalog, ownedIds, pet, points, isDeveloper, isDemo } = await getPetData()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        eyebrow="Recompensas"
        title="Mascota"
        description="Un compañero discreto para tus sesiones. Vístelo con lo que ganas avanzando."
      />
      <div className="mt-8">
        <PetStudio
          catalog={catalog}
          ownedIds={ownedIds}
          pet={pet}
          points={points}
          isDeveloper={isDeveloper}
          isDemo={isDemo}
        />
      </div>
    </div>
  )
}
