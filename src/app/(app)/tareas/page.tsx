import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TasksView } from './_components/TasksView'

export const metadata: Metadata = { title: 'Tareas' }

export default function TareasPage() {
  return (
    <Suspense>
      <TasksView />
    </Suspense>
  )
}
