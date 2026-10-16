import type { Metadata } from 'next'
import { getStoreData } from '@/lib/store'
import { PageHeader } from '@/components/ui/primitives'
import { StoreClient } from './_components/StoreClient'

export const metadata: Metadata = { title: 'Tienda' }
export const dynamic = 'force-dynamic'

export default async function TiendaPage() {
  const { catalog, ownedIds, points, isDeveloper, isDemo } = await getStoreData()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        eyebrow="Recompensas"
        title="Tienda"
        description={`${catalog.length} ítems para coleccionar con los puntos que ganas avanzando. Los equipables se lucen en Mascota.`}
      />
      <div className="mt-8">
        <StoreClient catalog={catalog} ownedIds={ownedIds} points={points} isDeveloper={isDeveloper} isDemo={isDemo} />
      </div>
    </div>
  )
}
