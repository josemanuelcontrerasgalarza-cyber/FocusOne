import { useState } from 'react'
import { Search, Lightbulb } from 'lucide-react'
import { type Idea } from '../../../types'
import { IdeaCard } from './IdeaCard'
import { Input } from '../../ui/Input'

interface IdeaVaultProps {
  ideas: Idea[]
  onDelete: (id: string) => void
  onConvert: (idea: Idea) => void
  loading?: boolean
  limit?: number
}

export function IdeaVault({ ideas, onDelete, onConvert, loading, limit }: IdeaVaultProps) {
  const [search, setSearch] = useState('')

  const filtered = ideas.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.description?.toLowerCase().includes(search.toLowerCase()) ||
    i.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const displayed = limit ? filtered.slice(0, limit) : filtered

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {!limit && (
        <Input
          placeholder="Buscar ideas..."
          leftIcon={<Search size={15} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      )}

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2">
          <Lightbulb size={24} className="text-text-hint" />
          <p className="text-sm text-text-muted">
            {search ? 'No se encontraron ideas' : 'Aún no tienes ideas guardadas'}
          </p>
        </div>
      ) : (
        displayed.map(idea => (
          <IdeaCard key={idea.id} idea={idea} onDelete={onDelete} onConvert={onConvert} />
        ))
      )}
    </div>
  )
}
