import { useNavigate } from 'react-router-dom'
import { Target, Flame, CheckSquare, Lightbulb, Trophy, ChevronRight, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProjects } from '../hooks/useProjects'
import { useIdeas } from '../hooks/useIdeas'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Badge } from '../components/ui/Badge'
import { ProjectCard } from '../components/features/projects/ProjectCard'
import { IdeaCard } from '../components/features/ideas/IdeaCard'
import { useIdeaStore } from '../store/ideaStore'
import { useProjectStore } from '../store/projectStore'
import { useAuthStore } from '../store/authStore'
import { getGreeting, getPriorityLabel } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, mainProject, loading: projectsLoading } = useProjects()
  const { ideas, loading: ideasLoading } = useIdeas()
  const { deleteIdea, convertToProject } = useIdeaStore()
  const { setMainProject } = useProjectStore()
  const { refreshProfile } = useAuthStore()
  const [todayTasks, setTodayTasks] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('daily_stats')
      .select('tasks_completed')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()
      .then(({ data }) => setTodayTasks(data?.tasks_completed ?? 0))
  }, [user?.id])

  // Próxima tarea del proyecto principal
  const nextTask = mainProject?.tasks?.find(t => t.status === 'pending') ?? null

  const activeProjects = projects.filter(p => p.status === 'active' && !p.is_main)
  const lastIdeas = ideas.slice(0, 3)

  const handleConvertIdea = async (idea: import('../types').Idea) => {
    await convertToProject(idea, { name: idea.title, description: idea.description })
  }

  const stats = [
    {
      icon: <Flame size={20} className="text-warning" />,
      value: user?.streak_current ?? 0,
      label: 'días de racha',
      bg: 'bg-warning/10',
    },
    {
      icon: <CheckSquare size={20} className="text-success" />,
      value: todayTasks,
      label: 'tareas hoy',
      bg: 'bg-success/10',
    },
    {
      icon: <Lightbulb size={20} className="text-primary-light" />,
      value: ideas.length,
      label: 'ideas guardadas',
      bg: 'bg-primary/10',
    },
    {
      icon: <Trophy size={20} className="text-warning" />,
      value: user?.projects_completed_total ?? 0,
      label: 'proyectos terminados',
      bg: 'bg-warning/10',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Saludo */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">
          {user ? getGreeting(user.name.split(' ')[0]) : '👋'}
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Aquí tienes tu resumen de hoy.</p>
      </div>

      {/* Proyecto principal */}
      {projectsLoading ? (
        <div className="skeleton h-36 rounded-xl" />
      ) : mainProject ? (
        <Card padding="lg" className="border-primary/30 bg-gradient-to-br from-primary/10 to-bg-surface">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-primary-light" />
                <span className="text-xs font-medium text-primary-light uppercase tracking-wide">Misión principal</span>
              </div>
              <h2 className="text-lg font-bold text-text-primary">{mainProject.name}</h2>
              {mainProject.description && (
                <p className="text-sm text-text-muted mt-0.5">{mainProject.description}</p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/projects/${mainProject.id}`)}
            >
              Ver proyecto
            </Button>
          </div>

          <ProgressBar value={mainProject.progress} showLabel size="md" className="mb-3" />

          {nextTask && (
            <div className="flex items-center gap-2 p-2.5 bg-bg-elevated/50 rounded-lg border border-border/50">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-light shrink-0" />
              <p className="text-xs text-text-muted flex-1">
                <span className="text-text-primary font-medium">Próximo: </span>
                {nextTask.title}
              </p>
              <Badge variant={nextTask.priority === 'high' ? 'danger' : nextTask.priority === 'medium' ? 'warning' : 'muted'}>
                {getPriorityLabel(nextTask.priority)}
              </Badge>
            </div>
          )}
        </Card>
      ) : (
        <Card padding="lg" className="border-dashed border-2 border-border">
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target size={24} className="text-primary-light" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-text-primary">Sin misión principal</p>
              <p className="text-sm text-text-muted mt-0.5">Elige un proyecto en el que enfocarte</p>
            </div>
            <Button
              size="sm"
              rightIcon={<ChevronRight size={14} />}
              onClick={() => navigate('/projects')}
            >
              Elige tu misión principal →
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} padding="md">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-text-primary">{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Proyectos activos + últimas ideas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyectos activos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Proyectos activos</h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs text-primary-light hover:text-primary flex items-center gap-0.5"
            >
              Ver todos <ChevronRight size={12} />
            </button>
          </div>
          {projectsLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
            </div>
          ) : activeProjects.length === 0 ? (
            <Card className="border-dashed border-2">
              <div className="flex flex-col items-center py-6 gap-2">
                <p className="text-sm text-text-muted">No hay proyectos activos</p>
                <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => navigate('/projects')}>
                  Nuevo proyecto
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {activeProjects.slice(0, 3).map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onSetMain={(proj) => user && setMainProject(proj.id, user.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Últimas ideas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Últimas ideas</h2>
            <button
              onClick={() => navigate('/ideas')}
              className="text-xs text-primary-light hover:text-primary flex items-center gap-0.5"
            >
              Ver todas <ChevronRight size={12} />
            </button>
          </div>
          {ideasLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
          ) : lastIdeas.length === 0 ? (
            <Card className="border-dashed border-2">
              <div className="flex flex-col items-center py-6 gap-2">
                <p className="text-sm text-text-muted">No hay ideas guardadas</p>
                <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => navigate('/ideas')}>
                  Guardar idea
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {lastIdeas.map(idea => (
                <IdeaCard key={idea.id} idea={idea} onDelete={deleteIdea} onConvert={handleConvertIdea} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
