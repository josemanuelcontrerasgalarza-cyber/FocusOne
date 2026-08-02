import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase'

/** Un día de la semana con lo forjado y los minutos de enfoque de ese día. */
export interface DaySlot {
  key: string // YYYY-MM-DD (UTC)
  label: string // inicial del día (L, M, X…)
  forged: number
  minutes: number
}

/** Celda del calendario del mes. `inMonth=false` son los huecos de relleno. */
export interface CalendarDay {
  day: number
  key: string
  inMonth: boolean
  active: boolean
  today: boolean
}

/** Un evento de la actividad reciente (misión forjada o sesión de Deep Work). */
export interface ActivityItem {
  kind: 'mission' | 'focus'
  title: string
  at: string // ISO
  meta: string
}

export interface ProgressDashboard {
  streak: number
  best: number
  points: number
  forgedTotal: number
  week: DaySlot[] // 7 días, del más antiguo al de hoy
  forgedWeek: number
  focusMinutesWeek: number
  focusSessionsWeek: number
  calendar: CalendarDay[] // rejilla del mes (con huecos iniciales), semana inicia lunes
  monthLabel: string
  activity: ActivityItem[]
  isDeveloper: boolean
  isDemo: boolean
}

const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] // getUTCDay(): 0=domingo
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Clave de fecha UTC (YYYY-MM-DD) desde un Date o desde un ISO string. */
function dayKey(value: Date | string): string {
  return (typeof value === 'string' ? value : value.toISOString()).slice(0, 10)
}

/**
 * Dashboard de "Progreso": racha, tiempo enfocado, productividad de la semana,
 * calendario del mes y actividad reciente. Todo se deriva de datos reales
 * (missions + focus_sessions). Cae con elegancia a un demo si no hay sesión.
 */
export async function getProgressDashboard(): Promise<ProgressDashboard> {
  if (!supabaseConfigured) return demoProgress()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return demoProgress()

  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  // Ventana: desde el inicio del mes o hace 7 días, lo que sea más antiguo, para
  // cubrir a la vez la semana y el calendario del mes con pocas consultas.
  const monthStart = new Date(Date.UTC(y, m, 1))
  const weekStart = new Date(Date.UTC(y, m, now.getUTCDate() - 6))
  const windowStart = weekStart < monthStart ? weekStart : monthStart

  const [profileRes, pointsRes, forgedCountRes, missionsRes, focusRes] = await Promise.all([
    supabase.from('profiles').select('streak_current, streak_best, is_developer').eq('id', user.id).maybeSingle(),
    supabase.from('points').select('total_points').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
    supabase
      .from('missions')
      .select('title, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', windowStart.toISOString())
      .order('completed_at', { ascending: false }),
    // focus_sessions puede no existir aún (setup sin correr): el error se ignora.
    supabase
      .from('focus_sessions')
      .select('planned_minutes, started_at, ended_at, completed')
      .eq('user_id', user.id)
      .gte('started_at', windowStart.toISOString())
      .order('started_at', { ascending: false }),
  ])

  const missions = (missionsRes.data ?? []) as { title: string; completed_at: string }[]
  const focus = (focusRes.data ?? []) as {
    planned_minutes: number
    started_at: string
    ended_at: string | null
    completed: boolean
  }[]

  // Minutos REALES de una sesión: si se completó, los planeados; si se abandonó,
  // el tiempo transcurrido (acotado a los planeados). Evita inflar el "tiempo
  // enfocado" cuando alguien inicia y corta una sesión larga enseguida.
  const sessionMinutes = (f: (typeof focus)[number]): number => {
    const planned = f.planned_minutes ?? 0
    if (f.completed) return planned
    if (!f.ended_at) return 0
    const elapsedMin = Math.round((new Date(f.ended_at).getTime() - new Date(f.started_at).getTime()) / 60000)
    return Math.max(0, Math.min(elapsedMin, planned))
  }

  // --- Productividad de la semana (últimos 7 días) --------------------------
  const week: DaySlot[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m, now.getUTCDate() - i))
    week.push({ key: dayKey(d), label: DOW[d.getUTCDay()], forged: 0, minutes: 0 })
  }
  const weekIndex = new Map(week.map((s, i) => [s.key, i]))

  for (const mi of missions) {
    if (!mi.completed_at) continue
    const idx = weekIndex.get(dayKey(mi.completed_at))
    if (idx != null) week[idx].forged += 1
  }
  for (const f of focus) {
    const idx = weekIndex.get(dayKey(f.started_at))
    if (idx != null) week[idx].minutes += sessionMinutes(f)
  }

  const forgedWeek = week.reduce((a, s) => a + s.forged, 0)
  const focusMinutesWeek = week.reduce((a, s) => a + s.minutes, 0)
  const weekKeys = new Set(week.map((s) => s.key))
  const focusSessionsWeek = focus.filter(
    (f) => weekKeys.has(dayKey(f.started_at)) && sessionMinutes(f) > 0,
  ).length

  // --- Calendario del mes ----------------------------------------------------
  const activeDays = new Set<string>()
  for (const mi of missions) if (mi.completed_at) activeDays.add(dayKey(mi.completed_at))
  for (const f of focus) activeDays.add(dayKey(f.started_at))

  const todayKey = dayKey(now)
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const firstDow = new Date(Date.UTC(y, m, 1)).getUTCDay() // 0=domingo
  const leadingBlanks = (firstDow + 6) % 7 // rejilla con semana iniciando en lunes

  const calendar: CalendarDay[] = []
  for (let i = 0; i < leadingBlanks; i++) {
    calendar.push({ day: 0, key: `blank-${i}`, inMonth: false, active: false, today: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = dayKey(new Date(Date.UTC(y, m, day)))
    calendar.push({ day, key, inMonth: true, active: activeDays.has(key), today: key === todayKey })
  }

  // --- Actividad reciente (misiones + sesiones fusionadas) ------------------
  const activity: ActivityItem[] = [
    ...missions.map<ActivityItem>((mi) => ({
      kind: 'mission',
      title: mi.title,
      at: mi.completed_at,
      meta: 'Misión forjada',
    })),
    ...focus.map<ActivityItem>((f) => ({
      kind: 'focus',
      title: 'Sesión de Deep Work',
      at: f.started_at,
      meta: `${sessionMinutes(f)} min${f.completed ? '' : ' · incompleta'}`,
    })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8)

  return {
    streak: profileRes.data?.streak_current ?? 0,
    best: profileRes.data?.streak_best ?? 0,
    points: pointsRes.data?.total_points ?? 0,
    forgedTotal: forgedCountRes.count ?? 0,
    week,
    forgedWeek,
    focusMinutesWeek,
    focusSessionsWeek,
    calendar,
    monthLabel: `${MONTHS[m]} ${y}`,
    activity,
    isDeveloper: Boolean((profileRes.data as { is_developer?: boolean } | null)?.is_developer),
    isDemo: false,
  }
}

/** Datos de muestra coherentes para demo / sin sesión. */
function demoProgress(): ProgressDashboard {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const sample = [1, 0, 2, 3, 1, 2, 1]
  const mins = [25, 0, 50, 75, 25, 90, 25]

  const week: DaySlot[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m, now.getUTCDate() - i))
    const j = 6 - i
    week.push({ key: dayKey(d), label: DOW[d.getUTCDay()], forged: sample[j], minutes: mins[j] })
  }
  const activeKeys = new Set(week.filter((s) => s.forged > 0 || s.minutes > 0).map((s) => s.key))

  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const firstDow = new Date(Date.UTC(y, m, 1)).getUTCDay()
  const leadingBlanks = (firstDow + 6) % 7
  const todayKey = dayKey(now)
  const calendar: CalendarDay[] = []
  for (let i = 0; i < leadingBlanks; i++) {
    calendar.push({ day: 0, key: `blank-${i}`, inMonth: false, active: false, today: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const key = dayKey(new Date(Date.UTC(y, m, day)))
    calendar.push({ day, key, inMonth: true, active: activeKeys.has(key), today: key === todayKey })
  }

  return {
    streak: 12,
    best: 21,
    points: 240,
    forgedTotal: 63,
    week,
    forgedWeek: sample.reduce((a, b) => a + b, 0),
    focusMinutesWeek: mins.reduce((a, b) => a + b, 0),
    focusSessionsWeek: mins.filter((x) => x > 0).length,
    calendar,
    monthLabel: `${MONTHS[m]} ${y}`,
    activity: [
      { kind: 'mission', title: 'Terminar informe trimestral', at: now.toISOString(), meta: 'Misión forjada' },
      { kind: 'focus', title: 'Sesión de Deep Work', at: now.toISOString(), meta: '50 min' },
      { kind: 'mission', title: 'Estudiar para el examen', at: now.toISOString(), meta: 'Misión forjada' },
    ],
    isDeveloper: false,
    isDemo: true,
  }
}
