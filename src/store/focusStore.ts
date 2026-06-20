import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { type FocusSession } from '@/types'

interface FocusStats {
  totalMinutes: number
  totalSessions: number
  todayMinutes: number
  weekMinutes: number
}

interface FocusState {
  sessions: FocusSession[]
  stats: FocusStats
  loading: boolean
  fetchSessions: (userId: string) => Promise<void>
}

const EMPTY: FocusStats = { totalMinutes: 0, totalSessions: 0, todayMinutes: 0, weekMinutes: 0 }

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Historial de sesiones de Deep Work. Tolerante a que la tabla focus_sessions
 * aún no exista (degrada a vacío sin romper la app).
 */
export const useFocusStore = create<FocusState>((set) => ({
  sessions: [],
  stats: EMPTY,
  loading: false,

  fetchSessions: async (userId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(100)

    if (error || !data) {
      set({ sessions: [], stats: EMPTY, loading: false })
      return
    }

    const today = startOfToday().getTime()
    const weekAgo = today - 6 * 24 * 60 * 60 * 1000
    let totalMinutes = 0
    let todayMinutes = 0
    let weekMinutes = 0

    for (const s of data as FocusSession[]) {
      // Minutos reales si terminó; si no, los planeados
      const mins = s.ended_at
        ? Math.max(0, Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000))
        : s.planned_minutes
      totalMinutes += mins
      const startMs = new Date(s.started_at).getTime()
      if (startMs >= today) todayMinutes += mins
      if (startMs >= weekAgo) weekMinutes += mins
    }

    set({
      sessions: data as FocusSession[],
      stats: { totalMinutes, totalSessions: data.length, todayMinutes, weekMinutes },
      loading: false,
    })
  },
}))
