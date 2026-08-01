'use client'

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Lock, Trophy } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { GlassPanel } from '@/glass/GlassPanel'
import { HoloStat } from '@/glass/HoloStat'
import { PlasmaBar } from '@/glass/PlasmaBar'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/store/projectStore'
import { useIdeaStore } from '@/store/ideaStore'
import { useFocusStore } from '@/store/focusStore'
import { computeAchievements } from '@/lib/achievements'
import { cn } from '@/lib/utils'

// Lookups con clases literales completas para que Tailwind no las purgue
// (las clases dinámicas tipo `card-accent-${x}` no las detecta el escáner).
const accentText = {
  core: 'text-core',
  plasma: 'text-[#c4b5fd]',
  solar: 'text-solar',
  nova: 'text-nova',
}
const accentBg = {
  core: 'bg-core/10',
  plasma: 'bg-plasma/10',
  solar: 'bg-solar/10',
  nova: 'bg-nova/10',
}
const accentCard = {
  core: 'card-accent-core',
  plasma: 'card-accent-plasma',
  solar: 'card-accent-solar',
  nova: 'card-accent-nova',
}
const accentBadge = {
  core: 'badge badge-core',
  plasma: 'badge badge-plasma',
  solar: 'badge badge-solar',
  nova: 'badge badge-nova',
}

function Achievements() {
  const user = useAuthStore((s) => s.user)
  const { projects, fetchProjects } = useProjectStore()
  const { ideas, fetchIdeas } = useIdeaStore()
  const { stats, fetchSessions } = useFocusStore()

  useEffect(() => {
    if (!user?.id) return
    if (projects.length === 0) fetchProjects(user.id)
    if (ideas.length === 0) fetchIdeas(user.id)
    fetchSessions(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const achievements = useMemo(
    () =>
      computeAchievements({
        streakBest: user?.streak_best ?? 0,
        tasksTotal: user?.tasks_completed_total ?? 0,
        projectsCompleted: user?.projects_completed_total ?? 0,
        focusMinutes: stats.totalMinutes,
        ideasCount: ideas.length,
      }),
    [user, stats.totalMinutes, ideas.length],
  )

  const unlocked = achievements.filter((a) => a.unlocked).length
  const pct = Math.round((unlocked / achievements.length) * 100)

  return (
    <div className="flex flex-col gap-6">
      <header className="mt-2">
        <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">Logros</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Tus <span className="text-gradient">insignias</span>
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Desbloquea recompensas avanzando en tus misiones y manteniendo la constancia.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <HoloStat label="Desbloqueados" value={`${unlocked}/${achievements.length}`} icon={<Trophy size={16} />} accent="solar" />
        <HoloStat label="Min. de foco" value={stats.totalMinutes} icon={<Trophy size={16} />} accent="core" delay={0.05} sublabel="Deep Work acumulado" />
        <HoloStat label="Progreso total" value={`${pct}%`} icon={<Trophy size={16} />} accent="plasma" delay={0.1} />
      </div>

      <GlassPanel className="p-5" delay={0.12}>
        <div className="flex items-center justify-between">
          <p className="font-data text-[11px] uppercase tracking-[0.25em] text-ink-ghost">
            Colección
          </p>
          <p className="font-data text-xs text-solar">{pct}% completado</p>
        </div>
        <PlasmaBar value={pct} className="mt-3" />
      </GlassPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a, i) => {
          const Icon = a.icon
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
            >
              <GlassPanel
                className={cn('p-5', a.unlocked ? accentCard[a.accent] : 'opacity-70')}
                tilt={a.unlocked}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-xl',
                      a.unlocked ? `${accentBg[a.accent]} ${accentText[a.accent]}` : 'bg-white/5 text-ink-ghost',
                      a.unlocked && 'shadow-glow-core',
                    )}
                  >
                    {a.unlocked ? <Icon size={20} /> : <Lock size={18} />}
                  </div>
                  {a.unlocked && <span className={accentBadge[a.accent]}>Logrado</span>}
                </div>
                <p className={cn('mt-3 font-display text-base font-semibold', !a.unlocked && 'text-ink-dim')}>
                  {a.title}
                </p>
                <p className="mt-0.5 text-xs text-ink-ghost">{a.desc}</p>
                {!a.unlocked && (
                  <div className="mt-3">
                    <PlasmaBar value={a.progress * 100} size="sm" />
                    <p className="mt-1.5 font-data text-[10px] text-ink-ghost">
                      {a.current} / {a.goal}
                    </p>
                  </div>
                )}
              </GlassPanel>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default function AchievementsPage() {
  return (
    <AppShell>
      <Achievements />
    </AppShell>
  )
}
