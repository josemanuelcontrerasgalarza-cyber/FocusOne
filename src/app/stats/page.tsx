'use client'

import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Flame, Trophy, CheckCircle2 } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { HoloStat } from '@/glass/HoloStat'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { type DailyStat } from '@/types'

function Stats() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<DailyStat[]>([])

  useEffect(() => {
    if (!user?.id) return
    const from = format(subDays(new Date(), 13), 'yyyy-MM-dd')
    supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .order('date', { ascending: true })
      .then(({ data }) => setStats(data ?? []))
  }, [user?.id])

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const stat = stats.find((s) => s.date === date)
    return { date, count: stat?.tasks_completed ?? 0 }
  })
  const max = Math.max(1, ...days.map((d) => d.count))

  return (
    <div className="flex flex-col gap-5">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
          Telemetría
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Tu rendimiento</h1>
      </header>

      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <HoloStat label="Racha actual" value={`${user?.streak_current ?? 0}d`} icon={<Flame size={16} />} accent="solar" />
        <HoloStat label="Mejor racha" value={`${user?.streak_best ?? 0}d`} icon={<Trophy size={16} />} accent="plasma" delay={0.05} />
        <HoloStat label="Total completadas" value={user?.tasks_completed_total ?? 0} icon={<CheckCircle2 size={16} />} accent="core" delay={0.1} />
      </div>

      <GlassPanel className="p-6" delay={0.15}>
        <p className="font-data text-[11px] uppercase tracking-[0.25em] text-ink-ghost">
          Objetivos completados — últimos 14 días
        </p>
        <div className="mt-6 flex h-40 items-end gap-1.5">
          {days.map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center gap-2">
              <span className="font-data text-[10px] text-ink-ghost opacity-0 transition-opacity group-hover:opacity-100">
                {d.count}
              </span>
              <div
                className={`w-full rounded-t-md transition-all ${
                  d.count > 0 ? 'plasma-fill shadow-glow-core' : 'bg-white/5'
                }`}
                style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
              />
              <span className="font-data text-[9px] uppercase text-ink-ghost">
                {format(new Date(d.date + 'T12:00:00'), 'EE', { locale: es }).slice(0, 2)}
              </span>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  )
}

export default function StatsPage() {
  return (
    <AppShell>
      <Stats />
    </AppShell>
  )
}
