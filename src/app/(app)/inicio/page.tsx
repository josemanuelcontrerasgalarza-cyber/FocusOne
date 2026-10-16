import type { Metadata } from 'next'
import { HomeView } from './_components/HomeView'

export const metadata: Metadata = { title: 'Inicio' }

export default function InicioPage() {
  return <HomeView />
}
