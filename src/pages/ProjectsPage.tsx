import { useProjects } from '../hooks/useProjects'
import { ProjectList } from '../components/features/projects/ProjectList'

export function ProjectsPage() {
  const { projects, loading } = useProjects()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Proyectos</h1>
        <p className="text-sm text-text-muted mt-0.5">Gestiona todos tus proyectos</p>
      </div>
      <ProjectList projects={projects} loading={loading} />
    </div>
  )
}
