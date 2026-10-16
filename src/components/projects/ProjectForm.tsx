'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/primitives'
import { useWorkspace } from '@/store/workspace'
import { PROJECT_COLORS } from '@/lib/colors'
import { PRIORITY_META } from '@/lib/kairo/tasks'
import type { Priority, Project, ProjectColor, ProjectStatus } from '@/lib/kairo/types'

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Activo',
  paused: 'En pausa',
  completed: 'Completado',
  archived: 'Archivado',
}

/** Crear / editar proyecto. Validación en línea; guarda vía store optimista. */
export function ProjectForm({
  open,
  onClose,
  project,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  project?: Project | null
  onSaved?: (p: Project) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={project ? 'Editar proyecto' : 'Nuevo proyecto'} size="md">
      {open && <Form project={project ?? null} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  )
}

function Form({ project, onClose, onSaved }: { project: Project | null; onClose: () => void; onSaved?: (p: Project) => void }) {
  const { addProject, updateProject } = useWorkspace()
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState<ProjectColor>(project?.color ?? 'lime')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [priority, setPriority] = useState<Priority>(project?.priority ?? 2)
  const [start, setStart] = useState(project?.start_date ?? '')
  const [target, setTarget] = useState(project?.target_date ?? '')
  const [errors, setErrors] = useState<{ name?: string; target?: string }>({})
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Ponle un nombre al proyecto.'
    else if (name.trim().length > 120) errs.name = 'Máximo 120 caracteres.'
    if (start && target && target < start) errs.target = 'La fecha final no puede ser anterior al inicio.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    const data = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      status,
      priority,
      start_date: start || null,
      target_date: target || null,
    }
    if (project) {
      await updateProject(project.id, data)
      onSaved?.({ ...project, ...data })
    } else {
      const p = await addProject(data)
      if (p) onSaved?.(p)
    }
    setBusy(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-2" noValidate>
      <Field label="Nombre" htmlFor="p-name" error={errors.name}>
        <input id="p-name" data-autofocus value={name} onChange={(e) => setName(e.target.value)} className="k-input" maxLength={120} placeholder="Lanzamiento web, TFG, Mudanza…" aria-invalid={Boolean(errors.name)} />
      </Field>
      <Field label="Descripción" htmlFor="p-desc" hint="Opcional: el resultado que buscas.">
        <textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="k-input resize-y" maxLength={500} />
      </Field>
      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-ink">Color</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color del proyecto">
          {(Object.keys(PROJECT_COLORS) as ProjectColor[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={PROJECT_COLORS[c].label}
              onClick={() => setColor(c)}
              className={clsx('flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform', color === c ? 'scale-110 border-ink' : 'border-transparent')}
              style={{ background: PROJECT_COLORS[c].hex }}
            >
              {color === c && <Check size={14} strokeWidth={3} className="text-white" />}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado" htmlFor="p-status">
          <select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="k-input">
            {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prioridad" htmlFor="p-prio">
          <select id="p-prio" value={priority} onChange={(e) => setPriority(Number(e.target.value) as Priority)} className="k-input">
            {([4, 3, 2, 1] as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Inicio" htmlFor="p-start">
          <input id="p-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="k-input" />
        </Field>
        <Field label="Fecha objetivo" htmlFor="p-target" error={errors.target}>
          <input id="p-target" type="date" value={target} onChange={(e) => setTarget(e.target.value)} className="k-input" aria-invalid={Boolean(errors.target)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={busy}>
          {project ? 'Guardar cambios' : 'Crear proyecto'}
        </Button>
      </div>
    </form>
  )
}
