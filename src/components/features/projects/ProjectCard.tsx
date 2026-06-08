import { useNavigate } from 'react-router-dom'
import { Target, Calendar, ChevronRight } from 'lucide-react'
import { type Project } from '../../../types'
import { Card } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { ProgressBar } from '../../ui/ProgressBar'
import { Button } from '../../ui/Button'
import { formatDate, getStatusLabel } from '../../../lib/utils'

const statusVariant: Record<string, 'success' | 'warning' | 'muted' | 'primary'> = {
  active: 'primary',
  paused: 'warning',
  completed: 'success',
  archived: 'muted',
}

interface ProjectCardProps {
  project: Project
  onSetMain?: (project: Project) => void
  showMainButton?: boolean
}

export function ProjectCard({ project, onSetMain, showMainButton = true }: ProjectCardProps) {
  const navigate = useNavigate()

  return (
    <Card hover className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {project.is_main && (
            <Target size={14} className="text-primary-light shrink-0" />
          )}
          <h3
            className="font-semibold text-text-primary truncate cursor-pointer hover:text-primary-light transition-colors"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            {project.name}
          </h3>
        </div>
        <Badge variant={statusVariant[project.status] ?? 'muted'}>
          {getStatusLabel(project.status)}
        </Badge>
      </div>

      {project.description && (
        <p className="text-sm text-text-muted line-clamp-2">{project.description}</p>
      )}

      <ProgressBar value={project.progress} showLabel size="sm" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {project.target_date && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Calendar size={11} />
              {formatDate(project.target_date)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showMainButton && !project.is_main && project.status === 'active' && onSetMain && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onSetMain(project) }}
            >
              Hacer principal
            </Button>
          )}
          {project.is_main && (
            <span className="text-xs text-primary-light font-medium">🎯 Principal</span>
          )}
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="text-text-hint hover:text-text-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Card>
  )
}
