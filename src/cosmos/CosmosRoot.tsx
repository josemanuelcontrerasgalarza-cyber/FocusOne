'use client'

import dynamic from 'next/dynamic'

// El cosmos es client-only y lazy: el primer paint es DOM puro con el fondo
// gradiente estático; el canvas aparece con crossfade al estar listo.
const CosmosCanvas = dynamic(() => import('./CosmosCanvas'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,#0b0e22_0%,#030308_70%)]" />
  ),
})

export function CosmosRoot() {
  return <CosmosCanvas />
}
