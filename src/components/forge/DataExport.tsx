'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

/**
 * Exporta todos los datos del usuario (misiones, quiz, puntos, racha, mascota,
 * recompensas y sesiones de Deep Work) a un archivo JSON descargable.
 * Portabilidad total: nada queda encerrado en FocusOne.
 */
export function DataExport() {
  const { user, session } = useAuthStore()
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    const uid = session?.user.id
    if (!uid) return
    setLoading(true)
    try {
      const [missions, quizResults, points, rewardUnlocks, petOwned, userPet, dailyClaims, focusSessions] =
        await Promise.all([
          supabase.from('missions').select('*').eq('user_id', uid),
          supabase.from('quiz_results').select('*').eq('user_id', uid),
          supabase.from('points').select('*').eq('user_id', uid).maybeSingle(),
          supabase.from('reward_unlocks').select('*').eq('user_id', uid),
          supabase.from('pet_owned').select('*').eq('user_id', uid),
          supabase.from('user_pet').select('*').eq('user_id', uid).maybeSingle(),
          supabase.from('daily_claims').select('*').eq('user_id', uid),
          supabase.from('focus_sessions').select('*').eq('user_id', uid),
        ])

      const payload = {
        exported_at: new Date().toISOString(),
        profile: {
          name: user?.name ?? null,
          email: user?.email ?? null,
          streak_current: user?.streak_current ?? 0,
          streak_best: user?.streak_best ?? 0,
        },
        missions: missions.data ?? [],
        quiz_results: quizResults.data ?? [],
        points: points.data ?? null,
        reward_unlocks: rewardUnlocks.data ?? [],
        pet_owned: petOwned.data ?? [],
        user_pet: userPet.data ?? null,
        daily_claims: dailyClaims.data ?? [],
        focus_sessions: focusSessions.data ?? [],
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

  if (!session) return null

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-forge border border-forge-line bg-forge-surface p-4 text-left transition-colors hover:border-forge-ink-faint disabled:opacity-50"
    >
      <Download size={20} className="text-forge-ink-dim" />
      <div className="min-w-0 flex-1">
        <p className="font-forge text-[15px] font-semibold text-forge-ink">
          {loading ? 'Exportando…' : 'Exportar mis datos'}
        </p>
        <p className="truncate text-[13px] text-forge-ink-faint">
          Descarga misiones, puntos, racha y mascota en un JSON
        </p>
      </div>
    </button>
  )
}
