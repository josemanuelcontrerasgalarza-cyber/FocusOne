'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox, Loader2, CornerDownLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'

/**
 * Captura rápida: un pensamiento fugaz durante una sesión de foco no debe
 * romper la sesión ni perderse. Un atajo (tecla "c") o el botón flotante
 * abren un único campo de texto; Enter la guarda como misión apagada
 * (pending, sin proyecto ni minutos que decidir) y vuelve exactamente a
 * donde estabas. Cero fricción — el objetivo no es planear, es no perder
 * el hilo.
 */
export function QuickCapture() {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (open) return
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (!typing && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40)
  }, [open])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    if (!uid) {
      toast.error('Inicia sesión para guardar misiones')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('missions').insert({
        user_id: uid,
        title: clean,
        project: null,
        estimated_minutes: 25,
        status: 'pending',
        source: 'user',
      })
      if (error) throw error
      toast.success('Guardado en Misiones')
      setTitle('')
      setOpen(false)
      router.refresh()
    } catch (err) {
      const msg = isDbSetupError(err) ? DB_SETUP_MSG : 'No se pudo guardar. Inténtalo de nuevo.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Captura rápida — guardar una idea sin perder el hilo"
        title="Captura rápida (tecla C)"
        className="fixed bottom-20 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-forge-line bg-forge-surface text-forge-ink-dim shadow-lg transition-colors hover:border-ember/50 hover:text-ember sm:bottom-6 sm:left-6"
      >
        <Inbox size={19} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[20vh]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form
            onSubmit={save}
            className="relative w-full max-w-md overflow-hidden rounded-forge border border-forge-line bg-forge-surface shadow-ember"
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Inbox size={18} className="flex-shrink-0 text-ember" />
              <input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Anota la idea… Enter para guardar"
                maxLength={200}
                className="flex-1 bg-transparent font-forge text-[15px] text-forge-ink outline-none placeholder:text-forge-ink-faint"
              />
              {saving ? (
                <Loader2 size={16} className="flex-shrink-0 animate-spin text-forge-ink-faint" />
              ) : (
                <CornerDownLeft size={14} className="flex-shrink-0 text-forge-ink-faint" />
              )}
            </div>
            <div className="border-t border-forge-line px-4 py-2 text-xs text-forge-ink-faint">
              Se guarda en Misiones, apagada, sin interrumpir lo que estás haciendo.
            </div>
          </form>
        </div>
      )}
    </>
  )
}
