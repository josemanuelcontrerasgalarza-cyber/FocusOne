'use client'

import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'

/**
 * Registra el listener de autenticación de Supabase una sola vez, en la raíz,
 * y lo desuscribe al desmontar. Reemplaza la antigua variable global mutable
 * `listenerRegistered`, que podía filtrar listeners con SSR/HMR.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const cleanup = useAuthStore.getState().initialize()
    return cleanup
  }, [])

  return <>{children}</>
}
