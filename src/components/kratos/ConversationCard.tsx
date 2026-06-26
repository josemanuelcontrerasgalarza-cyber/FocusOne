'use client'

import { memo, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type KratosConversation } from '@/types'

interface Props {
  conversation: KratosConversation
  active: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

function ConversationCardBase({ conversation, active, onSelect, onDelete, onRename }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(conversation.title)

  function commit() {
    onRename(conversation.id, draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-xl border border-glass-border-hi bg-black/30 px-2 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
        />
        <button onClick={commit} className="text-ink-ghost hover:text-core" title="Guardar">
          <Check size={13} />
        </button>
        <button onClick={() => setEditing(false)} className="text-ink-ghost hover:text-nova" title="Cancelar">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all',
        active ? 'bg-core/10 text-core' : 'text-ink-dim hover:bg-white/[0.05] hover:text-ink',
      )}
    >
      <button onClick={() => onSelect(conversation.id)} className="min-w-0 flex-1 truncate text-left">
        {conversation.title}
      </button>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => {
            setDraft(conversation.title)
            setEditing(true)
          }}
          className="text-ink-ghost hover:text-core"
          title="Renombrar"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(conversation.id)}
          className="text-ink-ghost hover:text-nova"
          title="Eliminar"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

export const ConversationCard = memo(ConversationCardBase)
