import type { Metadata } from 'next'
import { getStoreData } from '@/lib/store'
import { StoreClient } from './_components/StoreClient'

export const metadata: Metadata = { title: 'Tienda' }
export const dynamic = 'force-dynamic'

export default async function TiendaPage() {
  const { catalog, ownedIds, points, isDeveloper, isDemo } = await getStoreData()

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 pb-28 sm:px-8">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">Colección</p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">Tienda</h1>
        <p className="mt-1 text-sm text-forge-ink-dim">
          {catalog.length} ítems para desbloquear con tus puntos. Los equipables se lucen en Focus Pet.
        </p>
      </header>

      <StoreClient
        catalog={catalog}
        ownedIds={ownedIds}
        points={points}
        isDeveloper={isDeveloper}
        isDemo={isDemo}
      />
    </section>
  )
}
