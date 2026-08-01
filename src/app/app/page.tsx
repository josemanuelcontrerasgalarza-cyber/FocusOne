import { redirect } from 'next/navigation'
import { Flame, CheckCircle2, Trophy } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { HoloStat } from '@/glass/HoloStat'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { DashboardClient } from './_components/DashboardClient'
import { type Project, type Task, type AgendaTask, type DayCount, type ActivityItem } from '@/types'

interface FocusRow {
  id: string
  started_at: string
  ended_at: string | null
  planned_minutes: number
}

function sessionMinutes(s: FocusRow): number {
  if (s.ended_at) {
    return Math.max(0, Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000))
  }
  return s.planned_minutes
}

/**
 * Server Component: lee sesión, perfil, proyectos, tareas, agenda y telemetría
 * (productividad semanal, tiempo de foco, calendario, actividad) directamente
 * desde Supabase antes de renderizar. Cero spinners, cero useEffect para datos.
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)
  const horizon = new Date(now + 7 * 86400000).toISOString().slice(0, 10)
  const monthAgoStr = new Date(now - 31 * 86400000).toISOString().slice(0, 10)
  const weekAgoISO = new Date(now - 7 * 86400000).toISOString()

  const [
    { data: profile },
    { data: projectsData },
    { data: agendaData },
    { data: todayStat },
    { data: dailyStatsData },
    { data: focusData },
    { data: completedData },
    { data: ideasData },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('*, projects(name)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .not('due_date', 'is', null)
      .lte('due_date', horizon)
      .order('due_date', { ascending: true })
      .limit(12),
    supabase.from('daily_stats').select('tasks_completed').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase
      .from('daily_stats')
      .select('date, tasks_completed')
      .eq('user_id', user.id)
      .gte('date', monthAgoStr)
      .order('date', { ascending: true }),
    supabase
      .from('focus_sessions')
      .select('id, started_at, ended_at, planned_minutes')
      .eq('user_id', user.id)
      .gte('started_at', weekAgoISO)
      .order('started_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, title, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(6),
    supabase.from('ideas').select('id, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4),
  ])

  const projects: Project[] = projectsData ?? []
  const mainProject = projects.find((p) => p.is_main) ?? null
  const otherProjects = projects.filter((p) => !p.is_main && p.status === 'active').slice(0, 4)

  // Mapear agenda: aplanar el nombre de la misión que llega anidado
  const agenda: AgendaTask[] = (agendaData ?? []).map((t) => {
    const { projects: proj, ...rest } = t as Task & { projects?: { name?: string } | null }
    return { ...(rest as Task), project_name: proj?.name }
  })

  // Productividad semanal (7 días hasta hoy) y días activos del mes
  const statsMap = new Map<string, number>()
  for (const s of (dailyStatsData ?? []) as { date: string; tasks_completed: number }[]) {
    statsMap.set(s.date, s.tasks_completed)
  }
  const weekly: DayCount[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000).toISOString().slice(0, 10)
    return { date: d, count: statsMap.get(d) ?? 0 }
  })
  const monthPrefix = today.slice(0, 7)
  const monthActiveDates = ((dailyStatsData ?? []) as { date: string; tasks_completed: number }[])
    .filter((s) => s.date.startsWith(monthPrefix) && s.tasks_completed > 0)
    .map((s) => s.date)

  // Tiempo enfocado (hoy / semana)
  const focusRows = (focusData ?? []) as FocusRow[]
  let focusToday = 0
  let focusWeek = 0
  for (const s of focusRows) {
    const m = sessionMinutes(s)
    focusWeek += m
    if (s.started_at.slice(0, 10) === today) focusToday += m
  }

  // Actividad reciente (tareas completadas + sesiones de foco + ideas)
  const activity: ActivityItem[] = []
  for (const t of (completedData ?? []) as { id: string; title: string; completed_at: string }[]) {
    activity.push({ id: t.id, kind: 'task', title: `Completaste «${t.title}»`, at: t.completed_at })
  }
  for (const s of focusRows.slice(0, 5)) {
    activity.push({ id: s.id, kind: 'focus', title: `Sesión de foco · ${sessionMinutes(s)} min`, at: s.started_at })
  }
  for (const idea of (ideasData ?? []) as { id: string; title: string; created_at: string }[]) {
    activity.push({ id: idea.id, kind: 'idea', title: `Idea: ${idea.title}`, at: idea.created_at })
  }
  activity.sort((a, b) => b.at.localeCompare(a.at))
  const recentActivity = activity.slice(0, 6)

  let pendingTasks: Task[] = []
  if (mainProject) {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', mainProject.id)
      .eq('status', 'pending')
      .order('order_index', { ascending: true })
      .limit(5)
    pendingTasks = tasksData ?? []
  }

  const streakCurrent = profile?.streak_current ?? 0
  const tasksTotal = profile?.tasks_completed_total ?? 0
  const streakBest = profile?.streak_best ?? 0
  const userName = profile?.name ?? 'piloto'
  const completedToday = todayStat?.tasks_completed ?? 0

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <header className="mt-2">
          <p className="font-data text-[11px] uppercase tracking-[0.3em] text-ink-ghost">
            Centro de mando
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            Hola, <span className="text-gradient">{userName}</span>
          </h1>
        </header>

        {/* Telemetría — renderizada en el servidor */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <HoloStat label="Racha" value={`${streakCurrent}d`} icon={<Flame size={16} />} accent="solar" />
          <HoloStat label="Completadas" value={tasksTotal} icon={<CheckCircle2 size={16} />} accent="core" delay={0.05} />
          <HoloStat label="Récord" value={`${streakBest}d`} icon={<Trophy size={16} />} accent="plasma" delay={0.1} />
        </div>

        {/* Parte interactiva: meta diaria + agenda + insights + misión + tareas */}
        <DashboardClient
          userId={user.id}
          mainProject={mainProject}
          otherProjects={otherProjects}
          pendingTasks={pendingTasks}
          agenda={agenda}
          completedToday={completedToday}
          weekly={weekly}
          monthActiveDates={monthActiveDates}
          focusToday={focusToday}
          focusWeek={focusWeek}
          activity={recentActivity}
        />
      </div>
    </AppShell>
  )
}
