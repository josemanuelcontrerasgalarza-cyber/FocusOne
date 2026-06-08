import { useState } from 'react'
import { Trash2, Calendar } from 'lucide-react'
import { type Task } from '../../../types'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { formatDate, getPriorityLabel, cn } from '../../../lib/utils'

const priorityVariant: Record<string, 'danger' | 'warning' | 'muted'> = {
  high: 'danger',
  medium: 'warning',
  low: 'muted',
}

interface TaskItemProps {
  task: Task
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskItem({ task, onComplete, onDelete }: TaskItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [completing, setCompleting] = useState(false)

  const handleComplete = async () => {
    if (task.status === 'completed' || completing) return
    setCompleting(true)
    await onComplete(task.id)
    setCompleting(false)
  }

  const isCompleted = task.status === 'completed'

  return (
    <>
      <div className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border transition-all duration-150',
        isCompleted
          ? 'border-border/50 bg-bg-base opacity-60'
          : 'border-border bg-bg-elevated hover:border-border',
      )}>
        {/* Checkbox */}
        <button
          onClick={handleComplete}
          disabled={isCompleted || completing}
          className={cn(
            'mt-0.5 w-5 h-5 min-w-[20px] rounded-full border-2 flex items-center justify-center transition-all duration-200',
            isCompleted
              ? 'bg-success border-success text-white'
              : 'border-border hover:border-success hover:bg-success/10',
          )}
        >
          {isCompleted && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium transition-all duration-200',
            isCompleted ? 'line-through text-text-hint' : 'text-text-primary',
          )}>
            {task.title}
          </p>
          {task.description && !isCompleted && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant={priorityVariant[task.priority]}>{getPriorityLabel(task.priority)}</Badge>
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Calendar size={10} />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => setConfirmDelete(true)}
          className="opacity-0 group-hover:opacity-100 p-1 text-text-hint hover:text-danger transition-all duration-150 mt-0.5"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar tarea" size="sm">
        <p className="text-sm text-text-muted mb-4">
          ¿Seguro que quieres eliminar <strong className="text-text-primary">"{task.title}"</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => { onDelete(task.id); setConfirmDelete(false) }}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
