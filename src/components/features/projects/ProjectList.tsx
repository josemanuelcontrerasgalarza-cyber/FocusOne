import { useState } from 'react'
import { Plus, FolderOpen } from 'lucide-react'
import { type Project } from '../../../types'
import { ProjectCard } from './ProjectCard'
import { ProjectForm } from './ProjectForm'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { useProjectStore } from '../../../store/projectStore'
import { useAuthStore } from '../../../store/authStore'
import { cn } from '../../../lib/utils'

type Filter = 'all' | 'active' | 'completed' | 'archived'

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'completed', label: 'Completados' },
  { value: 'archived', label: 'Archivados' },
]

interface ProjectListProps {
  projects: Project[]
  loading?: boolean
}

export function ProjectList({ projects, loading }: ProjectListProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [confirmProject, setConfirmProject] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  const { createProject, setMainProject } = useProjectStore()
  const { user } = useAuthStore()

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  const handleCreate = async (data: { name: string; description?: string; goal?: string; target_date?: string }) => {
    if (!user) return
    setSaving(true)
    await createProject({ ...data, user_id: user.id, status: 'active' })
    setSaving(false)
    setFormOpen(false)
  }

  const handleSetMain = (project: Project) => {
    setConfirmProject(project)
  }

  const confirmSetMain = async () => {
    if (!confirmProject || !user) return
    await setMainProject(confirmProject.id, user.id)
    setConfirmProject(null)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1 bg-bg-elevated rounded-lg p-1">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors duration-150',
                filter === f.value
                  ? 'bg-bg-surface text-text-primary font-medium'
                  : 'text-text-muted hover:text-text-primary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setFormOpen(true)}>
          Nuevo proyecto
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center">
            <FolderOpen size={24} className="text-text-hint" />
          </div>
          <p className="text-text-muted text-sm">
            {filter === 'all' ? 'Aún no tienes proyectos' : `No hay proyectos ${filters.find(f => f.value === filter)?.label.toLowerCase()}`}
          </p>
          {filter === 'all' && (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              Crear primer proyecto
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onSetMain={handleSetMain}
            />
          ))}
        </div>
      )}

      <ProjectForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        loading={saving}
      />

      <Modal
        isOpen={!!confirmProject}
        onClose={() => setConfirmProject(null)}
        title="Cambiar misión principal"
        size="sm"
      >
        <p className="text-sm text-text-muted mb-4">
          ¿Quieres establecer <strong className="text-text-primary">"{confirmProject?.name}"</strong> como tu proyecto principal?
          Esto reemplazará tu misión actual.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmProject(null)}>Cancelar</Button>
          <Button onClick={confirmSetMain}>Confirmar</Button>
        </div>
      </Modal>
    </>
  )
}
