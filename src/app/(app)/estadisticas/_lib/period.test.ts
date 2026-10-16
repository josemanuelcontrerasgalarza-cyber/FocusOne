import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  activityDays,
  argMax,
  dayLabel,
  formatDelta,
  formatPct,
  mondayFirst,
  plural,
  previousDays,
  tasksForPeriod,
  weekBuckets,
} from './period.ts'
import { lastDays } from '../../../../lib/kairo/stats.ts'
import type { FocusSession, Task } from '../../../../lib/kairo/types.ts'

const task = (over: Partial<Task>): Task => ({
  id: 't',
  user_id: 'u',
  title: 'x',
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
  created_at: '2026-10-01T10:00:00',
  updated_at: '2026-10-01T10:00:00',
  completed_at: null,
  ...over,
})

const session = (over: Partial<FocusSession>): FocusSession => ({
  id: 's',
  user_id: 'u',
  task_id: null,
  started_at: '2026-10-10T09:00:00',
  ended_at: null,
  planned_minutes: 25,
  actual_seconds: null,
  completed: false,
  label: null,
  ...over,
})

test('previousDays devuelve el periodo anterior de igual longitud', () => {
  const days = lastDays('2026-10-16', 7)
  assert.deepEqual(previousDays(days), lastDays('2026-10-09', 7))
  assert.deepEqual(previousDays([]), [])
})

test('weekBuckets agrupa de lunes a domingo, con semanas parciales', () => {
  // 2026-10-16 es viernes; 10 días: mié 7 → vie 16.
  const points = lastDays('2026-10-16', 10).map((day, i) => ({ day, value: i + 1 }))
  const w = weekBuckets(points)
  assert.equal(w.length, 2)
  assert.equal(w[0].start, '2026-10-05')
  assert.deepEqual(w[0].days, ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'])
  assert.equal(w[0].value, 1 + 2 + 3 + 4 + 5)
  assert.equal(w[1].start, '2026-10-12')
  assert.equal(w[1].days.length, 5)
  assert.equal(w[1].value, 6 + 7 + 8 + 9 + 10)
})

test('activityDays: tarea completada o enfoque > 0', () => {
  const set = activityDays(
    [
      session({ started_at: '2026-10-10T09:00:00', actual_seconds: 600 }),
      session({ started_at: '2026-10-11T09:00:00', actual_seconds: 0 }),
    ],
    [
      task({ status: 'completed', completed_at: '2026-10-12T18:00:00' }),
      task({ status: 'pending', completed_at: null }),
    ],
  )
  assert.deepEqual([...set].sort(), ['2026-10-10', '2026-10-12'])
})

test('mondayFirst reordena domingo al final', () => {
  assert.deepEqual(mondayFirst([0, 1, 2, 3, 4, 5, 6]), [1, 2, 3, 4, 5, 6, 0])
})

test('argMax ignora ceros y resuelve empates por el primero', () => {
  assert.equal(argMax([0, 0, 0]), null)
  assert.equal(argMax([]), null)
  assert.equal(argMax([1, 5, 5, 2]), 1)
})

test('tasksForPeriod "descompleta" las tareas fuera del periodo', () => {
  const days = new Set(['2026-10-10'])
  const [inside, outside, open] = tasksForPeriod(
    [
      task({ id: 'a', status: 'completed', completed_at: '2026-10-10T12:00:00' }),
      task({ id: 'b', status: 'completed', completed_at: '2026-09-01T12:00:00' }),
      task({ id: 'c' }),
    ],
    days,
  )
  assert.equal(inside.status, 'completed')
  assert.equal(outside.status, 'pending')
  assert.equal(open.status, 'pending')
})

test('formato en español', () => {
  assert.equal(dayLabel('2026-10-12'), 'lun 12 oct')
  assert.equal(formatPct(0.426), '43 %')
  assert.equal(formatDelta(0.12), '+12 %')
  assert.equal(formatDelta(-0.084), '−8 %')
  assert.equal(formatDelta(0.001), '0 %')
  assert.equal(plural(1, 'tarea'), '1 tarea')
  assert.equal(plural(2, 'tarea'), '2 tareas')
  assert.equal(plural(2, 'sesión', 'sesiones'), '2 sesiones')
})
