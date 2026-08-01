'use client'

import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Flame, Trophy, CheckCircle2, Star, Zap, Target, Timer, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { HoloStat } from '@/glass/HoloStat'
import { useAuthStore } from '@/store/authStore'
import { useFocusStore } from '@/store/focusStore'
import { supabase } from '@/lib/supabase'
import { type DailyStat } from '@/types'

function fmtMins(m: number) {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`
}

function Stats() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<DailyStat[]>([])
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const { sessions, stats: focus, fetchSessions } = useFocusStore()

  useEffect(() => {
    if (!user?.id) return
    fetchSessions(user.id)
    const from = format(subDays(new Date(), 13), 'yyyy-MM-dd')
    supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', from)
      .order('date', { ascending: true })
      .then(({ data }) => setStats(data ?? []))
  }, [user?.id, fetchSessions])

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const stat = stats.find((s) => s.date === date)
    return { date, count: stat?.tasks_completed ?? 0 }
  })

  const max = Math.max(1, ...days.map((d) => d.count))
  const total = days.reduce((acc, d) => acc + d.count, 0)
  const average = total / 14
  const avgPercent = Math.max(2, (average / max) * 100)

  const bestDay = days.reduce((best, d) => (d.count > best.count ? d : best), days[0])
  const activeDays = days.filter((d) => d.count > 0).length

  const achievements = [
    {
      icon: <Star size={16} />,
      label: 'Mejor día',
      value:
        bestDay.count > 0
          ? `${bestDay.count} tareas — ${format(new Date(bestDay.date + 'T12:00:00'), 'd MMM', { locale: es })}`
          : 'Sin datos aún',
      accent: 'solar',
    },
    {
      icon: <Zap size={16} />,
      label: 'Días activos (14d)',
      value: `${activeDays} / 14`,
      accent: 'plasma',
    },
    {
      icon: <Target size={16} />,
      label: 'Promedio diario (14d)',
      value: `${average.toFixed(1)} tareas`,
      accent: 'core',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
          Telemetría
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Tu <span className="text-gradient">rendimiento</span>
        </h1>
      </header>

      {/* Stats principales */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <HoloStat
          label="Racha actual"
          value={`${user?.streak_current ?? 0}d`}
          icon={<Flame size={16} />}
          accent="solar"
        />
        <HoloStat
          label="Mejor racha"
          value={`${user?.streak_best ?? 0}d`}
          icon={<Trophy size={16} />}
          accent="plasma"
          delay={0.05}
        />
        <HoloStat
          label="Total completadas"
          value={user?.tasks_completed_total ?? 0}
          icon={<CheckCircle2 size={16} />}
          accent="core"
          delay={0.1}
        />
      </div>

      {/* Chart de barras */}
      <GlassPanel className="p-6" delay={0.15}>
        <p className="font-data text-[11px] uppercase tracking-[0.25em] text-ink-ghost">
          Objetivos completados — últimos 14 días
        </p>

        <div className="relative mt-6">
          {/* Línea de promedio */}
          {average > 0 && (
            <div
              className="pointer-events-none absolute left-0 right-0 flex items-center gap-2"
              style={{ bottom: `calc(${avgPercent}% + 24px)` }}
            >
              <div className="h-px flex-1 border-t border-dashed border-solar/40" />
              <span className="font-data text-[9px] uppercase tracking-wider text-solar/70">
                media
              </span>
            </div>
          )}

          {/* Barras */}
          <div className="flex h-52 items-end gap-1.5">
            {days.map((d, idx) => {
              const isHovered = hoveredDay === idx
              const heightPct = Math.max(4, (d.count / max) * 100)
              return (
                <div
                  key={d.date}
                  className="relative flex flex-1 flex-col items-center gap-2"
                  onMouseEnter={() => setHoveredDay(idx)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Tooltip */}
                  <AnimatePresence>
                    {isHovered && d.count > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-md border border-core/30 bg-void/95 px-2 py-0.5 font-data text-[10px] text-core shadow-glow-core"
                      >
                        {d.count}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Barra */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      delay: 0.2 + idx * 0.04,
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                    }}
                    style={{
                      height: `${heightPct}%`,
                      transformOrigin: 'bottom',
                    }}
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      d.count > 0
                        ? isHovered
                          ? 'plasma-fill opacity-100 shadow-glow-core'
                          : 'plasma-fill opacity-75'
                        : isHovered
                          ? 'bg-white/10'
                          : 'bg-white/5'
                    }`}
                  />

                  {/* Etiqueta día */}
                  <span
                    className={`font-data text-[9px] uppercase transition-colors ${
                      isHovered ? 'text-core' : 'text-ink-ghost'
                    }`}
                  >
                    {format(new Date(d.date + 'T12:00:00'), 'EEE', { locale: es }).slice(0, 2)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Eje X — fechas inicio y fin */}
          <div className="mt-1 flex justify-between px-0.5">
            <span className="font-data text-[9px] text-ink-ghost">
              {format(new Date(days[0].date + 'T12:00:00'), 'd MMM', { locale: es })}
            </span>
            <span className="font-data text-[9px] text-ink-ghost">
              {format(new Date(days[13].date + 'T12:00:00'), 'd MMM', { locale: es })}
            </span>
          </div>
        </div>
      </GlassPanel>

      {/* Deep Work — historial de foco */}
      <div className="flex flex-col gap-3">
        <p className="font-data text-[10px] uppercase tracking-[0.3em] text-ink-ghost">
          Deep Work
        </p>
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <HoloStat label="Foco hoy" value={fmtMins(focus.todayMinutes)} icon={<Timer size={16} />} accent="core" />
          <HoloStat label="Esta semana" value={fmtMins(focus.weekMinutes)} icon={<Timer size={16} />} accent="plasma" delay={0.05} />
          <HoloStat label="Total" value={fmtMins(focus.totalMinutes)} icon={<Timer size={16} />} accent="solar" delay={0.1} sublabel={`${focus.totalSessions} sesiones`} />
        </div>

        {sessions.length > 0 && (
          <GlassPanel className="p-5" delay={0.15}>
            <div className="mb-3 flex items-center gap-2 text-ink-ghost">
              <History size={14} />
              <p className="font-data text-[11px] uppercase tracking-[0.25em]">Sesiones recientes</p>
            </div>
            <div className="flex flex-col divide-y divide-glass-border">
              {sessions.slice(0, 6).map((s) => {
                const mins = s.ended_at
                  ? Math.max(1, Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000))
                  : s.planned_minutes
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${s.completed ? 'bg-core shadow-glow-core' : 'bg-ink-ghost'}`}
                    />
                    <span className="flex-1 font-data text-xs text-ink-dim">
                      {format(new Date(s.started_at), "d MMM · HH:mm", { locale: es })}
                    </span>
                    <span className="font-data text-xs text-ink-ghost">
                      {s.completed ? 'Completada' : 'Abortada'}
                    </span>
                    <span className="font-data text-sm font-semibold text-core">{fmtMins(mins)}</span>
                  </div>
                )
              })}
            </div>
          </GlassPanel>
        )}
      </div>

      {/* Sección logros personales */}
      <div className="flex flex-col gap-2">
        <p className="font-data text-[10px] uppercase tracking-[0.3em] text-ink-ghost">
          Logros personales
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {achievements.map((a, i) => (
            <GlassPanel
              key={a.label}
              className={`card-accent-${a.accent} p-4`}
              delay={0.2 + i * 0.05}
            >
              <div
                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${
                  a.accent === 'solar'
                    ? 'bg-solar/10 text-solar'
                    : a.accent === 'plasma'
                      ? 'bg-plasma/10 text-[#c4b5fd]'
                      : 'bg-core/10 text-core'
                }`}
              >
                {a.icon}
              </div>
              <p className="font-data text-[9px] uppercase tracking-wider text-ink-ghost">
                {a.label}
              </p>
              <p className="mt-0.5 font-display text-sm font-semibold">{a.value}</p>
            </GlassPanel>
          ))}
        </div>
      </div>
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
