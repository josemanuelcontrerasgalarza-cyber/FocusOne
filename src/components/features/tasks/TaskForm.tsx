import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../ui/Modal'
import { Input } from '../../ui/Input'
import { Button } from '../../ui/Button'
import { cn } from '../../../lib/utils'

const schema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  due_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  loading?: boolean
}

const priorities: { value: FormData['priority']; label: string; color: string }[] = [
  { value: 'high', label: 'Alta', color: 'border-danger/50 bg-danger/10 text-danger' },
  { value: 'medium', label: 'Media', color: 'border-warning/50 bg-warning/10 text-warning' },
  { value: 'low', label: 'Baja', color: 'border-border bg-bg-elevated text-text-muted' },
]

export function TaskForm({ isOpen, onClose, onSubmit, loading }: TaskFormProps) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  })

  const priority = watch('priority')

  useEffect(() => {
    if (isOpen) reset({ priority: 'medium' })
  }, [isOpen])

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva tarea">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Título *"
          placeholder="¿Qué hay que hacer?"
          error={errors.title?.message}
          {...register('title')}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Descripción</label>
          <textarea
            className="w-full rounded-lg bg-bg-elevated border border-border text-text-primary placeholder:text-text-hint px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            rows={2}
            placeholder="Detalles opcionales..."
            {...register('description')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Prioridad</label>
          <div className="flex gap-2">
            {priorities.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setValue('priority', p.value)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border transition-all duration-150',
                  priority === p.value
                    ? p.color + ' ring-2 ring-offset-1 ring-offset-bg-base ring-current'
                    : 'border-border bg-bg-elevated text-text-muted hover:border-border',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Fecha límite"
          type="date"
          {...register('due_date')}
        />

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear tarea
          </Button>
        </div>
      </form>
    </Modal>
  )
}
