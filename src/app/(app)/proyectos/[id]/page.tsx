import type { Metadata } from 'next'
import { ProjectDetail } from './_components/ProjectDetail'

export const metadata: Metadata = { title: 'Proyecto' }

export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectDetail id={id} />
}
