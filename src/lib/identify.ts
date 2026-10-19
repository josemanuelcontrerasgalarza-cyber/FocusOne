import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const supabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

/** Devuelve el id del usuario (o 'local' sin backend); null si falta sesión. */
export async function identify(): Promise<string | null> {
  if (!supabaseConfigured()) return 'local'
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return data.user.id
  } catch {
    return null
  }
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  return fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}
