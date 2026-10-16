import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseQuickTask } from './parse.ts'

// Viernes 16 oct 2026, 10:00 (hora local).
const NOW = new Date(2026, 9, 16, 10, 0)
const p = (s: string) => parseQuickTask(s, NOW)

test('ejemplo del brief: fecha relativa + duración', () => {
  const r = p('Estudiar ciencias mañana durante 30 minutos')
  assert.equal(r.title, 'Estudiar ciencias')
  assert.equal(r.due_date, '2026-10-17')
  assert.equal(r.estimated_minutes, 30)
  assert.equal(r.due_time, null)
})

test('día de la semana + hora ambigua de la tarde', () => {
  const r = p('Llamar a Ana el lunes a las 5')
  assert.equal(r.title, 'Llamar a Ana')
  assert.equal(r.due_date, '2026-10-19')
  assert.equal(r.due_time, '17:00')
})

test('fecha numérica, hora, etiqueta, proyecto y urgencia', () => {
  const r = p('Reunión equipo 25/10 17:30 #trabajo @Kairo urgente')
  assert.equal(r.title, 'Reunión equipo')
  assert.equal(r.due_date, '2026-10-25')
  assert.equal(r.due_time, '17:30')
  assert.deepEqual(r.tags, ['trabajo'])
  assert.equal(r.projectHint, 'Kairo')
  assert.equal(r.priority, 4)
})

test('duración compacta 1h30 + hoy', () => {
  const r = p('Leer 1h30 hoy')
  assert.equal(r.title, 'Leer')
  assert.equal(r.estimated_minutes, 90)
  assert.equal(r.due_date, '2026-10-16')
})

test('recurrencia semanal con día', () => {
  const r = p('Gimnasio cada lunes')
  assert.equal(r.title, 'Gimnasio')
  assert.equal(r.recurrence, 'weekly')
  assert.equal(r.due_date, '2026-10-19')
})

test('fecha con mes en texto + prioridad explícita', () => {
  const r = p('Pagar alquiler el 1 de noviembre prioridad alta')
  assert.equal(r.title, 'Pagar alquiler')
  assert.equal(r.due_date, '2026-11-01')
  assert.equal(r.priority, 3)
})

test('recurrencia diaria + media hora', () => {
  const r = p('Meditar todos los días media hora')
  assert.equal(r.title, 'Meditar')
  assert.equal(r.recurrence, 'daily')
  assert.equal(r.estimated_minutes, 30)
  assert.equal(r.due_date, '2026-10-16')
})

test('texto sin metadatos queda intacto', () => {
  const r = p('Comprar pan')
  assert.equal(r.title, 'Comprar pan')
  assert.equal(r.due_date, null)
  assert.equal(r.priority, null)
  assert.equal(r.estimated_minutes, null)
})

test('"de la mañana" es hora, no fecha', () => {
  const r = p('Revisar informe pasado mañana a las 9 de la mañana')
  assert.equal(r.title, 'Revisar informe')
  assert.equal(r.due_date, '2026-10-18')
  assert.equal(r.due_time, '09:00')
})

test('"en N días"', () => {
  assert.equal(p('Entregar proyecto en 3 días').due_date, '2026-10-19')
  assert.equal(p('Entregar proyecto en dos semanas').due_date, '2026-10-30')
})

test('"el N" ya pasado este mes → mes siguiente', () => {
  assert.equal(p('Enviar factura el 10').due_date, '2026-11-10')
  assert.equal(p('Enviar factura el 28').due_date, '2026-10-28')
})

test('"este viernes" es hoy; "el viernes" es el próximo', () => {
  assert.equal(p('Hacer ejercicio este viernes').due_date, '2026-10-16')
  assert.equal(p('Cena con amigos el viernes').due_date, '2026-10-23')
})

test('importante y !! suben prioridad', () => {
  assert.equal(p('Firmar contrato importante').priority, 3)
  assert.equal(p('Firmar contrato !!').priority, 3)
  assert.equal(p('Firmar contrato !!!').priority, 4)
})

test('franja "por la tarde" fija hora', () => {
  const r = p('Correr mañana por la tarde')
  assert.equal(r.due_date, '2026-10-17')
  assert.equal(r.due_time, '17:00')
  assert.equal(r.title, 'Correr')
})
