'use client'

import { create } from 'zustand'
import type { TaskInput } from '@/lib/kairo/types'

const SIDEBAR_KEY = 'kairo:sidebar'

interface UIState {
  paletteOpen: boolean
  captureOpen: boolean
  captureDefaults: Partial<TaskInput> | null
  shortcutsOpen: boolean
  mobileNavOpen: boolean
  sidebarCollapsed: boolean
  /** id de la tarea abierta en el cajón de detalle (global) */
  taskId: string | null

  setPalette: (v: boolean) => void
  openCapture: (defaults?: Partial<TaskInput>) => void
  closeCapture: () => void
  setShortcuts: (v: boolean) => void
  setMobileNav: (v: boolean) => void
  toggleSidebar: () => void
  initSidebar: () => void
  openTask: (id: string | null) => void
}

export const useUI = create<UIState>((set, get) => ({
  paletteOpen: false,
  captureOpen: false,
  captureDefaults: null,
  shortcutsOpen: false,
  mobileNavOpen: false,
  sidebarCollapsed: false,
  taskId: null,

  setPalette: (v) => set({ paletteOpen: v }),
  openCapture: (defaults) => set({ captureOpen: true, captureDefaults: defaults ?? null, paletteOpen: false }),
  closeCapture: () => set({ captureOpen: false, captureDefaults: null }),
  setShortcuts: (v) => set({ shortcutsOpen: v }),
  setMobileNav: (v) => set({ mobileNavOpen: v }),
  toggleSidebar: () => {
    const v = !get().sidebarCollapsed
    set({ sidebarCollapsed: v })
    try {
      localStorage.setItem(SIDEBAR_KEY, v ? '1' : '0')
    } catch {}
  },
  initSidebar: () => {
    try {
      set({ sidebarCollapsed: localStorage.getItem(SIDEBAR_KEY) === '1' })
    } catch {}
  },
  openTask: (id) => set({ taskId: id, paletteOpen: false }),
}))
