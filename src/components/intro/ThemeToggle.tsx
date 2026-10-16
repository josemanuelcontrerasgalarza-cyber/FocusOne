'use client'

import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconButton } from '@/components/ui/Button'
import { useTheme } from '@/store/themeStore'

/**
 * Cambia entre claro y oscuro en las páginas públicas. El icono se decide por
 * CSS (clase `dark` ya aplicada por el script de <head>), así no hay desajuste
 * de hidratación ni parpadeo.
 */
export function ThemeToggle() {
  const init = useTheme((s) => s.init)
  const setMode = useTheme((s) => s.setMode)

  useEffect(() => init(), [init])

  return (
    <IconButton
      label="Cambiar entre tema claro y oscuro"
      onClick={() => setMode(document.documentElement.classList.contains('dark') ? 'light' : 'dark')}
    >
      <Moon size={17} className="dark:hidden" />
      <Sun size={17} className="hidden dark:block" />
    </IconButton>
  )
}
