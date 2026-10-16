import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProjectsView } from './_components/ProjectsView'

export const metadata: Metadata = { title: 'Proyectos' }

export default function ProyectosPage() {
  return (
    <Suspense>
      <ProjectsView />
    </Suspense>
  )
}
