import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getInitials } from '../../lib/utils'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface lg:hidden sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Target size={14} className="text-white" />
        </div>
        <span className="font-bold text-text-primary text-sm">FocusOne</span>
      </div>

      <h1 className="text-sm font-semibold text-text-primary absolute left-1/2 -translate-x-1/2">{title}</h1>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-white"
        >
          {user ? getInitials(user.name) : '?'}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-10 w-44 bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in z-50">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-text-primary truncate">{user?.name}</p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => { navigate('/settings'); setMenuOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <Settings size={15} /> Configuración
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
