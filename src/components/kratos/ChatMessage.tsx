'use client'

import { memo, useState } from 'react'
import dynamic from 'next/dynamic'
import { BrainCircuit, Check, Copy } from 'lucide-react'
import { type KratosMessage } from '@/types'

// Lazy: react-markdown + highlight.js solo se descargan al renderizar un mensaje.
const MarkdownRenderer = dynamic(() => import('./MarkdownRenderer'), {
  ssr: false,
  loading: () => <span className="text-sm text-ink-ghost">…</span>,
})

interface Props {
  role: KratosMessage['role']
  content: string
  streaming?: boolean
}

function ChatMessageBase({ role, content, streaming }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(content).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => undefined,
    )
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-core/25 bg-core/10 px-4 py-2.5 text-sm text-ink">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-core to-plasma text-void shadow-glow-core">
        <BrainCircuit size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-data text-[11px] uppercase tracking-wider text-ink-ghost">Kratos</span>
          {!streaming && content && (
            <button
              onClick={copy}
              className="text-ink-ghost opacity-0 transition-opacity hover:text-core group-hover:opacity-100"
              title="Copiar respuesta"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
        </div>
        <div className="mt-1 text-sm leading-relaxed text-ink-dim">
          <MarkdownRenderer content={content} />
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-core align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}

export const ChatMessage = memo(ChatMessageBase)
