import { AppShell } from '@/components/shell/AppShell'
import { GlobalPlayer } from '@/components/forge/GlobalPlayer'

/**
 * Layout del espacio de trabajo. El shell (cliente) gestiona navegación,
 * carga de datos y superposiciones globales. El reproductor vive aquí para
 * que la música siga sonando al cambiar de pantalla (incluido Enfoque).
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <GlobalPlayer />
    </>
  )
}
