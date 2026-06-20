import { redirect } from 'next/navigation'
import { Flame, CheckCircle2, Trophy } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { HoloStat } from '@/glass/HoloStat'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { DashboardClient } from './_components/DashboardClient'
import { type Project, type Task, type AgendaTask } from '@/types'

/**
 * Server Component: lee sesión, perfil, proyectos, tareas y agenda directamente
 * desde Supabase antes de renderizar. Cero spinners, cero useEffect para datos.
 */
export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)
  const horizon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [{ data: profile }, { data: projectsData }, { data: agendaData }, { data: todayStat }] =
    await Promise.all([
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
    ])

  const projects: Project[] = projectsData ?? []
  const mainProject = projects.find((p) => p.is_main) ?? null
  const otherProjects = projects.filter((p) => !p.is_main && p.status === 'active').slice(0, 4)

  // Mapear agenda: aplanar el nombre de la misión que llega anidado
  const agenda: AgendaTask[] = (agendaData ?? []).map((t) => {
    const { projects: proj, ...rest } = t as Task & { projects?: { name?: string } | null }
    return { ...(rest as Task), project_name: proj?.name }
  })

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

        {/* Parte interactiva: meta diaria + agenda + misión + tareas */}
        <DashboardClient
          userId={user.id}
          mainProject={mainProject}
          otherProjects={otherProjects}
          pendingTasks={pendingTasks}
          agenda={agenda}
          completedToday={completedToday}
        />
      </div>
    </AppShell>
  )
}
