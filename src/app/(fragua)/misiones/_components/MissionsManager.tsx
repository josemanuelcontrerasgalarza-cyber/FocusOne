'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Flame, Plus, Check, Trash2, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import type { Mission } from '@/types'

// Ventana de gracia antes de borrar de verdad en el servidor: da tiempo a
// pulsar "Deshacer" tras un clic accidental (borrado sin confirmación previa).
const DELETE_UNDO_MS = 6000

interface Props {
  active: Mission | null
  pending: Mission[]
  completedToday: Mission[]
  isDemo: boolean
}

/**
 * Gestión de misiones del día (Fase 3): crear, encender (activar), forjar
 * (completar) y borrar. La regla "una sola activa" la impone el backend
 * (RPC activate_mission + índice único parcial); aquí solo reflejamos estado.
 *
 * Estados visuales: apagada (pending) · encendida (active) · forjada (completed).
 */
export function MissionsManager({ active, pending, completedToday, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)

  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Misiones ocultas de forma optimista mientras corre la ventana de deshacer.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Sin sesión real no se puede gestionar (las mutaciones necesitan user_id).
  if (isDemo || !uid) {
    return (
      <div className="forge-panel p-8 text-center">
        <p className="text-sm text-forge-ink-dim">
          Inicia sesión para crear y gestionar tus misiones.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-full bg-ember px-6 py-3 font-forge text-sm font-bold text-forge-canvas shadow-ember"
        >
          Iniciar sesión
        </Link>
      </div>
    )
  }

  async function createMission(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    setCreating(true)
    try {
      const { error } = await supabase.from('missions').insert({
        user_id: uid,
        title: clean,
        project: project.trim() || null,
        estimated_minutes: minutes,
        status: 'pending',
        source: 'user',
      })
      if (error) throw error
      setTitle('')
      setProject('')
      setMinutes(25)
      toast.success('Misión añadida')
      router.refresh()
    } catch {
      toast.error('No se pudo crear la misión. Inténtalo de nuevo.')
    } finally {
      setCreating(false)
    }
  }

  async function activateMission(id: string) {
    setBusyId(id)
    try {
      // RPC atómica: apaga la activa anterior y enciende esta en el backend.
      const { error } = await supabase.rpc('activate_mission', { p_mission: id })
      if (error) throw error
      toast.success('Misión encendida 🔥')
      router.refresh()
    } catch {
      toast.error('No se pudo encender la misión.')
    } finally {
      setBusyId(null)
    }
  }

  // Nota: completar una misión (con quiz de cierre) ocurre en /hoy, no aquí.
  // Esta pantalla solo crea/enciende/borra; "Ir a forjar" lleva al dashboard.

  // Borrado optimista con ventana de deshacer: no hay diálogo de confirmación
  // (fricción extra) pero tampoco es irreversible al instante. La misión
  // desaparece de la vista ya mismo; el DELETE real se dispara pasados
  // DELETE_UNDO_MS, salvo que se pulse "Deshacer" antes.
  function deleteMission(id: string) {
    setHiddenIds((prev) => new Set(prev).add(id))

    const timer = setTimeout(async () => {
      deleteTimers.current.delete(id)
      const { error } = await supabase.from('missions').delete().eq('id', id)
      if (error) {
        toast.error('No se pudo borrar la misión.')
        setHiddenIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        return
      }
      router.refresh()
    }, DELETE_UNDO_MS)
    deleteTimers.current.set(id, timer)

    toast.undo('Misión borrada', () => {
      const pendingTimer = deleteTimers.current.get(id)
      if (pendingTimer) {
        clearTimeout(pendingTimer)
        deleteTimers.current.delete(id)
      }
      setHiddenIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    })
  }

  const visiblePending = pending.filter((m) => !hiddenIds.has(m.id))

  return (
    <div className="flex flex-col gap-8">
      {/* Crear misión */}
      <form onSubmit={createMission} className="forge-panel flex flex-col gap-3 p-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué vas a forjar?"
          maxLength={200}
          className="w-full bg-transparent font-forge text-lg font-semibold text-forge-ink outline-none placeholder:text-forge-ink-faint"
        />
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="Proyecto (opcional)"
            className="min-w-0 flex-1 rounded-lg border border-forge-line bg-forge-canvas px-3 py-2 text-sm text-forge-ink outline-none placeholder:text-forge-ink-faint focus:border-ember/50"
          />
          <label className="flex items-center gap-2 text-sm text-forge-ink-dim">
            <input
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-forge-line bg-forge-canvas px-2 py-2 text-center font-num text-sm text-forge-ink outline-none focus:border-ember/50"
            />
            min
          </label>
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 font-forge text-sm font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px disabled:opacity-40"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Añadir
          </button>
        </div>
      </form>

      {/* Encendida (activa) */}
      {active && (
        <section>
          <SectionLabel>Encendida</SectionLabel>
          <div className="rounded-forge border border-ember/40 bg-ember/[0.06] p-5 shadow-ember">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <Flame size={15} className="text-ember" strokeWidth={2.6} />
                  <span className="font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-ember">
                    Activa
                  </span>
                </div>
                <h3 className="truncate font-forge text-lg font-bold text-forge-ink">
                  {active.title}
                </h3>
                <MissionMeta mission={active} />
              </div>
              <Link
                href="/hoy"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/[0.12] px-4 py-2 font-forge text-sm font-semibold text-forge-ink-dim transition-colors hover:border-white/30 hover:text-forge-ink"
              >
                Ir a forjar <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Apagadas (pendientes) */}
      <section>
        <SectionLabel>Apagadas</SectionLabel>
        {visiblePending.length === 0 ? (
          <p className="text-sm text-forge-ink-faint">
            No hay misiones pendientes. Crea una arriba.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {visiblePending.map((m) => {
              const busy = busyId === m.id
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-forge border border-forge-line bg-forge-surface p-4"
                >
                  <span className="h-3 w-3 flex-shrink-0 rounded-full border-[1.5px] border-forge-ink-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-forge text-[15px] font-semibold text-forge-ink">
                      {m.title}
                    </p>
                    <MissionMeta mission={m} />
                  </div>
                  <button
                    onClick={() => activateMission(m.id)}
                    disabled={busy}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-ember px-4 py-2 font-forge text-sm font-bold text-forge-canvas shadow-ember transition-transform hover:-translate-y-px disabled:opacity-40"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />}
                    Encender
                  </button>
                  <button
                    onClick={() => deleteMission(m.id)}
                    aria-label="Borrar misión"
                    className="flex-shrink-0 rounded-full p-2 text-forge-ink-faint transition-colors hover:text-forge-ink"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Forjadas hoy (completadas) */}
      {completedToday.length > 0 && (
        <section>
          <SectionLabel>Forjadas hoy</SectionLabel>
          <div className="flex flex-col gap-2">
            {completedToday.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-forge border border-forge-line bg-forge-surface/50 p-4 opacity-70"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-metal/15">
                  <Check size={13} className="text-metal" strokeWidth={3} />
                </span>
                <p className="min-w-0 flex-1 truncate font-forge text-[15px] font-medium text-forge-ink-dim line-through">
                  {m.title}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
      {children}
    </div>
  )
}

/** Meta bajo el título: proyecto · minutos estimados. */
function MissionMeta({ mission }: { mission: Mission }) {
  const parts: string[] = []
  if (mission.project) parts.push(mission.project)
  parts.push(`${mission.estimated_minutes} min`)
  return <p className="mt-0.5 truncate text-[13px] text-forge-ink-faint">{parts.join(' · ')}</p>
}
