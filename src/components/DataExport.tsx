'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/glass/Button'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

/**
 * Exporta todos los datos del usuario (misiones, objetivos, ideas, estadísticas
 * y sesiones de foco) a un archivo JSON descargable. Portabilidad total.
 */
export function DataExport() {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (!user) return
    setLoading(true)
    try {
      const [projects, tasks, ideas, daily, focus] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('ideas').select('*').eq('user_id', user.id),
        supabase.from('daily_stats').select('*').eq('user_id', user.id),
        supabase.from('focus_sessions').select('*').eq('user_id', user.id),
      ])

      const payload = {
        exported_at: new Date().toISOString(),
        profile: {
          name: user.name,
          streak_current: user.streak_current,
          streak_best: user.streak_best,
          tasks_completed_total: user.tasks_completed_total,
        },
        projects: projects.data ?? [],
        tasks: tasks.data ?? [],
        ideas: ideas.data ?? [],
        daily_stats: daily.data ?? [],
        focus_sessions: focus.data ?? [],
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `focusone-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Datos exportados')
    } catch {
      toast.error('No se pudieron exportar los datos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleExport} loading={loading}>
      <Download size={14} /> Exportar datos
    </Button>
  )
}
