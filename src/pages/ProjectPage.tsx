import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Target, Trash2, Archive, Calendar, Flag } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore } from '../store/authStore'
import { useTasks } from '../hooks/useTasks'
import { TaskList } from '../components/features/tasks/TaskList'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Modal } from '../components/ui/Modal'
import { Card } from '../components/ui/Card'
import { useTaskStore } from '../store/taskStore'
import { formatDate, getStatusLabel, cn } from '../lib/utils'

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects, setMainProject, updateProject, deleteProject } = useProjectStore()
  const { user } = useAuthStore()
  const { tasks, loading } = useTasks(id)
  const [tab, setTab] = useState<'tasks' | 'details'>('tasks')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmMain, setConfirmMain] = useState(false)

  const project = projects.find(p => p.id === id)

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-text-muted">Proyecto no encontrado</p>
        <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/projects')}>
          Volver
        </Button>
      </div>
    )
  }

  const handleSetMain = async () => {
    if (!user) return
    await setMainProject(project.id, user.id)
    setConfirmMain(false)
  }

  const handleArchive = async () => {
    await updateProject(project.id, { status: 'archived' })
    navigate('/projects')
  }

  const handleDelete = async () => {
    await deleteProject(project.id)
    navigate('/projects')
  }

  const statusVariant: Record<string, 'primary' | 'warning' | 'success' | 'muted'> = {
    active: 'primary',
    paused: 'warning',
    completed: 'success',
    archived: 'muted',
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors"
      >
        <ArrowLeft size={16} /> Proyectos
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-text-primary">{project.name}</h1>
            <Badge variant={statusVariant[project.status]}>{getStatusLabel(project.status)}</Badge>
            {project.is_main && <Badge variant="primary">🎯 Principal</Badge>}
          </div>
        </div>
        {!project.is_main && project.status === 'active' && (
          <Button
            size="sm"
            leftIcon={<Target size={14} />}
            onClick={() => setConfirmMain(true)}
          >
            Hacer principal
          </Button>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>{tasks.filter(t => t.status === 'completed').length} de {tasks.length} tareas</span>
          <span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} size="lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 mb-6 w-fit">
        {(['tasks', 'details'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm transition-colors duration-150',
              tab === t
                ? 'bg-bg-surface text-text-primary font-medium'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            {t === 'tasks' ? 'Tareas' : 'Detalles'}
          </button>
        ))}
      </div>

      {tab === 'tasks' ? (
        <TaskList tasks={tasks} projectId={project.id} loading={loading} />
      ) : (
        <div className="flex flex-col gap-4">
          {project.description && (
            <Card>
              <h3 className="text-xs font-semibold text-text-hint uppercase tracking-wide mb-2">Descripción</h3>
              <p className="text-sm text-text-muted">{project.description}</p>
            </Card>
          )}
          {project.goal && (
            <Card>
              <h3 className="text-xs font-semibold text-text-hint uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Flag size={12} /> Objetivo
              </h3>
              <p className="text-sm text-text-muted">{project.goal}</p>
            </Card>
          )}
          <Card>
            <h3 className="text-xs font-semibold text-text-hint uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Calendar size={12} /> Fechas
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Inicio</span>
                <span className="text-text-primary">{formatDate(project.start_date)}</span>
              </div>
              {project.target_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Objetivo</span>
                  <span className="text-text-primary">{formatDate(project.target_date)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Acciones peligrosas */}
          <Card className="border-danger/20">
            <h3 className="text-xs font-semibold text-text-hint uppercase tracking-wide mb-3">Acciones</h3>
            <div className="flex gap-2">
              {project.status !== 'archived' && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Archive size={14} />}
                  onClick={handleArchive}
                >
                  Archivar
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                onClick={() => setConfirmDelete(true)}
              >
                Eliminar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirm main */}
      <Modal isOpen={confirmMain} onClose={() => setConfirmMain(false)} title="Cambiar misión principal" size="sm">
        <p className="text-sm text-text-muted mb-4">
          ¿Quieres establecer <strong className="text-text-primary">"{project.name}"</strong> como tu proyecto principal?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmMain(false)}>Cancelar</Button>
          <Button onClick={handleSetMain}>🎯 Confirmar</Button>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar proyecto" size="sm">
        <p className="text-sm text-text-muted mb-4">
          ¿Seguro que quieres eliminar <strong className="text-text-primary">"{project.name}"</strong>?
          Todas las tareas asociadas también se eliminarán. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
