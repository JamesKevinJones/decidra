import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyDraft, newId, validateDraft, type Draft } from './features.ts'

const draft = (overrides: Partial<Draft>): Draft => ({
  ...emptyDraft,
  name: 'AI Exercise Coach',
  reach: '1000',
  effort: '2',
  ...overrides,
})

const errorsFor = (overrides: Partial<Draft>) => {
  const result = validateDraft(draft(overrides), 3)
  return result.ok ? {} : result.errors
}

test('accepts a valid feature and converts numbers', () => {
  const result = validateDraft(draft({ reach: '1,500', effort: '1.5', name: '  Coach  ' }), 3)
  assert.ok(result.ok)
  assert.equal(result.values.reach, 1500)
  assert.equal(result.values.effort, 1.5)
  assert.equal(result.values.name, 'Coach')
})

test('requires a name', () => {
  assert.ok(errorsFor({ name: '   ' }).name)
})

test('rejects negative, decimal and non-numeric reach', () => {
  assert.match(errorsFor({ reach: '-5' }).reach!, /negative/)
  assert.match(errorsFor({ reach: '2.5' }).reach!, /whole number/)
  assert.ok(errorsFor({ reach: 'lots' }).reach)
  assert.ok(errorsFor({ reach: '' }).reach)
})

test('allows zero reach (Phase 4 flags it instead)', () => {
  assert.equal(errorsFor({ reach: '0' }).reach, undefined)
})

test('rejects zero, negative and non-numeric effort', () => {
  assert.match(errorsFor({ effort: '0' }).effort!, /more than 0/)
  assert.match(errorsFor({ effort: '-1' }).effort!, /more than 0/)
  assert.ok(errorsFor({ effort: '1e3' }).effort)
  assert.ok(errorsFor({ effort: 'two' }).effort)
  assert.ok(errorsFor({ effort: '' }).effort)
})

test('accepts decimal effort', () => {
  assert.equal(errorsFor({ effort: '0.5' }).effort, undefined)
  assert.equal(errorsFor({ effort: '.5' }).effort, undefined)
})

test('accepting the suggested rank stores no override, even with leftover text', () => {
  const result = validateDraft(draft({ decision: 'accept', priority: 'junk', reason: 'old' }), 3)
  assert.ok(result.ok)
  assert.equal(result.values.override, null)
})

test('an override needs a priority within the backlog and a reason', () => {
  assert.ok(errorsFor({ decision: 'override', priority: '0', reason: 'x' }).priority)
  assert.ok(errorsFor({ decision: 'override', priority: '4', reason: 'x' }).priority)
  assert.ok(errorsFor({ decision: 'override', priority: '1.5', reason: 'x' }).priority)
  assert.ok(errorsFor({ decision: 'override', priority: '1', reason: '  ' }).reason)
  const result = validateDraft(draft({ decision: 'override', priority: '3', reason: ' Needed first ' }), 3)
  assert.ok(result.ok)
  assert.deepEqual(result.values.override, { priority: 3, reason: 'Needed first' })
})

test('newId works without crypto.randomUUID (plain http, e.g. a phone on the LAN)', () => {
  const proto = Object.getPrototypeOf(crypto)
  const original = proto.randomUUID
  delete proto.randomUUID
  try {
    assert.equal(typeof crypto.randomUUID, 'undefined')
    const ids = new Set(Array.from({ length: 1000 }, newId))
    assert.equal(ids.size, 1000)
    assert.match([...ids][0], /^[0-9a-f]{32}$/)
  } finally {
    proto.randomUUID = original
  }
})
