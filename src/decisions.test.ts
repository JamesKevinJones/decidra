import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleFeatures, type Feature } from './features.ts'
import { rankFeatures } from './scoring.ts'
import { applyOverrides, assumptionFlags, describeWhatIf, sensitivity } from './decisions.ts'

const feature = (id: string, patch: Partial<Feature> = {}): Feature => ({
  id,
  name: id,
  description: '',
  reach: 1000,
  impact: 1,
  confidence: 80,
  effort: 2,
  evidence: 'Survey',
  dependency: '',
  override: null,
  ...patch,
})

const kinds = (features: Feature[], id: string) =>
  assumptionFlags(features).get(id)!.map((f) => f.kind)

test('the GymBuddy samples raise no flags', () => {
  const flags = assumptionFlags(sampleFeatures)
  assert.deepEqual([...flags.values()].flat(), [])
})

test('flags 100% confidence only when the evidence note is empty', () => {
  const list = [feature('a', { confidence: 100, evidence: '  ' }), feature('b', { confidence: 100 })]
  assert.deepEqual(kinds(list, 'a'), ['unsupported-confidence'])
  assert.deepEqual(kinds(list, 'b'), [])
})

test('flags every feature when all are rated maximum impact', () => {
  const list = [feature('a', { impact: 3 }), feature('b', { impact: 3 })]
  assert.deepEqual(kinds(list, 'a'), ['all-max-impact'])
  assert.deepEqual(kinds([feature('a', { impact: 3 }), feature('b', { impact: 2 })], 'a'), [])
})

test('low effort is relative to the backlog median, and needs 3+ features', () => {
  const list = [...sampleFeatures, feature('coach', { effort: 0.3 })] // median 2, threshold 0.5
  assert.deepEqual(kinds(list, 'coach'), ['low-effort'])
  assert.deepEqual(kinds([...sampleFeatures, feature('ok', { effort: 0.5 })], 'ok'), [])
  // Tiny team: everything small, nothing stands out.
  const small = [0.2, 0.3, 0.4].map((e, i) => feature(`s${i}`, { effort: e }))
  assert.deepEqual([...assumptionFlags(small).values()].flat(), [])
  // Two features: no typical value to compare against.
  assert.deepEqual(kinds([feature('a', { effort: 0.1 }), feature('b', { effort: 6 })], 'a'), [])
})

test('flags zero reach and dependency notes', () => {
  const list = [feature('a', { reach: 0 }), feature('b', { dependency: 'Needed for coach launch' })]
  assert.deepEqual(kinds(list, 'a'), ['zero-reach'])
  assert.deepEqual(kinds(list, 'b'), ['dependency'])
  assert.match(assumptionFlags(list).get('b')![0].message, /Needed for coach launch/)
})

test('sensitivity: Planner at other confidence levels', () => {
  // Planner at 80% scores 800, rank 1. At 50% it scores 500, still above the two 400s.
  assert.deepEqual(sensitivity(sampleFeatures, 'gb-1'), [
    { confidence: 100, score: 1000, rank: 1 },
    { confidence: 50, score: 500, rank: 1 },
  ])
})

test('sensitivity shows a rank change', () => {
  // Reminders at 50%: 1,500 × 0.5 × 0.5 ÷ 1.5 = 250, drops below Videos (400).
  const whatIfs = sensitivity(sampleFeatures, 'gb-3')
  assert.deepEqual(whatIfs.find((w) => w.confidence === 50), { confidence: 50, score: 250, rank: 3 })
  assert.equal(
    describeWhatIf({ confidence: 80, score: 400, rank: 2 }, { confidence: 50, score: 250, rank: 3 }),
    'If confidence decreases from 80% to 50%, this feature’s score changes from 400 to 250 and its suggested rank changes from 2 to 3.',
  )
  assert.match(
    describeWhatIf({ confidence: 80, score: 800, rank: 1 }, { confidence: 100, score: 1000, rank: 1 }),
    /increases from 80% to 100%.*stays at 1\./,
  )
})

const finalOrder = (features: Feature[]) =>
  applyOverrides(rankFeatures(features)).map((d) => [d.feature.id, d.rank, d.finalPriority])

test('no overrides: final priority equals suggested rank', () => {
  assert.deepEqual(finalOrder(sampleFeatures), [
    ['gb-1', 1, 1],
    ['gb-3', 2, 2],
    ['gb-2', 3, 3],
  ])
})

test('override moves a feature up without changing any score or suggested rank', () => {
  const list = sampleFeatures.map((f) =>
    f.id === 'gb-2' ? { ...f, override: { priority: 1, reason: 'Needed for the coach' } } : f,
  )
  assert.deepEqual(finalOrder(list), [
    ['gb-2', 3, 1],
    ['gb-1', 1, 2],
    ['gb-3', 2, 3],
  ])
  const videos = applyOverrides(rankFeatures(list)).find((d) => d.feature.id === 'gb-2')!
  assert.equal(videos.score, 400)
})

test('override moves a feature down, and the rest close the gap', () => {
  const list = sampleFeatures.map((f) =>
    f.id === 'gb-1' ? { ...f, override: { priority: 3, reason: 'Waiting on content' } } : f,
  )
  assert.deepEqual(finalOrder(list), [
    ['gb-3', 2, 1],
    ['gb-2', 3, 2],
    ['gb-1', 1, 3],
  ])
})

test('clashing overrides never share a priority; better suggested rank wins the slot', () => {
  const list = sampleFeatures.map((f) => ({ ...f, override: { priority: 3, reason: 'x' } }))
  assert.deepEqual(finalOrder(list), [
    ['gb-2', 3, 1],
    ['gb-3', 2, 2],
    ['gb-1', 1, 3],
  ])
})

test('a priority past the end of the backlog is clamped to last', () => {
  const list = sampleFeatures.map((f) =>
    f.id === 'gb-1' ? { ...f, override: { priority: 9, reason: 'x' } } : f,
  )
  assert.deepEqual(finalOrder(list).map((r) => r[0]), ['gb-3', 'gb-2', 'gb-1'])
})
