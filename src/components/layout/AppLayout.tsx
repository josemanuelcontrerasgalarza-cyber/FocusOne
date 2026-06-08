import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Target, Lightbulb, BarChart2, Settings, Music } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '../../lib/utils'

interface AppLayoutProps {
  children: ReactNode
}

const mobileNav = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', exact: true },
  { to: '/projects', icon: Target, label: 'Proyecto' },
  { to: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
  { to: '/music', icon: Music, label: 'Música' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Proyectos',
  '/ideas': 'Ideas',
  '/stats': 'Estadísticas',
  '/settings': 'Configuración',
  '/music': 'Música',
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'FocusOne'

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <Header title={title} />

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        {/* Bottom nav mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border z-30">
          <div className="flex items-center">
            {mobileNav.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors duration-150',
                    isActive ? 'text-primary-light' : 'text-text-muted',
                  )
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
