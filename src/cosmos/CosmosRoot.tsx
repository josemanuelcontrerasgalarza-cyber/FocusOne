'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

// El cosmos es client-only y lazy: el primer paint es DOM puro con el fondo
// gradiente estático; el canvas aparece con crossfade al estar listo.
const CosmosCanvas = dynamic(() => import('./CosmosCanvas'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,#0b0e22_0%,#030308_70%)]" />
  ),
})

// Rutas de "La Fragua": tienen su propio fondo opaco que cubre el cosmos por
// completo (ver src/app/(fragua)/layout.tsx). Sin esta guarda, el Canvas 3D
// seguía renderizando cada frame (frameloop "always") totalmente oculto
// detrás — GPU/batería desperdiciadas justo durante las sesiones largas de
// foco que La Fragua promueve.
const FRAGUA_PREFIXES = ['/hoy', '/misiones', '/musica', '/perfil', '/progreso']

export function CosmosRoot() {
  const pathname = usePathname()
  const inFragua = FRAGUA_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (inFragua) return null
  return <CosmosCanvas />
}
