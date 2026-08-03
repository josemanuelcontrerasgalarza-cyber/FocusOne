'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Terminal, RefreshCw, Trash2, Gem, Flame, Unlock, Loader2, Database, Cpu } from 'lucide-react'
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
  log: 'text-forge-ink-dim',
  info: 'text-metal',
  warn: 'text-yellow-400',
  error: 'text-red-400',
}

export function DevConsole() {
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const isDemo = useAuthStore((s) => s.isDemo)

  const [logs, setLogs] = useState<LogLine[]>([])
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
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
    ['app', `FocusOne v${APP_VERSION}`],
    ['user_id', user?.id ?? '—'],
    ['email', user?.email ?? '—'],
    ['provider', provider],
    ['role', 'developer'],
    ['db_host', supabaseHost || '—'],
    ['red', online ? 'online' : 'offline'],
  ]

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 sm:px-8">
      <header className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-forge border border-ember/40 bg-ember/10">
          <Terminal size={18} className="text-ember" />
        </span>
        <div>
          <h1 className="font-forge text-2xl font-extrabold tracking-tight">Consola DEV</h1>
          <p className="font-num text-[11px] uppercase tracking-[0.18em] text-ember">
            acceso total · solo tu cuenta developer
          </p>
        </div>
      </header>

      {/* Diagnóstico */}
      <div className="rounded-forge border border-forge-line bg-forge-surface p-4">
        <div className="mb-3 flex items-center gap-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
          <Cpu size={13} /> Diagnóstico
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 font-num text-[13px] sm:grid-cols-2">
          {diag.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-forge-line/50 py-1">
              <span className="text-forge-ink-faint">{k}</span>
              <span className="truncate text-forge-ink" title={v}>
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot de datos */}
      <div className="rounded-forge border border-forge-line bg-forge-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
            <Database size={13} /> Snapshot de tus datos
          </div>
          <button
            onClick={() => loadSnapshot()}
            className="flex items-center gap-1.5 rounded-full border border-forge-line px-2.5 py-1 font-num text-[11px] text-forge-ink-dim hover:text-forge-ink"
          >
            <RefreshCw size={11} /> Recargar
          </button>
        </div>
        {snapshot ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-num text-[13px] sm:grid-cols-3">
            {Object.entries(snapshot).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 border-b border-forge-line/50 py-1">
                <span className="truncate text-forge-ink-faint" title={k}>
                  {k}
                </span>
                <span className="text-forge-ink">{stringify(v)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-num text-[13px] text-forge-ink-faint">Cargando…</p>
        )}
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <DevBtn busy={busy === 'grant'} onClick={() => action('grant', () => supabase.rpc('dev_grant_all'), 'Desbloquear todo')} icon={<Unlock size={14} className="text-ember" />}>
          Desbloquear todo
        </DevBtn>
        <DevBtn busy={busy === 'pts'} onClick={() => action('pts', () => supabase.rpc('dev_add_points', { p_amount: 500 }), '+500 puntos')} icon={<Gem size={14} className="text-ember" />}>
          +500 puntos
        </DevBtn>
        <DevBtn
          busy={busy === 'setpts'}
          onClick={() => {
            const v = Number(prompt('Fijar puntos a:', '9999'))
            if (Number.isFinite(v)) action('setpts', () => supabase.rpc('dev_set_points', { p_value: Math.round(v) }), `Puntos = ${v}`)
          }}
          icon={<Gem size={14} className="text-metal" />}
        >
          Fijar puntos
        </DevBtn>
        <DevBtn
          busy={busy === 'streak'}
          onClick={() => {
            const v = Number(prompt('Fijar racha a:', '30'))
            if (Number.isFinite(v)) action('streak', () => supabase.rpc('dev_set_streak', { p_value: Math.round(v) }), `Racha = ${v}`)
          }}
          icon={<Flame size={14} className="text-metal" />}
        >
          Fijar racha
        </DevBtn>
        <DevBtn busy={busy === 'snap'} onClick={() => action('snap', async () => ({ error: null }), 'Refrescar')} icon={<RefreshCw size={14} className="text-forge-ink-dim" />}>
          Refrescar
        </DevBtn>
        <DevBtn
          danger
          busy={busy === 'reset'}
          onClick={() => {
            if (confirm('¿Borrar TODOS tus datos de prueba? No se puede deshacer.')) {
              action('reset', () => supabase.rpc('dev_reset'), 'Reset total')
            }
          }}
          icon={<Trash2 size={14} />}
        >
          Resetear datos
        </DevBtn>
      </div>

      {/* Consola / logs en vivo */}
      <div className="overflow-hidden rounded-forge border border-forge-line bg-black/60">
        <div className="flex items-center justify-between border-b border-forge-line px-3 py-2">
          <div className="flex items-center gap-2 font-num text-[11px] font-semibold uppercase tracking-[0.14em] text-forge-ink-faint">
            <Terminal size={12} /> Consola en vivo ({logs.length})
          </div>
          <button
            onClick={() => setLogs([])}
            className="font-num text-[11px] text-forge-ink-faint hover:text-forge-ink"
          >
            limpiar
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto px-3 py-2 font-num text-[12px] leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-forge-ink-faint">Sin registros todavía…</p>
          ) : (
            logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-forge-ink-faint">{l.time}</span>
                <span className={`shrink-0 uppercase ${KIND_COLOR[l.kind]}`}>{l.kind}</span>
                <span className="break-all text-forge-ink-dim">{l.msg}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      <p className="text-center font-num text-[11px] text-forge-ink-faint">
        Todo lo de aquí afecta solo a tus datos y está verificado en el servidor con is_dev().
      </p>
    </section>
  )
}

function DevBtn({
  children,
  onClick,
  icon,
  busy,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  icon: React.ReactNode
  busy?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center justify-center gap-2 rounded-forge border px-3 py-2.5 font-forge text-[13px] font-semibold transition-colors disabled:opacity-50 ${
        danger
          ? 'border-red-500/40 bg-red-500/[0.06] text-red-300 hover:border-red-500/60'
          : 'border-forge-line bg-forge-surface text-forge-ink hover:border-ember/50'
      }`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
