'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Terminal, RefreshCw, Trash2, Gem, Flame, Unlock, Database, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CardHeader, PageHeader, Skeleton } from '@/components/ui/primitives'
import { Modal, confirm } from '@/components/ui/Overlay'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { APP_VERSION } from '@/lib/changelog'

type LogKind = 'log' | 'info' | 'warn' | 'error'
interface LogLine {
  time: string
  kind: LogKind
  msg: string
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

const KIND_COLOR: Record<LogKind, string> = {
  log: 'text-ink-faint',
  info: 'text-info',
  warn: 'text-warning',
  error: 'text-danger',
}

export function DevConsole() {
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const isDemo = useAuthStore((s) => s.isDemo)

  const [logs, setLogs] = useState<LogLine[]>([])
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  // Diálogo numérico para "Fijar puntos / racha".
  const [ask, setAsk] = useState<'points' | 'streak' | null>(null)
  const [askValue, setAskValue] = useState('')
  const logEndRef = useRef<HTMLDivElement>(null)

  const pushLog = useCallback((kind: LogKind, msg: string) => {
    const d = new Date()
    const time = d.toTimeString().slice(0, 8)
    setLogs((l) => [...l.slice(-250), { time, kind, msg }])
  }, [])

  // Captura la consola del navegador y la muestra DENTRO de la app (útil en
  // móvil, donde no hay devtools). Restaura los métodos originales al salir.
  useEffect(() => {
    const methods: LogKind[] = ['log', 'info', 'warn', 'error']
    const original: Record<string, (...a: unknown[]) => void> = {}
    methods.forEach((m) => {
      original[m] = console[m] as (...a: unknown[]) => void
      console[m] = (...args: unknown[]) => {
        original[m](...args)
        pushLog(m, args.map(stringify).join(' '))
      }
    })
    const onError = (e: ErrorEvent) => pushLog('error', `${e.message} @ ${e.filename}:${e.lineno}`)
    const onRejection = (e: PromiseRejectionEvent) => pushLog('error', `Unhandled: ${stringify(e.reason)}`)
    const onOnline = () => setOnline(navigator.onLine)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOnline)
    setOnline(navigator.onLine)
    console.info('[DEV] Consola de desarrollador inicializada · acceso total')

    return () => {
      methods.forEach((m) => {
        console[m] = original[m] as typeof console.log
      })
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOnline)
    }
  }, [pushLog])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' })
  }, [logs])

  const loadSnapshot = useCallback(async () => {
    const { data, error } = await supabase.rpc('dev_snapshot')
    if (error) {
      console.error('[dev_snapshot]', error.message)
      return
    }
    setSnapshot(data as Record<string, unknown>)
    console.info('[dev_snapshot] OK', stringify(data))
  }, [])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  async function action(key: string, run: () => PromiseLike<{ error: unknown; data?: unknown }>, label: string) {
    setBusy(key)
    console.info(`[action] ${label}…`)
    try {
      const { error, data } = await run()
      if (error) throw error
      console.info(`[action] ${label} ✓`, data !== undefined ? stringify(data) : '')
      await loadSnapshot()
      router.refresh()
    } catch (err) {
      console.error(`[action] ${label} ✗`, err instanceof Error ? err.message : stringify(err))
    } finally {
      setBusy(null)
    }
  }

  const user = session?.user
  const provider =
    (user?.app_metadata?.provider as string | undefined) ?? (isDemo ? 'anonymous' : 'email')
  const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^https?:\/\//, '')

  const diag: [string, string][] = [
    ['app', `Kairo v${APP_VERSION}`],
    ['user_id', user?.id ?? '—'],
    ['email', user?.email ?? '—'],
    ['provider', provider],
    ['role', 'developer'],
    ['db_host', supabaseHost || '—'],
    ['red', online ? 'online' : 'offline'],
  ]

  async function resetAll() {
    const ok = await confirm({
      title: '¿Borrar todos tus datos de prueba?',
      description: 'Se eliminan tareas, puntos, mascota y reclamos de tu cuenta developer. No se puede deshacer.',
      confirmLabel: 'Resetear datos',
      destructive: true,
    })
    if (ok) action('reset', () => supabase.rpc('dev_reset'), 'Reset total')
  }

  function submitNumber(e: React.FormEvent) {
    e.preventDefault()
    if (!ask) return
    const v = Math.round(Number(askValue))
    if (!Number.isFinite(v)) return
    const kind = ask
    setAsk(null)
    if (kind === 'points') action('setpts', () => supabase.rpc('dev_set_points', { p_value: v }), `Puntos = ${v}`)
    else action('streak', () => supabase.rpc('dev_set_streak', { p_value: v }), `Racha = ${v}`)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        eyebrow="Solo tu cuenta developer"
        title="Consola"
        description="Diagnóstico, datos y registros en vivo. Todo afecta solo a tus datos y se verifica en el servidor con is_dev()."
        actions={
          <Badge tone={online ? 'success' : 'danger'}>
            <span className={clsx('h-1.5 w-1.5 rounded-full', online ? 'bg-success' : 'bg-danger')} />
            {online ? 'En línea' : 'Sin conexión'}
          </Badge>
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* Diagnóstico */}
        <Card as="section">
          <CardHeader eyebrow="Entorno" title={<span className="inline-flex items-center gap-2"><Cpu size={15} className="text-ink-dim" /> Diagnóstico</span>} />
          <dl className="px-4 pb-4 pt-2 font-mono text-[12.5px] sm:px-5">
            {diag.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-0">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="truncate text-ink" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Snapshot de datos */}
        <Card as="section">
          <CardHeader
            eyebrow="Base de datos"
            title={<span className="inline-flex items-center gap-2"><Database size={15} className="text-ink-dim" /> Snapshot de tus datos</span>}
            action={
              <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={() => loadSnapshot()}>
                Recargar
              </Button>
            }
          />
          {snapshot ? (
            <dl className="grid grid-cols-1 gap-x-6 px-4 pb-4 pt-2 font-mono text-[12.5px] min-[420px]:grid-cols-2 sm:px-5">
              {Object.entries(snapshot).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 border-b border-line py-1.5">
                  <dt className="truncate text-ink-faint" title={k}>
                    {k}
                  </dt>
                  <dd className="text-ink">{stringify(v)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="space-y-2 px-4 pb-5 pt-2 sm:px-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}
        </Card>
      </div>

      {/* Acciones */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Button loading={busy === 'grant'} onClick={() => action('grant', () => supabase.rpc('dev_grant_all'), 'Desbloquear todo')} icon={<Unlock size={14} />}>
          Desbloquear todo
        </Button>
        <Button loading={busy === 'pts'} onClick={() => action('pts', () => supabase.rpc('dev_add_points', { p_amount: 500 }), '+500 puntos')} icon={<Gem size={14} />}>
          +500 puntos
        </Button>
        <Button
          loading={busy === 'setpts'}
          onClick={() => {
            setAskValue('9999')
            setAsk('points')
          }}
          icon={<Gem size={14} />}
        >
          Fijar puntos
        </Button>
        <Button
          loading={busy === 'streak'}
          onClick={() => {
            setAskValue('30')
            setAsk('streak')
          }}
          icon={<Flame size={14} />}
        >
          Fijar racha
        </Button>
        <Button loading={busy === 'snap'} onClick={() => action('snap', async () => ({ error: null }), 'Refrescar')} icon={<RefreshCw size={14} />}>
          Refrescar
        </Button>
        <Button variant="danger" loading={busy === 'reset'} onClick={resetAll} icon={<Trash2 size={14} />}>
          Resetear datos
        </Button>
      </div>

      {/* Consola / registros en vivo */}
      <Card as="section" className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 sm:px-5">
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Terminal size={14} className="text-ink-dim" /> Registros en vivo
            <span className="font-mono text-[11px] font-normal text-ink-faint">{logs.length}</span>
          </p>
          <Button size="sm" variant="ghost" onClick={() => setLogs([])}>
            Limpiar
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto bg-sunken px-4 py-3 font-mono text-[12px] leading-relaxed sm:px-5" role="log" aria-live="polite">
          {logs.length === 0 ? (
            <p className="text-ink-faint">Sin registros todavía.</p>
          ) : (
            logs.map((l, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="shrink-0 text-ink-faint">{l.time}</span>
                <span className={clsx('w-10 shrink-0 uppercase', KIND_COLOR[l.kind])}>{l.kind}</span>
                <span className="break-all text-ink-dim">{l.msg}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </Card>

      <Modal
        open={ask !== null}
        onClose={() => setAsk(null)}
        size="sm"
        title={ask === 'points' ? 'Fijar puntos' : 'Fijar racha'}
        description={ask === 'points' ? 'Nuevo saldo de puntos de tu cuenta.' : 'Nueva racha actual, en días.'}
      >
        <form onSubmit={submitNumber} className="flex flex-col gap-3 pb-2">
          <label htmlFor="dev-number" className="sr-only">
            Valor
          </label>
          <input
            id="dev-number"
            type="number"
            inputMode="numeric"
            min={0}
            value={askValue}
            onChange={(e) => setAskValue(e.target.value)}
            className="k-input font-mono"
            data-autofocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAsk(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Aplicar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
