import { useState, useEffect } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '../hooks/useAuth'
import { StatsPanel } from '../components/features/stats/StatsPanel'
import { supabase } from '../lib/supabase'
import { type DailyStat } from '../types'

export function StatsPage() {
  const { user } = useAuth()
  const [weekData, setWeekData] = useState<{ day: string; tareas: number }[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [bestDay, setBestDay] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    loadStats()
  }, [user?.id])

  const loadStats = async () => {
    setLoading(true)
    const today = new Date()
    const sevenDaysAgo = subDays(today, 6)

    const { data } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user!.id)
      .gte('date', format(sevenDaysAgo, 'yyyy-MM-dd'))
      .order('date', { ascending: true })

    const statsMap = new Map<string, number>()
    ;(data as DailyStat[] ?? []).forEach(s => {
      statsMap.set(s.date, s.tasks_completed)
    })

    const todayStr = format(today, 'yyyy-MM-dd')
    setTodayCount(statsMap.get(todayStr) ?? 0)

    const week = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i)
      const dateStr = format(date, 'yyyy-MM-dd')
      return {
        day: format(date, 'EEE', { locale: es }),
        tareas: statsMap.get(dateStr) ?? 0,
      }
    })
    setWeekData(week)

    // Mejor día histórico
    const { data: allStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user!.id)
      .order('tasks_completed', { ascending: false })
      .limit(1)

    if (allStats && allStats.length > 0) {
      const best = allStats[0] as DailyStat
      setBestDay(format(parseISO(best.date), 'EEEE d MMM', { locale: es }))
    }

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Estadísticas</h1>
        <p className="text-sm text-text-muted mt-0.5">Tu progreso en el tiempo</p>
      </div>
      <StatsPanel
        user={user}
        weekData={weekData}
        todayCount={todayCount}
        bestDay={bestDay}
        loading={loading}
      />
    </div>
  )
}
