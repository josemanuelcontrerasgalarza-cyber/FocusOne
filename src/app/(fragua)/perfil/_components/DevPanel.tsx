'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Terminal, Gem, Flame, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

/**
 * Panel de herramientas para la cuenta DEVELOPER (solo se renderiza si
 * isDeveloper). Cada acción llama a una RPC SECURITY DEFINER que a su vez
 * verifica is_dev() en el servidor: aunque alguien montara este panel a mano,
 * las RPC rechazan a las cuentas normales.
 */
export function DevPanel() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function run(key: string, fn: () => PromiseLike<{ error: unknown }>, okMsg: string) {
    setBusy(key)
    try {
      const { error } = await fn()
      if (error) throw error
      toast.success(okMsg)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo ejecutar')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-forge border border-ember/40 bg-ember/[0.04] p-5">
      <div className="mb-4 flex items-center gap-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-ember">
        <Terminal size={13} /> Herramientas de developer
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={() => run('pts', () => supabase.rpc('dev_add_points', { p_amount: 500 }), '+500 puntos')}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-forge border border-forge-line bg-forge-surface px-3 py-2.5 font-forge text-sm font-semibold text-forge-ink transition-colors hover:border-ember/50 disabled:opacity-50"
        >
          {busy === 'pts' ? <Loader2 size={14} className="animate-spin" /> : <Gem size={14} className="text-ember" />}
          +500 puntos
        </button>

        <button
          onClick={() => run('streak', () => supabase.rpc('dev_set_streak', { p_value: 30 }), 'Racha fijada a 30')}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-forge border border-forge-line bg-forge-surface px-3 py-2.5 font-forge text-sm font-semibold text-forge-ink transition-colors hover:border-ember/50 disabled:opacity-50"
        >
          {busy === 'streak' ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} className="text-metal" />}
          Racha a 30
        </button>

        <button
          onClick={() => {
            if (!confirm('¿Borrar TODOS tus datos de prueba (misiones, puntos, mascota, reclamos)? No se puede deshacer.')) return
            run('reset', () => supabase.rpc('dev_reset'), 'Datos de prueba reseteados')
          }}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 rounded-forge border border-red-500/40 bg-red-500/[0.06] px-3 py-2.5 font-forge text-sm font-semibold text-red-300 transition-colors hover:border-red-500/60 disabled:opacity-50"
        >
          {busy === 'reset' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Resetear mis datos
        </button>
      </div>
      <p className="mt-3 text-[12px] text-forge-ink-faint">
        Solo visible para tu cuenta developer. Estas acciones afectan únicamente tus datos.
      </p>
    </section>
  )
}
