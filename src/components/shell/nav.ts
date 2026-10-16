import {
  Home,
  CheckSquare,
  Timer,
  CalendarDays,
  FolderKanban,
  Target,
  BarChart3,
  Sparkles,
  Music2,
  Gift,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** atajo "g + tecla" */
  key?: string
}

export const NAV_MAIN: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: Home, key: 'i' },
  { href: '/tareas', label: 'Tareas', icon: CheckSquare, key: 't' },
  { href: '/enfoque', label: 'Enfoque', icon: Timer, key: 'e' },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays, key: 'c' },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban, key: 'p' },
  { href: '/objetivos', label: 'Objetivos', icon: Target, key: 'o' },
  { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3, key: 's' },
  { href: '/asistente', label: 'Asistente', icon: Sparkles, key: 'a' },
]

export const NAV_SPACE: NavItem[] = [
  { href: '/musica', label: 'Música', icon: Music2, key: 'm' },
  { href: '/perfil', label: 'Recompensas', icon: Gift, key: 'r' },
  { href: '/amigos', label: 'Amigos', icon: Users },
]

export const NAV_SETTINGS: NavItem = { href: '/ajustes', label: 'Ajustes', icon: Settings, key: ',' }

export const ALL_NAV = [...NAV_MAIN, ...NAV_SPACE, NAV_SETTINGS]

/** Título de la página actual (para la barra superior). */
export function titleFor(pathname: string): string {
  const hit = ALL_NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))
  if (hit) return hit.label
  if (pathname.startsWith('/tienda')) return 'Tienda'
  if (pathname.startsWith('/mascota')) return 'Mascota'
  if (pathname.startsWith('/dev')) return 'Consola'
  return 'Kairo'
}

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')
