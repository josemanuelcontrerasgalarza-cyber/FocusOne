'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { activeSkips, addSkip, removeSkip, type SkipState } from '@/lib/kairo/skips'
import { toDateKey } from '@/lib/kairo/dates'

/**
 * Tareas apartadas hoy con «Ahora no». Vive en este navegador (localStorage):
 * es una preferencia momentánea, no un dato que deba sincronizarse.
 */
const KEY = 'kairo:skips:v1'

interface SkipStore {
  state: SkipState
  hydrated: boolean
  hydrate: () => void
  skip: (id: string) => void
  unskip: (id: string) => void
  reset: () => void
}

const today = () => toDateKey(new Date())

function save(state: SkipState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* sin almacenamiento: funciona igual durante la visita */
  }
}

export const useSkipStore = create<SkipStore>((set, get) => ({
  state: { date: '', ids: [] },
  hydrated: false,
  hydrate() {
    if (get().hydrated) return
    let stored: unknown = null
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    } catch {
      stored = null
    }
    const d = today()
    set({ state: { date: d, ids: activeSkips(stored, d) }, hydrated: true })
  },
  skip(id) {
    const next = addSkip(get().state, id, today())
    set({ state: next })
    save(next)
  },
  unskip(id) {
    const next = removeSkip(get().state, id, today())
    set({ state: next })
    save(next)
  },
  reset() {
    const next = { date: today(), ids: [] }
    set({ state: next })
    save(next)
  },
}))

/** Ids apartados vigentes para `day` (se vacían solos al cambiar el día). */
export function useSkippedToday(day: string): string[] {
  const hydrate = useSkipStore((s) => s.hydrate)
  const state = useSkipStore((s) => s.state)
  useEffect(() => hydrate(), [hydrate])
  return state.date === day ? state.ids : []
}
