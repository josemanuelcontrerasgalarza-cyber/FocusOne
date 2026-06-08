import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import { useIdeas } from '../hooks/useIdeas'
import { useIdeaStore } from '../store/ideaStore'
import { useAuthStore } from '../store/authStore'
import { IdeaVault } from '../components/features/ideas/IdeaVault'
import { ProjectForm } from '../components/features/projects/ProjectForm'
import { type Idea } from '../types'

export function IdeasPage() {
  const { user } = useAuthStore()
  const { ideas, loading } = useIdeas()
  const { createIdea, deleteIdea, convertToProject } = useIdeaStore()
  const [quickInput, setQuickInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [convertIdea, setConvertIdea] = useState<Idea | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleQuickSave = async () => {
    const title = quickInput.trim()
    if (!title || !user) return
    setSaving(true)
    await createIdea({ title, user_id: user.id, tags: [] })
    setQuickInput('')
    setSaving(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleQuickSave()
  }

  const handleConvert = (idea: Idea) => {
    setConvertIdea(idea)
  }

  const handleConvertSubmit = async (data: { name: string; description?: string; goal?: string; target_date?: string }) => {
    if (!convertIdea) return
    await convertToProject(convertIdea, data)
    setConvertIdea(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Bóveda de Ideas</h1>
        <p className="text-sm text-text-muted mt-0.5">Captura tus ideas antes de que se pierdan</p>
      </div>

      {/* Quick input */}
      <div className="flex gap-2 mb-6">
        <input
          ref={inputRef}
          type="text"
          value={quickInput}
          onChange={e => setQuickInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="¿Qué idea tienes ahora? Presiona Enter para guardar..."
          className="flex-1 rounded-lg bg-bg-elevated border border-border text-text-primary placeholder:text-text-hint px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          disabled={saving}
        />
        <button
          onClick={handleQuickSave}
          disabled={!quickInput.trim() || saving}
          className="w-11 h-11 rounded-lg bg-primary hover:bg-primary-dark text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
        </button>
      </div>

      <IdeaVault
        ideas={ideas}
        onDelete={deleteIdea}
        onConvert={handleConvert}
        loading={loading}
      />

      <ProjectForm
        isOpen={!!convertIdea}
        onClose={() => setConvertIdea(null)}
        onSubmit={handleConvertSubmit}
        defaultValues={{ name: convertIdea?.title ?? '', description: convertIdea?.description }}
        title="Convertir idea en proyecto"
      />
    </div>
  )
}
