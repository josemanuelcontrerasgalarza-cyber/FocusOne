'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Flame, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'

interface Props {
  /** Si true, la misión creada se enciende (activa) de inmediato — estado vacío. */
  activateOnCreate?: boolean
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

/**
 * Captura rápida de una misión sin salir de "Hoy". Cada navegación extra a
 * /misiones es una oportunidad de perder el hilo, así que esto permite anotar
 * (o directamente encender) una misión desde el mismo dashboard diario.
 */
export function QuickAddMission({
  activateOnCreate,
  placeholder = '¿Qué vas a forjar?',
  autoFocus,
  className,
}: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  // Sin sesión real no hay a dónde escribir (demo puro / no autenticado).
  if (!uid) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean || busy) return
    setBusy(true)
    try {
      const { data, error } = await supabase
        .from('missions')
        .insert({ user_id: uid, title: clean, status: 'pending', source: 'user' })
        .select('id')
        .single()
      if (error) throw error

      if (activateOnCreate && data) {
        const { error: activateErr } = await supabase.rpc('activate_mission', {
          p_mission: data.id,
        })
        if (activateErr) throw activateErr
        toast.success('Misión encendida 🔥')
      } else {
        toast.success('Misión añadida')
      }
      setTitle('')
      router.refresh()
    } catch (err) {
      toast.error(
        isDbSetupError(err) ? DB_SETUP_MSG : 'No se pudo crear la misión. Inténtalo de nuevo.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        maxLength={200}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-forge-line bg-forge-canvas px-3.5 py-2.5 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint focus:border-ember/50"
      />
      <button
        type="submit"
        disabled={busy || !title.trim()}
        aria-label={activateOnCreate ? 'Crear y encender misión' : 'Añadir misión'}
        className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-ember px-5 py-2.5 font-forge text-sm font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px disabled:opacity-40"
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : activateOnCreate ? (
          <Flame size={15} />
        ) : (
          <Plus size={15} />
        )}
        {activateOnCreate ? 'Encender' : 'Añadir'}
      </button>
    </form>
  )
}
