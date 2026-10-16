import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AssistantView } from './_components/AssistantView'

export const metadata: Metadata = { title: 'Asistente' }

export default function AsistentePage() {
  return (
    <Suspense>
      <AssistantView />
    </Suspense>
  )
}
