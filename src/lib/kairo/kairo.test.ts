import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextMove, rankTasks } from './priority.ts'
import { nextOccurrence } from './recurrence.ts'
import { dailyStreak, bestDailyStreak, weeklyStreak, weekCount } from './streaks.ts'
import { computeXP, levelFromXP, xpForLevel } from './xp.ts'
import { sessionMinutes, summarize, delta, focusByDay, byProject } from './stats.ts'
import { filterTasks, sortTasks, projectProgress, goalProgress, matchesQuery, dueBucket } from './tasks.ts'
import { elapsedMs, remainingSec, pause, resume, reconcile, nextPhase, type TimerState } from './focusTimer.ts'
import { mergeSettings, DEFAULT_SETTINGS, type FocusSession, type Goal, type Project, type Task } from './types.ts'

const TODAY = '2026-10-16' // viernes
let seq = 0
function task(over: Partial<Task> = {}): Task {
  seq++
  return {
    id: `t${seq}`,
    user_id: 'u',
    title: `Tarea ${seq}`,
    description: null,
    status: 'pending',
    priority: 2,
    due_date: null,
    due_time: null,
    estimated_minutes: null,
    tags: [],
    parent_id: null,
    project_id: null,
    goal_id: null,
    recurrence: null,
    position: null,
    created_at: '2026-10-15T10:00:00.000Z',
    updated_at: '2026-10-15T10:00:00.000Z',
    completed_at: null,
    ...over,
  }
}
function session(over: Partial<FocusSession> = {}): FocusSession {
  return {
    id: `s${++seq}`,
    user_id: 'u',
    task_id: null,
    started_at: new Date(2026, 9, 16, 9, 0).toISOString(),
    ended_at: null,
    planned_minutes: 25,
    actual_seconds: null,
    completed: false,
    label: null,
    ...over,
  }
}

/* ── Siguiente movimiento ── */

test('lo vencido gana a lo que vence hoy', () => {
  const a = task({ title: 'Hoy', due_date: TODAY })
  const b = task({ title: 'Vencida', due_date: '2026-10-14' })
  const m = nextMove([a, b], { today: TODAY })
  assert.equal(m?.task.title, 'Vencida')
  assert.match(m!.reasons[0], /Venció hace 2 días/)
})

test('la tarea en enfoque (active) siempre es la siguiente', () => {
  const a = task({ due_date: '2026-10-01', priority: 4 })
  const b = task({ title: 'En foco', status: 'active' })
  assert.equal(nextMove([a, b], { today: TODAY })?.task.title, 'En foco')
})

test('urgente sin fecha supera a media que vence en 6 días', () => {
  const a = task({ title: 'Urgente', priority: 4 })
  const b = task({ title: 'Lejana', due_date: '2026-10-22' })
  assert.equal(nextMove([a, b], { today: TODAY })?.task.title, 'Urgente')
})

test('una tarea con subtareas recomienda su primera subtarea pendiente', () => {
  const parent = task({ title: 'Informe', due_date: TODAY })
  const s1 = task({ title: 'Paso 1', parent_id: parent.id, position: 1, status: 'completed' })
  const s2 = task({ title: 'Paso 2', parent_id: parent.id, position: 2 })
  const s3 = task({ title: 'Paso 3', parent_id: parent.id, position: 3 })
  const ranked = rankTasks([parent, s1, s2, s3], { today: TODAY })
  assert.equal(ranked.length, 1)
  assert.equal(ranked[0].task.title, 'Paso 2')
  assert.equal(ranked[0].parent?.title, 'Informe')
  assert.match(ranked[0].reasons.join(' '), /Vence hoy/)
})

test('sin tareas abiertas no hay movimiento', () => {
  assert.equal(nextMove([task({ status: 'completed' })], { today: TODAY }), null)
})

test('hora límite próxima se explica', () => {
  const a = task({ due_date: TODAY, due_time: '11:00' })
  assert.equal(nextMove([a], { today: TODAY, nowTime: '10:00' })?.reasons[0], 'Vence en 1 h')
  assert.equal(nextMove([a], { today: TODAY, nowTime: '10:30' })?.reasons[0], 'Vence en 30 min')
  assert.equal(nextMove([a], { today: TODAY, nowTime: '12:00' })?.reasons[0], 'Debía estar a las 11:00')
})

/* ── Recurrencia ── */

test('recurrencia diaria siempre queda en el futuro', () => {
  assert.equal(nextOccurrence(TODAY, 'daily', TODAY), '2026-10-17')
  assert.equal(nextOccurrence('2026-10-13', 'daily', TODAY), '2026-10-17')
})
test('entre semana salta el fin de semana', () => {
  assert.equal(nextOccurrence(TODAY, 'weekdays', TODAY), '2026-10-19')
})
test('semanal y mensual', () => {
  assert.equal(nextOccurrence('2026-10-12', 'weekly', TODAY), '2026-10-19')
  assert.equal(nextOccurrence('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28')
  assert.equal(nextOccurrence('2026-10-30', 'weekly', TODAY), '2026-11-06')
})

/* ── Rachas ── */

test('la racha no se rompe si hoy aún no se ha registrado', () => {
  assert.equal(dailyStreak(['2026-10-13', '2026-10-14', '2026-10-15'], TODAY), 3)
  assert.equal(dailyStreak(['2026-10-14', '2026-10-15', TODAY], TODAY), 3)
  assert.equal(dailyStreak(['2026-10-13', '2026-10-14'], TODAY), 0)
})
test('mejor racha histórica', () => {
  assert.equal(bestDailyStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10']), 3)
})
test('racha semanal con objetivo 3/semana', () => {
  // semana 12-18 oct: 3 registros; semana 5-11 oct: 3; semana anterior: 1
  const dates = ['2026-10-12', '2026-10-13', '2026-10-15', '2026-10-05', '2026-10-07', '2026-10-09', '2026-09-30']
  assert.equal(weekCount(dates, TODAY), 3)
  assert.equal(weeklyStreak(dates, 3, TODAY), 2)
})

/* ── XP y niveles ── */

test('XP a partir de actividad real', () => {
  assert.equal(computeXP({ tasksCompleted: 3, focusMinutes: 50, habitLogs: 2, goalsAchieved: 1 }), 30 + 50 + 10 + 50)
})
test('curva de niveles', () => {
  assert.equal(xpForLevel(1), 0)
  assert.equal(xpForLevel(2), 100)
  assert.equal(xpForLevel(3), 300)
  assert.equal(levelFromXP(0).level, 1)
  assert.equal(levelFromXP(99).level, 1)
  assert.equal(levelFromXP(100).level, 2)
  assert.equal(levelFromXP(299).level, 2)
  assert.equal(levelFromXP(300).level, 3)
  const l = levelFromXP(200)
  assert.equal(l.into, 100)
  assert.equal(l.span, 200)
  assert.equal(l.progress, 0.5)
})

/* ── Estadísticas ── */

test('minutos de sesión: reales > planeados; abandonadas cuentan lo transcurrido', () => {
  assert.equal(sessionMinutes(session({ actual_seconds: 600, completed: true })), 10)
  assert.equal(sessionMinutes(session({ completed: true })), 25)
  const start = new Date(2026, 9, 16, 9, 0)
  const end = new Date(2026, 9, 16, 9, 8)
  assert.equal(sessionMinutes(session({ started_at: start.toISOString(), ended_at: end.toISOString() })), 8)
  assert.equal(sessionMinutes(session()), 0)
})
test('resumen de periodo y por día', () => {
  const s = [session({ completed: true }), session({ actual_seconds: 300 })]
  const t = [task({ status: 'completed', completed_at: new Date(2026, 9, 16, 12).toISOString() })]
  const sum = summarize(s, t, [TODAY])
  assert.deepEqual(sum, { focusMinutes: 30, sessions: 2, completedSessions: 1, tasksDone: 1, activeDays: 1 })
  assert.deepEqual(focusByDay(s, ['2026-10-15', TODAY]), [
    { day: '2026-10-15', value: 0 },
    { day: TODAY, value: 30 },
  ])
})
test('variación entre periodos', () => {
  assert.equal(delta(120, 100), 0.2)
  assert.equal(delta(0, 0), 0)
  assert.equal(delta(5, 0), null)
})
test('enfoque por proyecto', () => {
  const p: Project = {
    id: 'p1', user_id: 'u', name: 'Web', description: null, color: 'sky', status: 'active', priority: 2,
    start_date: null, target_date: null, completed_at: null, created_at: '', updated_at: '',
  }
  const t1 = task({ project_id: 'p1' })
  const rows = byProject([session({ task_id: t1.id, completed: true })], [t1], [p])
  assert.equal(rows[0].name, 'Web')
  assert.equal(rows[0].minutes, 25)
})

/* ── Tareas ── */

test('filtros, búsqueda sin tildes y orden', () => {
  const a = task({ title: 'Diseñar campaña', tags: ['marketing'], priority: 3, due_date: '2026-10-20' })
  const b = task({ title: 'Llamar banco', due_date: '2026-10-14' })
  const c = task({ title: 'Hecha', status: 'completed' })
  const sub = task({ title: 'Sub', parent_id: a.id })
  const all = [a, b, c, sub]
  assert.deepEqual(filterTasks(all, { status: 'open' }, TODAY).map((t) => t.title), ['Diseñar campaña', 'Llamar banco'])
  assert.deepEqual(filterTasks(all, { status: 'open', due: 'overdue' }, TODAY).map((t) => t.title), ['Llamar banco'])
  assert.deepEqual(filterTasks(all, { status: 'all', tag: 'marketing' }, TODAY).map((t) => t.title), ['Diseñar campaña'])
  assert.ok(matchesQuery(a, 'disenar CAMPANA'))
  assert.ok(!matchesQuery(a, 'banco'))
  assert.deepEqual(sortTasks([a, b, c], 'due').map((t) => t.title), ['Llamar banco', 'Diseñar campaña', 'Hecha'])
  assert.equal(dueBucket(b, TODAY), 'overdue')
})
test('progreso de proyecto y objetivo con datos reales', () => {
  const t1 = task({ project_id: 'p', status: 'completed' })
  const t2 = task({ project_id: 'p' })
  const t3 = task({ project_id: 'p', parent_id: t2.id, status: 'completed' }) // subtarea: no cuenta
  assert.deepEqual(projectProgress('p', [t1, t2, t3]), { done: 1, total: 2, ratio: 0.5 })
  const g: Goal = {
    id: 'g', user_id: 'u', title: 'Leer', description: null, color: 'lime', target_value: 12, current_value: 3,
    unit: 'libros', due_date: null, status: 'active', project_id: null, created_at: '', achieved_at: null,
  }
  assert.equal(goalProgress(g, []).ratio, 0.25)
  const g2 = { ...g, target_value: null }
  assert.equal(goalProgress(g2, [task({ goal_id: 'g', status: 'completed' }), task({ goal_id: 'g' })]).ratio, 0.5)
})

/* ── Temporizador ── */

test('temporizador por reloj con pausas', () => {
  const t0 = 1_000_000
  let t: TimerState = {
    phase: 'focus', startedAt: t0, durationSec: 1500, pausedAt: null, pausedMs: 0, lastBeat: t0,
    taskId: null, label: null, sessionId: null, cycle: 0,
  }
  assert.equal(remainingSec(t, t0 + 60_000), 1440)
  t = pause(t, t0 + 60_000)
  assert.equal(elapsedMs(t, t0 + 600_000), 60_000) // en pausa no corre
  t = resume(t, t0 + 120_000)
  assert.equal(elapsedMs(t, t0 + 180_000), 120_000)
})
test('recargar tras estar fuera NO completa la sesión', () => {
  const t0 = 2_000_000
  const t: TimerState = {
    phase: 'focus', startedAt: t0, durationSec: 1500, pausedAt: null, pausedMs: 0, lastBeat: t0 + 300_000,
    taskId: null, label: null, sessionId: null, cycle: 0,
  }
  const r = reconcile(t, t0 + 3_600_000)
  assert.equal(r.kind, 'away')
  assert.equal((r as { creditedSec: number }).creditedSec, 300)
  // con latidos al día y tiempo cumplido → terminada
  const done = reconcile({ ...t, lastBeat: t0 + 1_499_000 }, t0 + 1_501_000)
  assert.equal(done.kind, 'finished')
  // recarga rápida → sigue corriendo
  assert.equal(reconcile({ ...t, lastBeat: t0 + 100_000 }, t0 + 110_000).kind, 'running')
})
test('ciclo pomodoro con descanso largo cada 4', () => {
  assert.deepEqual(nextPhase({ phase: 'focus', cycle: 0 }, 4), { phase: 'short', cycle: 1 })
  assert.deepEqual(nextPhase({ phase: 'focus', cycle: 3 }, 4), { phase: 'long', cycle: 4 })
  assert.deepEqual(nextPhase({ phase: 'long', cycle: 4 }, 4), { phase: 'focus', cycle: 0 })
})

/* ── Ajustes ── */

test('los ajustes guardados se mezclan con los valores por defecto', () => {
  const s = mergeSettings({ focus: { focusMinutes: 50 }, theme: 'dark' })
  assert.equal(s.focus.focusMinutes, 50)
  assert.equal(s.focus.shortBreakMinutes, DEFAULT_SETTINGS.focus.shortBreakMinutes)
  assert.equal(s.theme, 'dark')
  assert.deepEqual(mergeSettings(null), DEFAULT_SETTINGS)
})
