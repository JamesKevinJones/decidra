import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleFeatures, type Feature } from './features.ts'
import { rankFeatures, riceScore } from './scoring.ts'

const feature = (id: string, reach: number, impact: number, confidence: number, effort: number): Feature => ({
  id,
  name: id,
  description: '',
  reach,
  impact,
  confidence,
  effort,
  evidence: '',
  dependency: '',
  override: null,
})

const order = (features: Feature[]) => rankFeatures(features).map((r) => r.feature.id)

test('the workshop golden number: 1,000 × 2 × 80% ÷ 2 = 800', () => {
  assert.equal(riceScore({ reach: 1000, impact: 2, confidence: 80, effort: 2 }), 800)
})

test('confidence is converted from a percentage, not used raw', () => {
  // Using 80 instead of 0.8 would give 80,000.
  assert.equal(riceScore({ reach: 1000, impact: 2, confidence: 80, effort: 2 }), 800)
  assert.equal(riceScore({ reach: 1000, impact: 2, confidence: 50, effort: 2 }), 500)
  assert.equal(riceScore({ reach: 1000, impact: 2, confidence: 100, effort: 2 }), 1000)
})

test('decimal effort, and no rounding of the result', () => {
  assert.equal(riceScore({ reach: 1500, impact: 0.5, confidence: 80, effort: 1.5 }), 400)
  assert.equal(riceScore({ reach: 1000, impact: 1, confidence: 100, effort: 3 }), 1000 / 3)
})

test('invalid or zero effort cannot be scored', () => {
  assert.equal(riceScore({ reach: 1000, impact: 2, confidence: 80, effort: 0 }), null)
  assert.equal(riceScore({ reach: 1000, impact: 2, confidence: 80, effort: -1 }), null)
  assert.equal(riceScore({ reach: 1000, impact: 2, confidence: 80, effort: NaN }), null)
  assert.equal(riceScore({ reach: -5, impact: 2, confidence: 80, effort: 2 }), null)
})

test('unscorable features go last with no rank', () => {
  const ranked = rankFeatures([feature('bad', 100, 1, 80, 0), feature('ok', 100, 1, 80, 1)])
  assert.deepEqual(ranked.map((r) => [r.feature.id, r.rank]), [['ok', 1], ['bad', null]])
})

test('ranks the GymBuddy samples: Planner, then Reminders over Videos on effort', () => {
  const ranked = rankFeatures(sampleFeatures)
  assert.deepEqual(
    ranked.map((r) => [r.feature.name, r.score, r.rank]),
    [
      ['Beginner Workout Planner', 800, 1],
      ['Workout Reminder Notifications', 400, 2],
      ['Exercise Demonstration Videos', 400, 3],
    ],
  )
})

test('Planner effort 2 → 4 makes a three-way tie, settled by effort', () => {
  const changed = sampleFeatures.map((f) => (f.id === 'gb-1' ? { ...f, effort: 4 } : f))
  assert.deepEqual(order(changed), ['gb-3', 'gb-2', 'gb-1'])
})

test('tie-break: lower effort, then higher confidence, then insertion order', () => {
  // All score 400.
  assert.deepEqual(order([feature('slow', 800, 1, 100, 2), feature('fast', 400, 1, 100, 1)]), ['fast', 'slow'])
  assert.deepEqual(order([feature('unsure', 1000, 1, 80, 2), feature('sure', 800, 1, 100, 2)]), ['sure', 'unsure'])
  assert.deepEqual(order([feature('first', 800, 1, 100, 2), feature('second', 800, 1, 100, 2)]), ['first', 'second'])
})

test('a tie still counts as a tie when floating point disagrees in the last digit', () => {
  // 1×3×0.8÷4 = 0.6000000000000001 and 1×3×0.5÷2.5 = 0.6 in floating point.
  // On paper both are 0.6, so lower effort must win.
  assert.deepEqual(order([feature('effort-4', 1, 3, 80, 4), feature('effort-2.5', 1, 3, 50, 2.5)]), [
    'effort-2.5',
    'effort-4',
  ])
})

test('ranking never reorders the original list', () => {
  const list = [...sampleFeatures]
  rankFeatures(list)
  assert.deepEqual(list, sampleFeatures)
})
