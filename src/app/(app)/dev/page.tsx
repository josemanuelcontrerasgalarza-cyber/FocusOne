import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { readIsDeveloper } from '@/lib/developer'
import { supabaseConfigured } from '@/lib/supabase'
import { DevConsole } from './_components/DevConsole'

export const metadata: Metadata = { title: 'Consola DEV' }
export const dynamic = 'force-dynamic'

/**
 * Consola de desarrollador. Doble puerta: el servidor comprueba is_developer
 * (readIsDeveloper) y redirige si no lo eres; además cada RPC dev_* revalida
 * is_dev() en la base de datos. Una cuenta normal nunca ve ni usa esto.
 */
export default async function DevPage() {
  if (!supabaseConfigured) redirect('/perfil')
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/perfil')
  const isDev = await readIsDeveloper(supabase, user.id)
  if (!isDev) redirect('/perfil')

  return <DevConsole />
}
