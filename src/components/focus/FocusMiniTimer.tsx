'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { formatClock, remainingSec, type TimerState } from '@/lib/kairo/focusTimer'
import { BEAT_MS, FOCUS_KEY, readFocus, writeFocus } from './storage'

const GAP_MS = 90_000

/**
 * Indicador compacto de la sesión en curso para el resto de pantallas (fuera
 * de /enfoque). Mantiene el latido mientras sigues dentro de la app, así la
 * sesión continúa al volver a Enfoque. Si ya hubo un hueco largo, no late:
 * esa decisión ("Estuviste fuera") la toma la página de Enfoque.
 *
 * Pensado para montarse una vez en el shell (AppShell, vistas no inmersivas).
 */
export function FocusMiniTimer({ className }: { className?: string }) {
  const pathname = usePathname()
  const onFocusPage = pathname.startsWith('/enfoque')
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (onFocusPage) return
    const sync = () => setTimer(readFocus().timer)
    sync()
    const onStorage = (e: StorageEvent) => e.key === FOCUS_KEY && sync()
    window.addEventListener('storage', onStorage)
    const id = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      const s = readFocus()
      const t = s.timer
      setTimer(t)
      if (!t || t.pausedAt) return
      // Solo se late si la pantalla seguía abierta (sin hueco) y queda tiempo.
      if (n - t.lastBeat > GAP_MS || remainingSec(t, n) <= 0) return
      if (n - t.lastBeat >= BEAT_MS) writeFocus({ ...s, timer: { ...t, lastBeat: n } })
    }, 1000)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('storage', onStorage)
    }
  }, [onFocusPage])

  if (onFocusPage || !timer) return null
  const left = remainingSec(timer, now)
  const label = timer.phase === 'focus' ? 'Enfoque' : 'Descanso'
  const status = timer.pausedAt ? 'En pausa' : left <= 0 ? 'Terminado' : formatClock(left)

  return (
    <Link
      href="/enfoque"
      aria-label={`${label}: ${status}. Volver al modo enfoque`}
      className={clsx(
        'inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-dim transition-colors hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      <span
        className={clsx('h-1.5 w-1.5 rounded-full', timer.pausedAt ? 'bg-ink-faint' : timer.phase === 'focus' ? 'bg-accent-fg' : 'bg-ink-dim')}
        aria-hidden
      />
      <span className="hidden sm:inline">{label}</span>
      <span className="font-mono text-ink">{status}</span>
    </Link>
  )
}
