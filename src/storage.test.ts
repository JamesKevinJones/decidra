import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleFeatures } from './features.ts'
import { BACKUP_KEY, STORAGE_KEY, loadFeatures, parseSaved, saveFeatures } from './storage.ts'

const memoryStore = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

const throwing = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

const edited = sampleFeatures.map((f) =>
  f.id === 'gb-2' ? { ...f, effort: 4, override: { priority: 1, reason: 'Dependency' } } : f,
)

test('nothing saved: starts from the samples with no notice', () => {
  assert.deepEqual(loadFeatures(memoryStore()), { features: sampleFeatures, notice: null })
})

test('save then load round-trips features and PM decisions', () => {
  const store = memoryStore()
  assert.equal(saveFeatures(store, edited), null)
  assert.deepEqual(loadFeatures(store), { features: edited, notice: null })
})

test('valid saved data is never replaced by the samples', () => {
  const store = memoryStore({ [STORAGE_KEY]: JSON.stringify([]) })
  assert.deepEqual(loadFeatures(store).features, [])
})

test('unreadable data: samples, a notice, and the raw copy is backed up', () => {
  const store = memoryStore({ [STORAGE_KEY]: '{not json' })
  const loaded = loadFeatures(store)
  assert.deepEqual(loaded.features, sampleFeatures)
  assert.match(loaded.notice!, /couldn’t be read/)
  assert.equal(store.data.get(BACKUP_KEY), '{not json')
})

test('rejects saved features with bad fields or duplicate ids', () => {
  const ok = JSON.parse(JSON.stringify(sampleFeatures))
  const bad = (patch: object) => JSON.stringify([{ ...ok[0], ...patch }])
  assert.ok(parseSaved(JSON.stringify(ok)))
  assert.equal(parseSaved(bad({ effort: 0 })), null)
  assert.equal(parseSaved(bad({ reach: 2.5 })), null)
  assert.equal(parseSaved(bad({ impact: 7 })), null)
  assert.equal(parseSaved(bad({ confidence: 0.8 })), null)
  assert.equal(parseSaved(bad({ name: '' })), null)
  assert.equal(parseSaved(bad({ evidence: undefined })), null)
  assert.equal(parseSaved(bad({ override: { priority: 1, reason: '' } })), null)
  assert.equal(parseSaved(JSON.stringify({ features: ok })), null)
  assert.equal(parseSaved(JSON.stringify([ok[0], ok[0]])), null)
})

test('storage that throws: samples with a notice, and save reports an error', () => {
  const loaded = loadFeatures(throwing)
  assert.deepEqual(loaded.features, sampleFeatures)
  assert.match(loaded.notice!, /isn’t available/)
  assert.match(saveFeatures(throwing, edited)!, /Couldn’t save/)
})
