import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clean, contextTaskIds, extractJson, parseBreakdown, parsePlan, parseText, validateRequest } from './validate.ts'
import { createRateLimiter } from './rateLimit.ts'
import { parseInline, parseRichText } from './richText.ts'
import { buildContext } from './context.ts'
import { buildMessages } from './prompts.ts'
import { localNextMove, localPlan, overdueTasks } from './local.ts'
import { LIMITS } from './types.ts'
import type { Goal, Habit, Project, Task } from '../kairo/types.ts'

/* ───────────────────────── fixtures ───────────────────────── */

const NOW = new Date(2026, 9, 16, 10, 0) // vie 16 oct 2026, 10:00 local
const TODAY = '2026-10-16'
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
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-15T09:00:00.000Z',
    completed_at: null,
    ...over,
  }
}
const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  user_id: 'u',
  name: 'Lanzamiento',
  description: null,
  color: 'lime',
  status: 'active',
  priority: 3,
  start_date: null,
  target_date: '2026-11-01',
  completed_at: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  ...over,
})

const ctx = { now: { date: TODAY, time: '10:00', weekday: 'viernes' }, tasks: [{ id: 'a' }, { id: 'b' }] }

/* ───────────────────────── validateRequest ───────────────────────── */

test('validateRequest acepta una petición mínima válida', () => {
  const r = validateRequest({ mode: 'plan', context: ctx })
  assert.equal(r.ok, true)
})

test('validateRequest rechaza modos, mensajes y contextos inválidos', () => {
  assert.equal(validateRequest(null).ok, false)
  assert.equal(validateRequest({ mode: 'hack', context: ctx }).ok, false)
  assert.equal(validateRequest({ mode: 'chat', context: ctx }).ok, false, 'chat sin mensaje')
  assert.equal(validateRequest({ mode: 'chat', message: '   ', context: ctx }).ok, false)
  assert.equal(validateRequest({ mode: 'chat', message: 'x'.repeat(LIMITS.message + 1), context: ctx }).ok, false)
  assert.equal(validateRequest({ mode: 'plan' }).ok, false, 'sin contexto')
  assert.equal(validateRequest({ mode: 'plan', context: [] }).ok, false, 'contexto array')
  assert.equal(validateRequest({ mode: 'plan', context: { big: 'x'.repeat(LIMITS.contextChars) } }).ok, false)
  assert.equal(validateRequest({ mode: 'breakdown', context: ctx }).ok, false, 'breakdown sin taskId')
  assert.equal(validateRequest({ mode: 'unblock', context: ctx, taskId: 42 }).ok, false)
  assert.equal(validateRequest({ mode: 'breakdown', context: ctx, taskId: 'a' }).ok, true)
})

test('validateRequest valida el historial', () => {
  const h = (n: number, content = 'hola') => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content }))
  assert.equal(validateRequest({ mode: 'chat', message: 'hola', context: ctx, history: h(10) }).ok, true)
  assert.equal(validateRequest({ mode: 'chat', message: 'hola', context: ctx, history: h(11) }).ok, false)
  assert.equal(validateRequest({ mode: 'chat', message: 'hola', context: ctx, history: h(1, 'x'.repeat(2001)) }).ok, false)
  assert.equal(validateRequest({ mode: 'chat', message: 'hola', context: ctx, history: [{ role: 'system', content: 'x' }] }).ok, false)
})

test('contextTaskIds lee ids de tasks y focusTask de forma defensiva', () => {
  assert.deepEqual([...contextTaskIds({ tasks: [{ id: 'a' }, { nope: 1 }, 'x'], focusTask: { id: 'f' } })].sort(), ['a', 'f'])
  assert.equal(contextTaskIds(null).size, 0)
  assert.equal(contextTaskIds({ tasks: 'nope' }).size, 0)
})

/* ───────────────────────── salida del modelo ───────────────────────── */

test('extractJson tolera bloques de código y texto alrededor', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 })
  assert.deepEqual(extractJson('```json\n{"a":2}\n```'), { a: 2 })
  assert.deepEqual(extractJson('Aquí tienes: {"a":3} ¡listo!'), { a: 3 })
  assert.equal(extractJson('sin json'), null)
  assert.equal(extractJson('{roto'), null)
})

test('parsePlan descarta taskIds desconocidos y normaliza minutos', () => {
  const raw = JSON.stringify({
    summary: '  Día  tranquilo. ',
    blocks: [
      { taskId: 'a', title: 'Escribir informe', minutes: 45, why: 'Vence hoy' },
      { taskId: 'zzz', title: 'Tarea inventada', minutes: 30, why: '' },
      { title: 'Pausa', minutes: '10 min', why: 'Descansar también cuenta' },
      { taskId: 'a', title: 'Duplicada', minutes: 20 },
      { taskId: 'b', title: 'Larga', minutes: 9999 },
      { title: '' },
      'basura',
    ],
  })
  const plan = parsePlan(raw, new Set(['a', 'b']))
  assert.ok(plan)
  assert.equal(plan.summary, 'Día tranquilo.')
  assert.deepEqual(
    plan.blocks.map((b) => [b.taskId ?? null, b.title, b.minutes]),
    [
      ['a', 'Escribir informe', 45],
      [null, 'Pausa', 10],
      ['b', 'Larga', 240],
    ],
  )
})

test('parsePlan devuelve null con salida inservible', () => {
  assert.equal(parsePlan('hola', new Set()), null)
  assert.equal(parsePlan('{"blocks":"x"}', new Set()), null)
  assert.deepEqual(parsePlan('{"summary":"Nada abierto","blocks":[]}', new Set()), { summary: 'Nada abierto', blocks: [] })
})

test('parseBreakdown exige 3–8 pasos y recorta títulos', () => {
  assert.equal(parseBreakdown('{"steps":[{"title":"a"},{"title":"b"}]}'), null)
  const long = 'x'.repeat(300)
  const r = parseBreakdown(
    JSON.stringify({
      steps: [
        { title: 'Abrir el documento', minutes: 5 },
        'Escribir el índice',
        { title: 'abrir el documento' },
        { title: long, minutes: -3 },
        { title: '   ' },
        ...Array.from({ length: 10 }, (_, i) => ({ title: `Paso ${i}` })),
      ],
    }),
  )
  assert.ok(r)
  assert.equal(r.steps.length, LIMITS.breakdownMax)
  assert.deepEqual(r.steps[0], { title: 'Abrir el documento', minutes: 5 })
  assert.deepEqual(r.steps[1], { title: 'Escribir el índice' })
  assert.ok(r.steps[2].title.length <= LIMITS.stepTitle)
  assert.equal(r.steps[2].minutes, undefined)
})

test('parseText limpia y limita', () => {
  assert.equal(parseText('  \n '), null)
  assert.equal(parseText('a\n\n\n\nb'), 'a\n\nb')
  assert.ok((parseText('x'.repeat(10000)) as string).length <= LIMITS.text)
  assert.equal(clean('  a   b ', 10), 'a b')
})

/* ───────────────────────── rate limit ───────────────────────── */

test('rate limiter de ventana deslizante', () => {
  let t = 0
  const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t })
  assert.equal(rl.check('u').ok, true)
  assert.equal(rl.check('u').ok, true)
  const blocked = rl.check('u')
  assert.equal(blocked.ok, false)
  assert.equal(blocked.retryAfterSec, 1)
  assert.equal(rl.check('otro').ok, true, 'las claves son independientes')
  t = 1001
  assert.equal(rl.check('u').ok, true)
})

/* ───────────────────────── texto enriquecido ───────────────────────── */

test('parseInline detecta negritas sin HTML', () => {
  assert.deepEqual(parseInline('Haz **esto** ya'), [
    { text: 'Haz ', bold: false },
    { text: 'esto', bold: true },
    { text: ' ya', bold: false },
  ])
  assert.deepEqual(parseInline('<b>x</b> **sin cerrar'), [{ text: '<b>x</b> **sin cerrar', bold: false }])
})

test('parseRichText separa párrafos y listas', () => {
  const blocks = parseRichText('Hola.\nSegunda línea\n\n- uno\n- **dos**\n1. a\n2. b\nFin\n## Título')
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['p', 'ul', 'ol', 'p'],
  )
  assert.equal((blocks[0] as { lines: unknown[] }).lines.length, 2)
  assert.equal((blocks[1] as { items: unknown[] }).items.length, 2)
  const last = blocks[3] as { lines: { text: string; bold: boolean }[][] }
  assert.deepEqual(last.lines[1], [{ text: 'Título', bold: true }])
})

/* ───────────────────────── contexto ───────────────────────── */

test('buildContext comparte datos compactos y reales', () => {
  const p = project()
  const parent = task({ id: 'parent', title: 'Preparar demo', project_id: 'p1', priority: 3, due_date: TODAY, due_time: '17:00:00' })
  const sub = task({ id: 'sub', title: 'Grabar vídeo', parent_id: 'parent' })
  const late = task({ id: 'late', title: 'Factura', due_date: '2026-10-10' })
  const done = task({ id: 'done', status: 'completed', completed_at: '2026-10-16T08:00:00.000Z', project_id: 'p1' })
  const goal: Goal = {
    id: 'g1', user_id: 'u', title: 'Leer 12 libros', description: null, color: 'sky', target_value: 12, current_value: 3,
    unit: 'libros', due_date: null, status: 'active', project_id: null, created_at: '', achieved_at: null,
  }
  const habit: Habit = { id: 'h1', user_id: 'u', title: 'Caminar', icon: 'x', color: 'teal', target_per_week: 5, archived: false, created_at: '' }
  const c = buildContext({
    tasks: [parent, sub, late, done],
    projects: [p],
    goals: [goal],
    habits: [habit],
    habitLogs: [{ habit_id: 'h1', user_id: 'u', log_date: TODAY }],
    sessions: [],
    dailyFocusGoalMinutes: 90,
    now: NOW,
    focusTaskId: 'parent',
  })
  assert.deepEqual(c.now, { date: TODAY, time: '10:00', weekday: 'viernes' })
  assert.equal(c.counts.overdue, 1)
  assert.equal(c.counts.open, 2)
  const ids = c.tasks.map((t) => t.id)
  assert.ok(ids.includes('parent') && ids.includes('late'))
  assert.ok(!ids.includes('sub'), 'la subtarea se comparte como siguiente paso del padre')
  const demo = c.tasks.find((t) => t.id === 'parent')!
  assert.equal(demo.nextStep, 'Grabar vídeo')
  assert.equal(demo.subtasks, 1)
  assert.equal(demo.time, '17:00')
  assert.equal(demo.project, 'Lanzamiento')
  assert.deepEqual(c.projects, [{ name: 'Lanzamiento', done: 1, total: 2, priority: 'alta', target: '2026-11-01' }])
  assert.deepEqual(c.goals, [{ title: 'Leer 12 libros', percent: 25, detail: '3/12 libros' }])
  assert.deepEqual(c.habits, [{ title: 'Caminar', doneToday: true, perWeek: 5 }])
  assert.equal(c.focus.dailyGoalMinutes, 90)
  assert.equal(c.focusTask?.id, 'parent')
  assert.deepEqual(c.focusTask?.subtasks, [{ title: 'Grabar vídeo', done: false }])
  assert.ok(!JSON.stringify(c).includes('"user_id"'), 'no comparte ids de usuario')
})

test('buildContext respeta el límite de tamaño', () => {
  const many = Array.from({ length: 200 }, () => task({ title: 'Una tarea con un título bastante largo '.repeat(4), priority: 4, due_date: TODAY }))
  const c = buildContext({ tasks: many, projects: [], goals: [], habits: [], habitLogs: [], sessions: [], dailyFocusGoalMinutes: 120, now: NOW })
  assert.ok(JSON.stringify(c).length <= LIMITS.contextChars)
  assert.ok(c.tasks.length > 0 && c.tasks.length <= 40)
  assert.equal(c.counts.shared, c.tasks.length)
})

test('buildMessages: historial solo en conversación y contexto en el sistema', () => {
  const base = { context: ctx as never, history: [{ role: 'user' as const, content: 'antes' }] }
  const chat = buildMessages({ mode: 'chat', message: 'hola', ...base })
  assert.equal(chat[0].role, 'system')
  assert.ok(chat[0].content.includes('CONTEXTO (JSON)'))
  assert.equal(chat.length, 3)
  assert.equal(chat[2].content, 'hola')
  const plan = buildMessages({ mode: 'plan', message: 'tengo médico a las 12', ...base })
  assert.equal(plan.length, 2)
  assert.ok(plan[1].content.includes('médico'))
  assert.ok(plan[0].content.includes('JSON'))
})

/* ───────────────────────── local (sin IA) ───────────────────────── */

test('funciones locales: siguiente movimiento, vencidas y plan', () => {
  const urgent = task({ id: 'u1', title: 'Urgente', priority: 4, due_date: TODAY, estimated_minutes: 30 })
  const late = task({ id: 'l1', title: 'Atrasada', due_date: '2026-10-13' })
  const later = task({ id: 'x1', title: 'Más tarde', due_date: '2026-12-01' })
  const tasks = [later, late, urgent]
  const next = localNextMove(tasks, [], NOW)
  assert.ok(next.move)
  assert.ok(next.move.reasons.length > 0)
  assert.equal(next.after.length, 2)

  assert.deepEqual(overdueTasks(tasks, TODAY), [{ taskId: 'l1', title: 'Atrasada', due: '2026-10-13', daysLate: 3 }])

  const plan = localPlan(tasks, [], { dailyGoalMinutes: 60, blockMinutes: 25, now: NOW })
  assert.ok(plan.blocks.length >= 1)
  assert.ok(plan.blocks.every((b) => b.taskId && tasks.some((t) => t.id === b.taskId)))
  const total = plan.blocks.reduce((a, b) => a + b.minutes, 0)
  assert.ok(total <= 60 * 1.15)

  assert.deepEqual(localPlan([], [], { dailyGoalMinutes: 60, blockMinutes: 25, now: NOW }).blocks, [])
  assert.equal(localNextMove([], [], NOW).move, null)
})
