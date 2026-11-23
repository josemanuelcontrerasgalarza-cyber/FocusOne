'use client'

import { useCallback, useEffect, useState } from 'react'
import { addSkip, readSkips, removeSkip, type SkipState } from '@/lib/kairo/skips'

const KEY = 'kairo:skip:v1'

function load(today: string): string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? readSkips(JSON.parse(raw), today) : []
  } catch {
    return []
  }
}

function save(state: SkipState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Sin almacenamiento (modo privado): «Ahora no» funciona solo en esta visita.
  }
}

/**
 * Tareas apartadas con «Ahora no» en «Tu siguiente movimiento». Se guardan en
 * este navegador y caducan solas al cambiar de día.
 */
export function useSkippedMoves(today: string) {
  const [ids, setIds] = useState<string[]>([])

  // Se lee tras montar (evita desajustes de hidratación) y al cambiar de día.
  useEffect(() => {
    setIds(load(today))
  }, [today])

  const apply = useCallback((state: SkipState) => {
    save(state)
    setIds(state.ids)
  }, [])

  const skip = useCallback((id: string) => apply(addSkip(load(today), id, today)), [apply, today])
  const unskip = useCallback((id: string) => apply(removeSkip(load(today), id, today)), [apply, today])
  const clear = useCallback(() => apply({ day: today, ids: [] }), [apply, today])

  return { skipped: ids, skip, unskip, clear }
}
