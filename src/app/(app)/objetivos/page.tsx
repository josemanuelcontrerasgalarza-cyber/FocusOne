import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GoalsView } from './_components/GoalsView'

export const metadata: Metadata = { title: 'Objetivos' }

export default function ObjetivosPage() {
  return (
    <Suspense>
      <GoalsView />
    </Suspense>
  )
}
