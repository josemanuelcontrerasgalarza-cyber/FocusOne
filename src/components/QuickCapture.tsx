'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useIdeaStore } from '@/store/ideaStore'
import { GlassPanel } from '@/glass/GlassPanel'

/**
 * Captura rápida de ideas: la Bóveda de Ideas promete "capturar sin romper
 * el foco", pero hasta ahora exigía navegar a /ideas. Este atajo global
 * (botón flotante + tecla "I") abre un input mínimo desde cualquier
 * pantalla para que una idea fugaz no se pierda ni interrumpa lo que el
 * usuario está haciendo.
 */
export function QuickCapture() {
  const user = useAuthStore((s) => s.user)
  const createIdea = useIdeaStore((s) => s.createIdea)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    function onKeyDown(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (!typing && e.key.toLowerCase() === 'i' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [user])

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [open])

  if (!user) return null

  function close() {
    setOpen(false)
    setValue('')
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') close()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = value.trim()
    if (!clean || saving || !user) return
    setSaving(true)
    await createIdea({ user_id: user.id, title: clean })
    setSaving(false)
    close()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Captura rápida de idea (tecla I)"
        title="Captura rápida de idea — tecla I"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-core to-plasma shadow-glow-core transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
      >
        <Lightbulb size={20} className="text-void" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-void/60 p-4 pt-[18vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="w-full max-w-md"
            >
              <GlassPanel tilt={false} className="p-4">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <Lightbulb size={16} className="shrink-0 text-core" />
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Captura una idea sin perder el foco…"
                    maxLength={500}
                    className="glass-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Cerrar"
                    className="shrink-0 text-ink-ghost hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                </form>
                <p className="mt-2 pl-6 text-xs text-ink-ghost">Enter para guardar · Esc para cerrar</p>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
