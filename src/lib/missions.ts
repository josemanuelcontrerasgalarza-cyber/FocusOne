import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'
import type { Mission, TodayStat } from '@/types'

/**
 * Datos que alimentan el dashboard "Hoy".
 * - `mission`: la misión protagonista, o `null` si el usuario está logueado
 *   pero no tiene ninguna activa (estado vacío → CTA a /misiones).
 * - `isDemo`: true cuando mostramos el mockup (sin Supabase o sin sesión).
 */
export interface DashboardData {
  mission: Mission | null
  isDemo: boolean
  stats: TodayStat[]
  upcoming: { id: string; title: string }[]
}

// ISO fijo para evitar cualquier desajuste de hidratación en la misión demo.
const DEMO_ISO = '2025-01-01T00:00:00.000Z'

/** Misión de demostración — refleja el mockup aprobado de La Fragua. */
export const DEMO_MISSION: Mission = {
  id: 'demo',
  user_id: 'demo',
  title: 'Terminar el wireframe de checkout',
  project: 'App de reservas · misión 2 de 5 hoy',
  estimated_minutes: 25,
  status: 'active',
  source: 'user',
  created_at: DEMO_ISO,
  updated_at: DEMO_ISO,
  completed_at: null,
}

const DEMO_STATS: TodayStat[] = [
  { label: 'Enfoque hoy', value: '1h 47m' },
  { label: 'Misiones', value: '3/5' },
  { label: 'Racha', value: '12 días' },
  { label: 'Promedio semanal', value: '2h 10m' },
]

const DEMO_UPCOMING = [
  { id: 'd1', title: 'Revisar feedback de usuarios' },
  { id: 'd2', title: 'Preparar deck de inversión' },
  { id: 'd3', title: 'Grabar demo del producto' },
]

function demoDashboard(): DashboardData {
  return { mission: DEMO_MISSION, isDemo: true, stats: DEMO_STATS, upcoming: DEMO_UPCOMING }
}

/** Tablero de la pantalla Misiones: activa + pendientes + forjadas hoy. */
export interface MissionsBoard {
  active: Mission | null
  pending: Mission[]
  completedToday: Mission[]
  isDemo: boolean
}

/**
 * Lee las misiones del día del usuario para la pantalla de gestión (Fase 3).
 * En demo/sin sesión devuelve vacío + isDemo: la UI muestra un aviso para
 * iniciar sesión (las mutaciones necesitan un usuario real).
 */
export async function getMissionsBoard(): Promise<MissionsBoard> {
  const empty: MissionsBoard = {
    active: null,
    pending: [],
    completedToday: [],
    isDemo: true,
  }
  if (!supabaseConfigured) return empty

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [{ data: active }, { data: pending }, { data: completed }] =
    await Promise.all([
      supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString())
        .order('completed_at', { ascending: false }),
    ])

  return {
    active: (active as Mission | null) ?? null,
    pending: (pending as Mission[]) ?? [],
    completedToday: (completed as Mission[]) ?? [],
    isDemo: false,
  }
}

export interface HeaderStats {
  streak: number
  points: number
}

export interface ProgressData {
  streak: number
  best: number
  points: number
  forged: number
  isDemo: boolean
}

/** Datos de la pantalla Progreso (Fase 5): racha, récord, puntos, forjadas. */
export async function getProgressData(): Promise<ProgressData> {
  const demo: ProgressData = { streak: 12, best: 21, points: 240, forged: 37, isDemo: true }
  if (!supabaseConfigured) return demo

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return demo

  const [{ data: profile }, { data: pts }, { count: forged }] = await Promise.all([
    supabase.from('profiles').select('streak_current, streak_best').eq('id', user.id).single(),
    supabase.from('points').select('total_points').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
  ])

  return {
    streak: profile?.streak_current ?? 0,
    best: profile?.streak_best ?? 0,
    points: pts?.total_points ?? 0,
    forged: forged ?? 0,
    isDemo: false,
  }
}

/**
 * Racha + puntos para el header (Fase 5). La racha la mantiene el trigger
 * de misiones (07_mission_streak.sql) en profiles.streak_current; los puntos
 * salen de points.total_points. En demo devuelve valores de muestra.
 */
export async function getHeaderStats(): Promise<HeaderStats> {
  const demo: HeaderStats = { streak: 12, points: 240 }
  if (!supabaseConfigured) return demo

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return demo

  const [{ data: profile }, { data: pts }] = await Promise.all([
    supabase.from('profiles').select('streak_current').eq('id', user.id).single(),
    supabase.from('points').select('total_points').eq('user_id', user.id).maybeSingle(),
  ])

  return {
    streak: profile?.streak_current ?? 0,
    points: pts?.total_points ?? 0,
  }
}

/**
 * Lee el dashboard real del usuario desde Supabase. Cae con elegancia al
 * mockup demo cuando no hay configuración/sesión, de modo que la pantalla
 * siempre renderiza algo coherente (nunca una página en blanco).
 */
export async function getDashboardData(): Promise<DashboardData> {
  if (!supabaseConfigured) return demoDashboard()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return demoDashboard()

  // Misión activa (0 o 1 gracias al índice único parcial).
  const { data: active } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Próximas: misiones pendientes más antiguas primero.
  const { data: pending } = await supabase
    .from('missions')
    .select('id, title')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(3)

  // Estadísticas reales que salen baratas: racha (profiles) y misiones de hoy.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [{ data: profile }, { count: completedToday }, { count: totalToday }] =
    await Promise.all([
      supabase.from('profiles').select('streak_current').eq('id', user.id).single(),
      supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString()),
      supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfToday.toISOString()),
    ])

  const streak = profile?.streak_current ?? 0
  const stats: TodayStat[] = [
    // TODO (Fase 4/5): "Enfoque hoy" y "Promedio semanal" salen de focus_sessions.
    { label: 'Enfoque hoy', value: '—' },
    { label: 'Misiones', value: `${completedToday ?? 0}/${totalToday ?? 0}` },
    { label: 'Racha', value: `${streak} ${streak === 1 ? 'día' : 'días'}` },
    { label: 'Promedio semanal', value: '—' },
  ]

  return {
    mission: (active as Mission | null) ?? null,
    isDemo: false,
    stats,
    upcoming: pending ?? [],
  }
}
