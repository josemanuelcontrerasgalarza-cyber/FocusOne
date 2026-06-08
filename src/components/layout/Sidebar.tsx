import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Target, Lightbulb, BarChart2, Settings, LogOut, Music } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getInitials } from '../../lib/utils'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/projects', icon: Target, label: 'Mi Proyecto' },
  { to: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { to: '/stats', icon: BarChart2, label: 'Estadísticas' },
  { to: '/music', icon: Music, label: 'Música' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

interface SidebarProps {
  onOpenMusic?: () => void
}

export function Sidebar({ onOpenMusic: _onOpenMusic }: SidebarProps) {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-bg-surface border-r border-border h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Target size={16} className="text-white" />
        </div>
        <span className="font-bold text-text-primary">FocusOne</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150',
                isActive
                  ? 'bg-primary/15 text-primary-light font-medium'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-xs font-semibold text-white">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-text-muted hover:text-danger hover:bg-danger/10 transition-colors duration-150"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
