import { useState } from 'react'
import { buildChallengeInput, inputKey, parseChallenge, type ChallengeResult } from './challenge'
import type { Decided, Flag } from './decisions'

type Reply = {
  key: string
  result: ChallengeResult
  names: Map<string, string>
  source: 'claude' | 'cache' | 'mock'
  model?: string
  usage?: { input_tokens: number; output_tokens: number }
}

// ponytail: Opus 5.5 list prices, for a rough per-review figure only. Update if the model changes.
const USD_PER_TOKEN_IN = 4 / 1e6
const USD_PER_TOKEN_OUT = 20 / 1e6

const live = __DECIDRA_AI_MODE__ === 'live'

export function ChallengePanel({ decided, flags }: { decided: Decided[]; flags: Map<string, Flag[]> }) {
  const [reply, setReply] = useState<Reply | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const input = buildChallengeInput(decided, flags)
  const key = inputKey(input)
  const stale = reply !== null && reply.key !== key

  // Only ever runs on an explicit click: never on load, typing or re-ranking.
  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: key,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `The review failed (HTTP ${res.status}).`)
      const result = parseChallenge(data?.result, input)
      if (!result) throw new Error('The review came back in an unexpected shape.')
      setReply({
        key,
        result,
        names: new Map(input.features.map((f) => [f.id, f.name])),
        source: data.source,
        model: data.model,
        usage: data.usage,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The review failed.')
    } finally {
      setLoading(false)
    }
  }

  const count = input.features.length

  return (
    <section className="challenge-section" aria-labelledby="challenge-heading">
      <div className="summary-head">
        <div>
          <h2 id="challenge-heading">Challenge my top {count === 1 ? 'priority' : count || 3}</h2>
          <p className="summary">
            {live
              ? 'Claude argues the other side of your top 3. Each review is one call to Claude Opus 5.5, roughly 5–8 cents.'
              : 'Mock mode: rule-based text, no API calls. Set DECIDRA_AI=live in .env.local to use Claude.'}{' '}
            It never changes a score or a priority.
          </p>
        </div>
        <button
          type="button"
          className="button-ghost"
          onClick={run}
          disabled={loading || count === 0}
          aria-busy={loading}
        >
          {loading ? 'Reviewing…' : reply ? 'Run again' : `Challenge my top ${count || 3}`}
        </button>
      </div>

      {error && (
        <p className="notice" role="status">
          {error}
        </p>
      )}

      {reply && (
        <div className={stale ? 'challenge-result is-stale' : 'challenge-result'}>
          {stale && (
            <p className="notice" role="status">
              Your top {count} changed since this review. Run it again to update it.
            </p>
          )}
          <p className="challenge-overall">{reply.result.overall}</p>
          <ol className="challenge-list">
            {reply.result.features.map((f) => (
              <li key={f.id}>
                <h3>{reply.names.get(f.id)}</h3>
                {f.assumptions.length > 0 && (
                  <>
                    <p className="challenge-label">Questionable assumptions</p>
                    <ul>
                      {f.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </>
                )}
                {f.missingEvidence.length > 0 && (
                  <>
                    <p className="challenge-label">Missing evidence</p>
                    <ul>
                      {f.missingEvidence.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="challenge-label">Validate first</p>
                <p className="challenge-question">{f.validationQuestion}</p>
              </li>
            ))}
          </ol>
          <p className="challenge-meta">
            {reply.source === 'mock' && 'Mock review. No API call was made.'}
            {reply.source === 'cache' && 'Same top 3 as an earlier review, so this reused it. No new API call.'}
            {reply.source === 'claude' &&
              reply.usage &&
              `Reviewed by ${reply.model}: ${reply.usage.input_tokens.toLocaleString()} input and ${reply.usage.output_tokens.toLocaleString()} output tokens, about $${(
                reply.usage.input_tokens * USD_PER_TOKEN_IN +
                reply.usage.output_tokens * USD_PER_TOKEN_OUT
              ).toFixed(3)}.`}{' '}
            AI suggestions are unverified. The PM decides.
          </p>
        </div>
      )}
    </section>
  )
}
