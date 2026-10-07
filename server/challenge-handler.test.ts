import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleFeatures } from '../src/features.ts'
import { rankFeatures } from '../src/scoring.ts'
import { applyOverrides, assumptionFlags } from '../src/decisions.ts'
import { buildChallengeInput, mockChallenge } from '../src/challenge.ts'
import { createChallengeHandler, type ClaudeCaller } from './challenge-handler.ts'

const input = buildChallengeInput(applyOverrides(rankFeatures(sampleFeatures)), assumptionFlags(sampleFeatures))

/** Stands in for Claude: counts calls, never touches the network. */
const fakeClaude = (impl?: ClaudeCaller) => {
  const calls: unknown[] = []
  const caller: ClaudeCaller = async (i) => {
    calls.push(i)
    if (impl) return impl(i)
    return { result: mockChallenge(i), model: 'claude-opus-5-5', usage: { input_tokens: 900, output_tokens: 700 } }
  }
  return { caller, calls }
}

const request = (patch: object = {}) => ({
  method: 'POST',
  origin: 'http://localhost:5173',
  host: 'localhost:5173',
  contentType: 'application/json',
  body: JSON.stringify(input),
  ...patch,
})

test('mock mode answers without calling Claude', async () => {
  const claude = fakeClaude()
  const res = await createChallengeHandler('mock', claude.caller)(request())
  assert.equal(res.status, 200)
  assert.equal('source' in res.body && res.body.source, 'mock')
  assert.equal(claude.calls.length, 0)
})

test('live mode calls Claude once, then serves identical input from the cache', async () => {
  const claude = fakeClaude()
  const handle = createChallengeHandler('live', claude.caller)
  const first = await handle(request())
  const second = await handle(request())
  assert.equal('source' in first.body && first.body.source, 'claude')
  assert.equal('source' in second.body && second.body.source, 'cache')
  assert.equal(claude.calls.length, 1)
  // A changed backlog is a new question, so it's a new call.
  const changed = { features: [{ ...input.features[0], effort: 9 }, ...input.features.slice(1)] }
  await handle(request({ body: JSON.stringify(changed) }))
  assert.equal(claude.calls.length, 2)
})

test('requests from other sites are refused before any call', async () => {
  const claude = fakeClaude()
  const res = await createChallengeHandler('live', claude.caller)(request({ origin: 'https://evil.example' }))
  assert.equal(res.status, 403)
  assert.equal(claude.calls.length, 0)
})

test('non-JSON content types are refused (a cross-site form post would be text/plain)', async () => {
  const claude = fakeClaude()
  const res = await createChallengeHandler('live', claude.caller)(request({ contentType: 'text/plain' }))
  assert.equal(res.status, 415)
  assert.equal(claude.calls.length, 0)
})

test('only POST is accepted', async () => {
  const res = await createChallengeHandler('live', fakeClaude().caller)(request({ method: 'GET' }))
  assert.equal(res.status, 405)
})

test('malformed bodies are rejected without a call', async () => {
  const claude = fakeClaude()
  const handle = createChallengeHandler('live', claude.caller)
  assert.equal((await handle(request({ body: '{oops' }))).status, 400)
  assert.equal((await handle(request({ body: JSON.stringify({ features: [] }) }))).status, 400)
  assert.equal(claude.calls.length, 0)
})

test('a failed Claude call becomes a 502 with its message, and is not cached', async () => {
  let fail = true
  const claude = fakeClaude(async (i) => {
    if (fail) throw new Error('Claude is rate-limiting requests.')
    return { result: mockChallenge(i), model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 1 } }
  })
  const handle = createChallengeHandler('live', claude.caller)
  const res = await handle(request())
  assert.equal(res.status, 502)
  assert.deepEqual(res.body, { error: 'Claude is rate-limiting requests.' })
  fail = false
  assert.equal((await handle(request())).status, 200)
  assert.equal(claude.calls.length, 2)
})
