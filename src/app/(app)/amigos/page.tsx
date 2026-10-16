import type { Metadata } from 'next'
import { getFriends } from '@/lib/friends'
import { PageHeader } from '@/components/ui/primitives'
import { FriendsClient } from './_components/FriendsClient'

export const metadata: Metadata = { title: 'Amigos' }
export const dynamic = 'force-dynamic'

export default async function AmigosPage() {
  const { friends, incoming, outgoing, isDemo } = await getFriends()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        eyebrow="Tu espacio"
        title="Amigos"
        description="Agrega a tus amigos por su correo y comparen su racha y puntos. Sin presión: es solo un empujón amable."
      />
      <div className="mt-8">
        <FriendsClient friends={friends} incoming={incoming} outgoing={outgoing} isDemo={isDemo} />
      </div>
    </div>
  )
}
