import { create } from 'zustand'

export type KratosState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'celebrating'

interface CosmosState {
  kratosState: KratosState
  voiceLevel: number
  focusActive: boolean
  setKratosState: (s: KratosState) => void
  setVoiceLevel: (v: number) => void
  setFocusActive: (v: boolean) => void
  celebrate: () => void
}

let celebrationTimer: ReturnType<typeof setTimeout> | null = null

export const useCosmos = create<CosmosState>((set, get) => ({
  kratosState: 'idle',
  voiceLevel: 0,
  focusActive: false,
  setKratosState: (kratosState) => set({ kratosState }),
  setVoiceLevel: (voiceLevel) => set({ voiceLevel }),
  setFocusActive: (focusActive) => set({ focusActive }),
  celebrate: () => {
    const previous = get().focusActive ? 'listening' : 'idle'
    set({ kratosState: 'celebrating' })
    if (celebrationTimer) clearTimeout(celebrationTimer)
    celebrationTimer = setTimeout(() => set({ kratosState: previous as KratosState }), 2600)
  },
}))
