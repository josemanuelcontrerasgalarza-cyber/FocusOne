import type { Metadata } from 'next'
import { getPetData } from '@/lib/pet'
import { PetStudio } from './_components/PetStudio'

export const metadata: Metadata = { title: 'Focus Pet' }
export const dynamic = 'force-dynamic'

/**
 * Focus Pet: tu mascota de enfoque. Se adopta y personaliza (ropa/accesorios)
 * gastando los puntos que ganas forjando misiones.
 */
export default async function MascotaPage() {
  const { catalog, ownedIds, pet, points, isDeveloper, isDemo } = await getPetData()

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">
          Focus Pet · tu compañero
        </p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">
          Mascota
        </h1>
      </header>

      <PetStudio
        catalog={catalog}
        ownedIds={ownedIds}
        pet={pet}
        points={points}
        isDeveloper={isDeveloper}
        isDemo={isDemo}
      />
    </section>
  )
}
