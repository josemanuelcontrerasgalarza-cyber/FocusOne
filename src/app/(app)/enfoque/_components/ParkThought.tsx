'use client'

import { useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { useWorkspace } from '@/store/workspace'
import { toast } from '@/lib/toast'

/**
 * «Aparcar» un pensamiento que distrae durante el enfoque: se guarda como
 * tarea en la bandeja (sin proyecto ni fecha) para revisarla después, sin
 * salir de la sesión ni tocar el temporizador.
 */
export function ParkThought() {
  const addTask = useWorkspace((s) => s.addTask)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function park(e: React.FormEvent) {
    e.preventDefault()
    const title = text.trim()
    if (!title || busy) return
    setBusy(true)
    const t = await addTask({ title }, { silent: true })
    setBusy(false)
    if (t) {
      setText('')
      toast.success('Aparcado. Sigue con lo tuyo.')
    }
  }

  return (
    <form onSubmit={park} className="mt-6 w-full max-w-sm">
      <label className="relative block">
        <span className="sr-only">Aparcar una distracción para después</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="¿Algo te distrae? Aparca la idea para después"
          className="h-10 w-full rounded-control border border-line bg-surface pl-3 pr-10 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-line-strong"
        />
        {text.trim() && (
          <button
            type="submit"
            disabled={busy}
            aria-label="Aparcar"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-dim hover:bg-sunken disabled:opacity-50"
          >
            <CornerDownLeft size={14} />
          </button>
        )}
      </label>
    </form>
  )
}
