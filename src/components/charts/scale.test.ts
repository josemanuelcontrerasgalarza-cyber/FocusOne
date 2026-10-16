import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bandLayout, barPath, clamp, labelStride, niceStep, niceTicks, niceTimeTicks, tickIndices } from './scale.ts'

test('niceStep redondea a 1/2/2.5/5 × 10ⁿ', () => {
  assert.equal(niceStep(0.7), 1)
  assert.equal(niceStep(1.3), 2)
  assert.equal(niceStep(2.2), 2.5)
  assert.equal(niceStep(3), 5)
  assert.equal(niceStep(7), 10)
  assert.equal(niceStep(23), 25)
  assert.equal(niceStep(130), 200)
  assert.equal(niceStep(0), 1)
})

test('niceStep entero nunca devuelve fracciones', () => {
  assert.equal(niceStep(0.3, true), 1)
  assert.equal(niceStep(2.2, true), 5)
  assert.equal(niceStep(1.5, true), 2)
})

test('niceTicks cubre el máximo empezando en 0', () => {
  assert.deepEqual(niceTicks(9, 4), [0, 2.5, 5, 7.5, 10])
  assert.deepEqual(niceTicks(87, 4), [0, 25, 50, 75, 100])
  assert.deepEqual(niceTicks(100, 4), [0, 25, 50, 75, 100])
  assert.deepEqual(niceTicks(3, 4, { integer: true }), [0, 1, 2, 3])
  assert.deepEqual(niceTicks(7, 4, { integer: true }), [0, 2, 4, 6, 8])
  assert.deepEqual(niceTicks(1, 4, { integer: true }), [0, 1])
})

test('niceTicks sin datos devuelve un eje mínimo', () => {
  assert.deepEqual(niceTicks(0), [0, 1])
  assert.deepEqual(niceTicks(Number.NaN), [0, 1])
  assert.deepEqual(niceTicks(-5), [0, 1])
})

test('niceTicks no acumula errores de coma flotante', () => {
  const t = niceTicks(0.7, 4)
  assert.deepEqual(t, [0, 0.2, 0.4, 0.6, 0.8])
})

test('niceTimeTicks usa pasos de reloj', () => {
  assert.deepEqual(niceTimeTicks(45, 4), [0, 15, 30, 45])
  assert.deepEqual(niceTimeTicks(100, 4), [0, 30, 60, 90, 120])
  assert.deepEqual(niceTimeTicks(150, 4), [0, 60, 120, 180])
  assert.deepEqual(niceTimeTicks(820, 4), [0, 240, 480, 720, 960])
  assert.deepEqual(niceTimeTicks(0), [0, 30])
})

test('niceTimeTicks escala a horas redondas por encima de un día', () => {
  const t = niceTimeTicks(6000, 4)
  assert.equal(t[0], 0)
  assert.ok(t[t.length - 1] >= 6000)
  for (const v of t) assert.equal(v % 60, 0)
})

test('bandLayout limita el grosor de la barra y deja aire', () => {
  const wide = bandLayout(7, 700)
  assert.equal(wide.slot, 100)
  assert.equal(wide.bar, 24)
  const dense = bandLayout(30, 300)
  assert.equal(dense.slot, 10)
  assert.ok(dense.bar <= 8 && dense.bar >= 1)
  assert.deepEqual(bandLayout(0, 300), { slot: 0, bar: 0 })
})

test('labelStride salta etiquetas cuando no caben', () => {
  assert.equal(labelStride(7, 700, 40), 1)
  assert.equal(labelStride(30, 300, 30), 3)
  assert.equal(labelStride(0, 300, 30), 1)
})

test('tickIndices siempre incluye el último índice', () => {
  assert.deepEqual(tickIndices(7, 1), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(tickIndices(7, 3), [0, 3, 6])
  assert.deepEqual(tickIndices(8, 3), [1, 4, 7])
  assert.deepEqual(tickIndices(0, 2), [])
})

test('barPath: base recta, esquinas superiores redondeadas', () => {
  assert.equal(barPath(0, 0, 10, 0), '')
  assert.equal(barPath(0, 10, 10, 20, 4), 'M0,30V14Q0,10 4,10H6Q10,10 10,14V30Z')
  // Barras muy bajas: el radio no supera la altura.
  assert.equal(barPath(0, 9, 10, 1, 4), 'M0,10V10Q0,9 1,9H9Q10,9 10,10V10Z')
})

test('clamp', () => {
  assert.equal(clamp(5, 0, 10), 5)
  assert.equal(clamp(-1, 0, 10), 0)
  assert.equal(clamp(11, 0, 10), 10)
  assert.equal(clamp(5, 10, 0), 10)
})
