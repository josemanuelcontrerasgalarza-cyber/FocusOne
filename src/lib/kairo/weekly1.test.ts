import { test } from 'node:test'
import assert from 'node:assert/strict'
import { revertCollection } from './rollback.ts'
import { activeSkips, addSkip, removeSkip } from './skips.ts'
import { nextMove } from './priority.ts'
import type { Task } from './types.ts'

type R = { id: string; title: string; done: boolean }
const key = (r: R) => r.id

/* ───────── revertCollection ───────── */

test('rollback: deshace una edición sin pisar otra mutación concurrente', () => {
  const before: R[] = [{ id: 'a', title: 'A', done: false }, { id: 'b', title: 'B', done: false }]
  // Mutación 1 (fallará): completar A
  const after1 = before.map((r) => (r.id === 'a' ? { ...r, done: true } : r))
  // Mutación 2 (ok) sobre el estado ya optimista: completar B
  const current = after1.map((r) => (r.id === 'b' ? { ...r, done: true } : r))
  const out = revertCollection(current, before, after1, key)
  assert.deepEqual(out, [{ id: 'a', title: 'A', done: false }, { id: 'b', title: 'B', done: true }])
})

test('rollback: respeta campos cambiados después en la misma fila', () => {
  const before: R[] = [{ id: 'a', title: 'A', done: false }]
  const after = [{ id: 'a', title: 'A', done: true }]
  const current = [{ id: 'a', title: 'Renombrada', done: true }]
  assert.deepEqual(revertCollection(current, before, after, key), [{ id: 'a', title: 'Renombrada', done: false }])
})

test('rollback: quita lo creado y restaura lo borrado', () => {
  const before: R[] = [{ id: 'a', title: 'A', done: false }]
  const created = [...before, { id: 'n', title: 'Nueva', done: false }]
  assert.deepEqual(revertCollection(created, before, created, key), before)
  const deleted: R[] = []
  const current = [{ id: 'x', title: 'Otra', done: false }]
  assert.deepEqual(revertCollection(current, before, deleted, key), [...current, before[0]])
})

test('rollback: sin cambios devuelve las mismas filas', () => {
  const rows: R[] = [{ id: 'a', title: 'A', done: false }]
  const out = revertCollection(rows, rows, rows, key)
  assert.equal(out[0], rows[0])
})

/* ───────── skips ───────── */

test('skips: solo valen para el día en que se apartaron', () => {
  const s = addSkip(null, 't1', '2026-11-16')
  assert.deepEqual(activeSkips(s, '2026-11-16'), ['t1'])
  assert.deepEqual(activeSkips(s, '2026-11-17'), [])
})

test('skips: sin duplicados, deshacer y entrada corrupta', () => {
  let s = addSkip(null, 't1', 'd')
  s = addSkip(s, 't1', 'd')
  s = addSkip(s, 't2', 'd')
  assert.deepEqual(s.ids, ['t1', 't2'])
  assert.deepEqual(removeSkip(s, 't1', 'd').ids, ['t2'])
  assert.deepEqual(activeSkips({ date: 'd', ids: [1, 't3', null] }, 'd'), ['t3'])
  assert.deepEqual(activeSkips('basura', 'd'), [])
})

/* ───────── nextMove con «Ahora no» ───────── */

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    id, user_id: 'u', title: id, description: null, status: 'pending', priority: 2,
    due_date: null, due_time: null, estimated_minutes: null, tags: [], parent_id: null,
    project_id: null, goal_id: null, recurrence: null, position: null,
    created_at: '2026-11-16T08:00:00.000Z', updated_at: '2026-11-16T08:00:00.000Z', completed_at: null,
    ...over,
  } as Task
}

test('nextMove: «Ahora no» pasa a la siguiente candidata', () => {
  const tasks = [task('urgente', { priority: 4 }), task('media', { priority: 2 })]
  const ctx = { today: '2026-11-16' }
  assert.equal(nextMove(tasks, ctx)?.task.id, 'urgente')
  assert.equal(nextMove(tasks, ctx, new Set(['urgente']))?.task.id, 'media')
  assert.equal(nextMove(tasks, ctx, new Set(['urgente', 'media'])), null)
})
