import type { Metadata } from 'next'
import { MusicClient } from './_components/MusicClient'

export const metadata: Metadata = { title: 'Música' }

export default function MusicaPage() {
  return <MusicClient />
}
