import {
  Flame, Trophy, Target, CheckCircle2, Rocket, Zap, Crown, Sparkles, Star, Award,
  type LucideIcon,
} from 'lucide-react'

export interface AchievementInput {
  streakBest: number
  tasksTotal: number
  projectsCompleted: number
  focusMinutes: number
  ideasCount: number
}

export interface Achievement {
  id: string
  title: string
  desc: string
  icon: LucideIcon
  accent: 'core' | 'plasma' | 'solar' | 'nova'
  /** umbral necesario */
  goal: number
  /** valor actual del usuario */
  current: number
  unlocked: boolean
  /** progreso 0..1 hacia el desbloqueo */
  progress: number
}

interface Def {
  id: string
  title: string
  desc: string
  icon: LucideIcon
  accent: Achievement['accent']
  goal: number
  metric: keyof AchievementInput
}

const DEFS: Def[] = [
  { id: 'first-task',   title: 'Primer paso',      desc: 'Completa tu primer objetivo',        icon: CheckCircle2, accent: 'core',   goal: 1,    metric: 'tasksTotal' },
  { id: 'tasks-10',     title: 'En marcha',         desc: 'Completa 10 objetivos',              icon: Zap,          accent: 'core',   goal: 10,   metric: 'tasksTotal' },
  { id: 'tasks-50',     title: 'Imparable',         desc: 'Completa 50 objetivos',              icon: Star,         accent: 'plasma', goal: 50,   metric: 'tasksTotal' },
  { id: 'tasks-100',    title: 'Centenario',        desc: 'Completa 100 objetivos',             icon: Award,        accent: 'solar',  goal: 100,  metric: 'tasksTotal' },
  { id: 'streak-3',     title: 'Constancia',        desc: 'Mantén una racha de 3 días',         icon: Flame,        accent: 'solar',  goal: 3,    metric: 'streakBest' },
  { id: 'streak-7',     title: 'Semana de fuego',   desc: 'Mantén una racha de 7 días',         icon: Flame,        accent: 'nova',   goal: 7,    metric: 'streakBest' },
  { id: 'streak-30',    title: 'Disciplina total',  desc: 'Mantén una racha de 30 días',        icon: Crown,        accent: 'solar',  goal: 30,   metric: 'streakBest' },
  { id: 'mission-1',    title: 'Misión cumplida',   desc: 'Completa tu primera misión',         icon: Trophy,       accent: 'plasma', goal: 1,    metric: 'projectsCompleted' },
  { id: 'mission-5',    title: 'Comandante',        desc: 'Completa 5 misiones',                icon: Target,       accent: 'plasma', goal: 5,    metric: 'projectsCompleted' },
  { id: 'focus-60',     title: 'Hora de foco',      desc: 'Acumula 60 min de Deep Work',        icon: Rocket,       accent: 'core',   goal: 60,   metric: 'focusMinutes' },
  { id: 'focus-600',    title: 'Maratón mental',    desc: 'Acumula 10 horas de Deep Work',      icon: Rocket,       accent: 'nova',   goal: 600,  metric: 'focusMinutes' },
  { id: 'ideas-10',     title: 'Mente inquieta',    desc: 'Captura 10 ideas',                   icon: Sparkles,     accent: 'plasma', goal: 10,   metric: 'ideasCount' },
]

export function computeAchievements(input: AchievementInput): Achievement[] {
  return DEFS.map((d) => {
    const current = input[d.metric]
    const unlocked = current >= d.goal
    return {
      id: d.id,
      title: d.title,
      desc: d.desc,
      icon: d.icon,
      accent: d.accent,
      goal: d.goal,
      current,
      unlocked,
      progress: Math.max(0, Math.min(1, current / d.goal)),
    }
  })
}
