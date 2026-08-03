'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const COOKIE = 'tz-offset'

/**
 * Guarda el offset de zona horaria del navegador (minutos, `Date.getTimezoneOffset()`)
 * en una cookie para que los Server Components puedan calcular "hoy" en el día
 * LOCAL del usuario en vez de en UTC. Sin esto, `getDashboardData`/`getMissionsBoard`
 * usaban medianoche UTC mientras que el reclamo diario usa medianoche local: para
 * cualquiera al oeste de UTC, misiones forjadas por la tarde se contaban en el día
 * equivocado. Solo refresca cuando el valor cambia (viaje, cambio de horario).
 */
export function TimezoneSync() {
  const router = useRouter()

  useEffect(() => {
    const offset = String(new Date().getTimezoneOffset())
    const current = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.split('=')[1]
    if (current === offset) return
    document.cookie = `${COOKIE}=${offset}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }, [router])

  return null
}
