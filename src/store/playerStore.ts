import { create } from 'zustand'

export interface PlayerTrack {
  id: string
  title: string
  artist: string
  artwork: string | null
  duration: number
  streamUrl: string
}

interface PlayerState {
  queue: PlayerTrack[]
  idx: number
  playing: boolean
  time: number
  dur: number
  label: string
  current: () => PlayerTrack | null
  /** Carga una cola y empieza a reproducir desde startIdx. */
  setQueue: (tracks: PlayerTrack[], startIdx: number, label?: string) => void
  playAt: (i: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  setPlaying: (v: boolean) => void
  setTime: (t: number) => void
  setDur: (d: number) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  idx: -1,
  playing: false,
  time: 0,
  dur: 0,
  label: '',
  current: () => {
    const { queue, idx } = get()
    return idx >= 0 && idx < queue.length ? queue[idx] : null
  },
  setQueue: (tracks, startIdx, label = '') =>
    set({ queue: tracks, idx: startIdx, playing: true, time: 0, dur: 0, label }),
  playAt: (i) => set({ idx: i, playing: true, time: 0 }),
  toggle: () => set((s) => ({ playing: s.idx >= 0 ? !s.playing : s.playing })),
  next: () =>
    set((s) => {
      if (!s.queue.length) return {}
      const base = s.idx < 0 ? 0 : s.idx
      return { idx: (base + 1) % s.queue.length, playing: true, time: 0 }
    }),
  prev: () =>
    set((s) => {
      if (!s.queue.length) return {}
      const base = s.idx < 0 ? 0 : s.idx
      return { idx: (base - 1 + s.queue.length) % s.queue.length, playing: true, time: 0 }
    }),
  setPlaying: (v) => set({ playing: v }),
  setTime: (t) => set({ time: t }),
  setDur: (d) => set({ dur: d }),
}))
