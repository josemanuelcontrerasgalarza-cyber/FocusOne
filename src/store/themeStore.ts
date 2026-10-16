'use client'

import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
const KEY = 'kairo:theme'

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {}
  return 'system'
}

function apply(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

interface ThemeState {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  init: () => () => void
  setMode: (m: ThemeMode) => void
}

/** Tema de la interfaz. El script de <head> ya aplicó la clase antes de pintar. */
export const useTheme = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: 'light',
  init: () => {
    const mode = readStored()
    apply(mode)
    set({ mode, resolved: document.documentElement.classList.contains('dark') ? 'dark' : 'light' })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (get().mode === 'system') {
        apply('system')
        set({ resolved: mq.matches ? 'dark' : 'light' })
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  },
  setMode: (mode) => {
    try {
      localStorage.setItem(KEY, mode)
    } catch {}
    apply(mode)
    set({ mode, resolved: document.documentElement.classList.contains('dark') ? 'dark' : 'light' })
  },
}))
