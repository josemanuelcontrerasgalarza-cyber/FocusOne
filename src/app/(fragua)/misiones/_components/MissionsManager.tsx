'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Flame, Plus, Check, Trash2, Loader2, ArrowRight, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/store/authStore'
import { isDbSetupError, DB_SETUP_MSG } from '@/lib/dbError'
import type { Mission } from '@/types'

interface Props {
  active: Mission | null
  pending: Mission[]
  history: Mission[] // todas las forjadas (historial completo)
  isDemo: boolean
}

/** "2026-08-02T..." → "2 ago" (fecha corta para el historial). */
function shortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}

/** Duraciones sugeridas (mismas que Deep Work). El usuario también puede poner
 *  cualquier tiempo a mano en el campo de minutos. */
const PRESETS = [
  { label: 'Express', minutes: 15 },
  { label: 'Sprint', minutes: 25 },
  { label: 'Profundo', minutes: 50 },
  { label: 'Monk mode', minutes: 90 },
]

/**
 * Gestión de misiones del día (Fase 3): crear, encender (activar), forjar
 * (completar) y borrar. La regla "una sola activa" la impone el backend
 * (RPC activate_mission + índice único parcial); aquí solo reflejamos estado.
 *
 * Estados visuales: apagada (pending) · encendida (active) · forjada (completed).
 */
export function MissionsManager({ active, pending, history, isDemo }: Props) {
  const router = useRouter()
  const uid = useAuthStore((s) => s.session?.user?.id ?? s.user?.id)

  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Borrado es irreversible: el primer clic solo arma la confirmación.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // Error visible y PERSISTENTE (no un toast que se desvanece): así, si algo
  // falla al agregar, se ve el motivo real hasta el próximo intento.
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Misiones recién creadas en esta sesión: se muestran al instante (optimista)
  // aunque el refresh del servidor tarde un momento.
  const [extra, setExtra] = useState<Mission[]>([])

  // Pendientes = las del servidor + las creadas al vuelo (deduplicadas por id).
  const pendingAll = useMemo(() => {
    const map = new Map<string, Mission>()
    for (const m of pending) map.set(m.id, m)
    for (const m of extra) if (!map.has(m.id)) map.set(m.id, m)
    return Array.from(map.values())
  }, [pending, extra])

  // Gate por `isDemo` (autoritativo del servidor), NO por el uid del cliente:
  // el store de auth se hidrata en el navegador, así que gatear por uid mostraba
  // "Inicia sesión" un instante (y en el HTML del servidor) a usuarios reales.
  if (isDemo) {
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

  /** Extrae el texto de error real de un PostgrestError (objeto plano) o Error. */
  function errText(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      return String((err as { message: unknown }).message ?? '')
    }
    return typeof err === 'string' ? err : ''
  }

  async function createMission(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    if (!uid) {
      setErrorMsg('Cargando tu sesión… espera un segundo e inténtalo de nuevo.')
      return
    }
    setCreating(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase
        .from('missions')
        .insert({
          user_id: uid,
          title: clean,
          project: project.trim() || null,
          estimated_minutes: minutes,
          status: 'pending',
          source: 'user',
        })
        .select('*')
        .single()
      if (error) throw error
      // Aparece de inmediato en "Apagadas".
      if (data) setExtra((x) => [...x, data as Mission])
      setTitle('')
      setProject('')
      setMinutes(25)
      toast.success('Misión añadida')
      router.refresh()
    } catch (err) {
      const msg = isDbSetupError(err)
        ? DB_SETUP_MSG
        : errText(err) || 'No se pudo crear la misión. Inténtalo de nuevo.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  async function activateMission(id: string) {
    setBusyId(id)
    setErrorMsg(null)
    try {
      // RPC atómica: apaga la activa anterior y enciende esta en el backend.
      const { error } = await supabase.rpc('activate_mission', { p_mission: id })
      if (error) throw error
      setExtra((x) => x.filter((m) => m.id !== id))
      toast.success('Misión encendida 🔥')
      router.refresh()
    } catch (err) {
      const msg = isDbSetupError(err) ? DB_SETUP_MSG : errText(err) || 'No se pudo encender la misión.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setBusyId(null)
    }
  }

  // Nota: completar una misión (con quiz de cierre) ocurre en /hoy, no aquí.
  // Esta pantalla solo crea/enciende/borra; "Ir a forjar" lleva al dashboard.

  async function deleteMission(id: string) {
    setBusyId(id)
    setErrorMsg(null)
    try {
      const { error } = await supabase.from('missions').delete().eq('id', id)
      if (error) throw error
      setExtra((x) => x.filter((m) => m.id !== id))
      router.refresh()
    } catch (err) {
      const msg = isDbSetupError(err) ? DB_SETUP_MSG : errText(err) || 'No se pudo borrar la misión.'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setBusyId(null)
      setConfirmDeleteId(null)
    }
  }

  // Primer clic: arma la confirmación. Segundo clic (mismo id): borra de verdad.
  function handleDeleteClick(id: string) {
    if (confirmDeleteId === id) {
      void deleteMission(id)
    } else {
      setConfirmDeleteId(id)
    }
  }

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

        {/* Tiempos predefinidos (además del campo libre de minutos). */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const on = minutes === p.minutes
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setMinutes(p.minutes)}
                className={`rounded-full border px-3 py-1.5 font-forge text-xs font-semibold transition-colors ${
                  on
                    ? 'border-ember/50 bg-ember/10 text-ember'
                    : 'border-forge-line text-forge-ink-dim hover:text-forge-ink'
                }`}
              >
                {p.label} · {p.minutes}m
              </button>
            )
          })}
        </div>

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

        {/* Error persistente: se queda a la vista hasta el próximo intento. */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
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
        {pendingAll.length === 0 ? (
          <p className="text-sm text-forge-ink-dim">
            No hay misiones pendientes. Crea una arriba.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingAll.map((m) => {
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
                    onClick={() => handleDeleteClick(m.id)}
                    onBlur={() => setConfirmDeleteId((c) => (c === m.id ? null : c))}
                    disabled={busy}
                    aria-label={confirmDeleteId === m.id ? 'Confirmar borrado' : 'Borrar misión'}
                    className={`flex-shrink-0 rounded-full p-2 transition-colors disabled:opacity-40 ${
                      confirmDeleteId === m.id
                        ? 'bg-red-500/15 text-red-300 hover:text-red-200'
                        : 'text-forge-ink-faint hover:text-forge-ink'
                    }`}
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Historial completo de forjadas (todos los días) */}
      {history.length > 0 && (
        <section>
          <SectionLabel>Forjadas · historial ({history.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {history.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-forge border border-forge-line bg-forge-surface/50 p-4 opacity-80"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-metal/15">
                  <Check size={13} className="text-metal" strokeWidth={3} />
                </span>
                <p className="min-w-0 flex-1 truncate font-forge text-[15px] font-medium text-forge-ink-dim">
                  {m.title}
                </p>
                <span className="flex-shrink-0 font-num text-[12px] text-forge-ink-faint">
                  {shortDate(m.completed_at)}
                </span>
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
