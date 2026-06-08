import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../ui/Modal'
import { Input } from '../../ui/Input'
import { Button } from '../../ui/Button'

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().optional(),
  goal: z.string().optional(),
  target_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ProjectFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  defaultValues?: Partial<FormData>
  loading?: boolean
  title?: string
}

export function ProjectForm({ isOpen, onClose, onSubmit, defaultValues, loading, title = 'Nuevo proyecto' }: ProjectFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (isOpen) reset(defaultValues ?? {})
  }, [isOpen])

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Nombre del proyecto *"
          placeholder="Ej: Lanzar mi app"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">Descripción</label>
          <textarea
            className="w-full rounded-lg bg-bg-elevated border border-border text-text-primary placeholder:text-text-hint px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-150"
            rows={3}
            placeholder="¿De qué trata este proyecto?"
            {...register('description')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">¿Qué define que está terminado?</label>
          <textarea
            className="w-full rounded-lg bg-bg-elevated border border-border text-text-primary placeholder:text-text-hint px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-150"
            rows={2}
            placeholder="Ej: Tener 100 usuarios registrados"
            {...register('goal')}
          />
        </div>
        <Input
          label="Fecha objetivo"
          type="date"
          {...register('target_date')}
        />
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
