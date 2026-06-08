import { useState } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { type Task } from '../../../types'
import { TaskItem } from './TaskItem'
import { TaskForm } from './TaskForm'
import { Button } from '../../ui/Button'
import { useTaskStore } from '../../../store/taskStore'
import { useAuthStore } from '../../../store/authStore'

interface TaskListProps {
  tasks: Task[]
  projectId: string
  loading?: boolean
}

const priorityOrder = { high: 0, medium: 1, low: 2 }
const priorityLabel = { high: '🔴 Alta prioridad', medium: '🟡 Media prioridad', low: '⚪ Baja prioridad' }

export function TaskList({ tasks, projectId, loading }: TaskListProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { createTask, completeTask, deleteTask } = useTaskStore()
  const { user } = useAuthStore()

  const pending = tasks.filter(t => t.status === 'pending')
  const completed = tasks.filter(t => t.status === 'completed')

  const groupedPending = (['high', 'medium', 'low'] as const).map(priority => ({
    priority,
    tasks: pending.filter(t => t.priority === priority).sort((a, b) => a.order_index - b.order_index),
  })).filter(g => g.tasks.length > 0)

  const handleCreate = async (data: { title: string; description?: string; priority: 'high' | 'medium' | 'low'; due_date?: string }) => {
    if (!user) return
    setSaving(true)
    await createTask({
      ...data,
      project_id: projectId,
      user_id: user.id,
      status: 'pending',
      order_index: tasks.length,
    })
    setSaving(false)
    setFormOpen(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)}
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setFormOpen(true)}>
          Nueva tarea
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center">
            <CheckSquare size={24} className="text-text-hint" />
          </div>
          <p className="text-text-muted text-sm">No hay tareas aún</p>
          <Button size="sm" onClick={() => setFormOpen(true)}>Crear primera tarea</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Pendientes agrupadas por prioridad */}
          {groupedPending.map(({ priority, tasks: groupTasks }) => (
            <div key={priority}>
              <h4 className="text-xs font-semibold text-text-hint uppercase tracking-wide mb-2">
                {priorityLabel[priority]}
              </h4>
              <div className="flex flex-col gap-2">
                {groupTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={(id) => completeTask(id, projectId)}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Completadas */}
          {completed.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-hint uppercase tracking-wide mb-2">
                ✅ Completadas ({completed.length})
              </h4>
              <div className="flex flex-col gap-2">
                {completed.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={(id) => completeTask(id, projectId)}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <TaskForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        loading={saving}
      />
    </>
  )
}
