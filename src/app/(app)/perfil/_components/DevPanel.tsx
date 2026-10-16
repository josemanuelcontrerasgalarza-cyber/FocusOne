'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Terminal, Gem, Flame, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CardHeader } from '@/components/ui/primitives'
import { confirm } from '@/components/ui/Overlay'
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

  async function reset() {
    const ok = await confirm({
      title: '¿Borrar tus datos de prueba?',
      description: 'Se eliminan tareas, puntos, mascota y reclamos de esta cuenta. No se puede deshacer.',
      confirmLabel: 'Borrar datos',
      destructive: true,
    })
    if (ok) run('reset', () => supabase.rpc('dev_reset'), 'Datos de prueba reseteados')
  }

  return (
    <Card as="section">
      <CardHeader
        eyebrow="Solo tu cuenta developer"
        title="Herramientas de developer"
        action={
          <Badge tone="accent">
            <Terminal size={11} /> DEV
          </Badge>
        }
      />
      <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <Link
          href="/dev"
          className="group flex items-center gap-3 rounded-control border border-line bg-raised p-3 transition-colors hover:border-line-strong"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-dim">
            <Terminal size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">Abrir consola</span>
            <span className="block text-xs text-ink-faint">Registros en vivo, diagnóstico y acciones</span>
          </span>
          <ChevronRight size={16} className="text-ink-faint transition-transform group-hover:translate-x-0.5" />
        </Link>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button
            onClick={() => run('pts', () => supabase.rpc('dev_add_points', { p_amount: 500 }), '+500 puntos')}
            disabled={busy !== null}
            loading={busy === 'pts'}
            icon={<Gem size={14} />}
          >
            +500 puntos
          </Button>
          <Button
            onClick={() => run('streak', () => supabase.rpc('dev_set_streak', { p_value: 30 }), 'Racha fijada a 30')}
            disabled={busy !== null}
            loading={busy === 'streak'}
            icon={<Flame size={14} />}
          >
            Racha a 30
          </Button>
          <Button variant="danger" onClick={reset} disabled={busy !== null} loading={busy === 'reset'} icon={<Trash2 size={14} />}>
            Resetear mis datos
          </Button>
        </div>
        <p className="mt-3 text-xs text-ink-faint">Estas acciones afectan solo a tus datos y se verifican en el servidor.</p>
      </div>
    </Card>
  )
}
