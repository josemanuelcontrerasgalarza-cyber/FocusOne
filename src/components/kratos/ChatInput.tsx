'use client'

import { useEffect, useRef } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
}

/**
 * Input grande del chat: textarea auto-expandible, Enter envía / Shift+Enter
 * salto de línea, y alterna entre botón Enviar y Detener según el estado.
 */
export function ChatInput({ value, onChange, onSend, onStop, streaming, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!streaming && value.trim()) onSend()
    }
  }

  return (
    <div className="rounded-2xl border border-glass-border bg-surface/60 p-2 backdrop-blur-xl transition-colors focus-within:border-glass-border-hi">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe a Kratos…"
          className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-ghost"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-nova/40 bg-nova/15 text-nova transition-all hover:bg-nova/25"
            title="Detener respuesta"
          >
            <Square size={15} />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim() || disabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-core to-plasma text-void transition-all hover:opacity-90 hover:shadow-glow-core disabled:opacity-30 disabled:hover:shadow-none"
            title="Enviar (Enter)"
          >
            <ArrowUp size={16} />
          </button>
        )}
      </div>
      <p className="px-2 pb-0.5 pt-1 font-data text-[10px] text-ink-ghost">
        Enter para enviar · Shift+Enter para salto de línea
      </p>
    </div>
  )
}
