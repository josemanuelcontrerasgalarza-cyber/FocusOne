'use client'

import { Plus, MessageSquare } from 'lucide-react'
import { ConversationCard } from './ConversationCard'
import { type KratosConversation } from '@/types'

interface Props {
  conversations: KratosConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

/** Historial de conversaciones + botón de nueva conversación. */
export function SidebarChat({ conversations, activeId, onSelect, onNew, onDelete, onRename }: Props) {
  return (
    <div className="flex h-full flex-col">
      <button
        onClick={onNew}
        className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-glass-border bg-surface/50 px-3 py-2.5 text-sm font-medium text-ink transition-all hover:border-glass-border-hi hover:shadow-glow-core"
      >
        <Plus size={15} /> Nueva conversación
      </button>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-2 px-4 text-center">
            <MessageSquare size={22} className="text-ink-ghost" />
            <p className="text-xs text-ink-ghost">
              Aún no hay conversaciones. Empieza una nueva con Kratos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((c) => (
              <ConversationCard
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
