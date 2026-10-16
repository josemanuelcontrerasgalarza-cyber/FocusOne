import type { Metadata } from 'next'
import { SettingsView } from './_components/SettingsView'

export const metadata: Metadata = { title: 'Ajustes' }

export default function AjustesPage() {
  return <SettingsView />
}
