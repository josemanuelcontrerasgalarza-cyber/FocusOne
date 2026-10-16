import type { Metadata } from 'next'
import { Suspense } from 'react'
import { FocusView } from './_components/FocusView'

export const metadata: Metadata = { title: 'Enfoque' }

/** Modo Enfoque: pantalla inmersiva (el shell oculta su navegación aquí). */
export default function EnfoquePage() {
  return (
    <Suspense>
      <FocusView />
    </Suspense>
  )
}
