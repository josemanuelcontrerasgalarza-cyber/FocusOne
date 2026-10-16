import type { Metadata } from 'next'
import { getFriends } from '@/lib/friends'
import { FriendsClient } from './_components/FriendsClient'

export const metadata: Metadata = { title: 'Amigos' }
export const dynamic = 'force-dynamic'

export default async function AmigosPage() {
  const { friends, incoming, outgoing, isDemo } = await getFriends()

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10 pb-28 sm:px-12">
      <header>
        <p className="font-num text-xs uppercase tracking-[0.2em] text-forge-ink-faint">Comunidad</p>
        <h1 className="mt-1 font-forge text-3xl font-extrabold tracking-tight">Amigos</h1>
        <p className="mt-1 text-sm text-forge-ink-dim">
          Agrega a tus amigos por su correo y compitan por la mejor racha y puntos.
        </p>
      </header>

      <FriendsClient friends={friends} incoming={incoming} outgoing={outgoing} isDemo={isDemo} />
    </section>
  )
}
