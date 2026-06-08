import { useState } from 'react'
import { Trash2, ArrowRight, Calendar } from 'lucide-react'
import { type Idea } from '../../../types'
import { Card } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { formatDate } from '../../../lib/utils'

interface IdeaCardProps {
  idea: Idea
  onDelete: (id: string) => void
  onConvert: (idea: Idea) => void
}

export function IdeaCard({ idea, onDelete, onConvert }: IdeaCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isConverted = !!idea.converted_to_project_id

  return (
    <>
      <Card className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary flex-1">{idea.title}</h3>
          {isConverted && (
            <Badge variant="success" className="shrink-0">Convertida ✓</Badge>
          )}
        </div>

        {idea.description && (
          <p className="text-xs text-text-muted line-clamp-2">{idea.description}</p>
        )}

        {idea.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {idea.tags.map(tag => (
              <Badge key={tag} variant="muted">#{tag}</Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Calendar size={10} />
            {formatDate(idea.created_at)}
          </span>

          <div className="flex items-center gap-1">
            {!isConverted && (
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight size={12} />}
                onClick={() => onConvert(idea)}
              >
                Convertir
              </Button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-text-hint hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </Card>

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar idea" size="sm">
        <p className="text-sm text-text-muted mb-4">
          ¿Seguro que quieres eliminar <strong className="text-text-primary">"{idea.title}"</strong>?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => { onDelete(idea.id); setConfirmDelete(false) }}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
