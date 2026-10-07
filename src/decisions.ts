import { confidenceOptions, type Feature } from './features.ts'
import { rankFeatures, type Ranked } from './scoring.ts'

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export type Flag = {
  kind: 'unsupported-confidence' | 'all-max-impact' | 'low-effort' | 'zero-reach' | 'dependency'
  message: string
}

const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Rule-based checks that ask for a second look. A flag never means the estimate
 * is wrong, and never changes the score.
 */
export function assumptionFlags(features: Feature[]): Map<string, Flag[]> {
  const allMaxImpact = features.length >= 2 && features.every((f) => f.impact === 3)
  // "Low" is relative to this backlog. With fewer than 3 features there's no typical value.
  const typicalEffort = features.length >= 3 ? median(features.map((f) => f.effort)) : null

  return new Map(
    features.map((f) => {
      const flags: Flag[] = []
      if (f.confidence === 100 && !f.evidence.trim())
        flags.push({
          kind: 'unsupported-confidence',
          message: 'Confidence is 100% but there’s no evidence note. Add what supports it, or consider 80%.',
        })
      if (allMaxImpact)
        flags.push({
          kind: 'all-max-impact',
          message: 'Every feature is rated Massive impact, so impact isn’t telling them apart.',
        })
      if (typicalEffort !== null && f.effort < typicalEffort / 4)
        flags.push({
          kind: 'low-effort',
          message: `Effort is well below this backlog’s typical estimate (${fmt.format(typicalEffort)} person-months). Worth a second look, since a low effort raises the score sharply.`,
        })
      if (f.reach === 0)
        flags.push({
          kind: 'zero-reach',
          message: 'Reach is 0, so the score is 0. Check whether anyone would use this in the quarter.',
        })
      if (f.dependency.trim())
        flags.push({
          kind: 'dependency',
          message: `Dependency or strategic note: “${f.dependency.trim()}” This may justify a different order than the score.`,
        })
      return [f.id, flags]
    }),
  )
}

export type WhatIf = { confidence: number; score: number; rank: number }

/**
 * The feature's score and suggested rank at each other confidence level, with
 * the rest of the backlog unchanged.
 */
export function sensitivity(features: Feature[], id: string): WhatIf[] {
  const feature = features.find((f) => f.id === id)
  if (!feature) return []
  return confidenceOptions
    .filter((o) => o.value !== feature.confidence)
    .flatMap(({ value }) => {
      const changed = features.map((f) => (f.id === id ? { ...f, confidence: value } : f))
      const r = rankFeatures(changed).find((x) => x.feature.id === id)
      return r && r.score !== null && r.rank !== null
        ? [{ confidence: value, score: r.score, rank: r.rank }]
        : []
    })
}

export function describeWhatIf(from: WhatIf, to: WhatIf): string {
  const direction = to.confidence < from.confidence ? 'decreases' : 'increases'
  const rank =
    to.rank === from.rank
      ? `its suggested rank stays at ${from.rank}`
      : `its suggested rank changes from ${from.rank} to ${to.rank}`
  return `If confidence ${direction} from ${from.confidence}% to ${to.confidence}%, this feature’s score changes from ${fmt.format(from.score)} to ${fmt.format(to.score)} and ${rank}.`
}

export type Decided = Ranked & {
  /** Where the PM's decisions put this feature. Null when it can't be scored. */
  finalPriority: number | null
}

/**
 * Builds the final order. Overridden features claim their chosen slot first
 * (clashes go to the nearest free slot, better suggested rank first), then the
 * rest fill the remaining slots in suggested order. Scores and suggested ranks
 * are passed through untouched.
 */
export function applyOverrides(ranked: Ranked[]): Decided[] {
  const scored = ranked.filter((r) => r.rank !== null)
  const slots: (Ranked | undefined)[] = new Array(scored.length)

  const freeSlotNear = (i: number) => {
    for (let j = i; j < slots.length; j++) if (!slots[j]) return j
    for (let j = i - 1; j >= 0; j--) if (!slots[j]) return j
    return -1
  }

  const overridden = scored
    .filter((r) => r.feature.override)
    .toSorted((a, b) => a.feature.override!.priority - b.feature.override!.priority)
  for (const r of overridden) {
    const wanted = Math.min(r.feature.override!.priority, slots.length) - 1
    slots[freeSlotNear(wanted)] = r
  }
  for (const r of scored) {
    if (!r.feature.override) slots[freeSlotNear(0)] = r
  }

  return [
    ...slots.map((r, i) => ({ ...r!, finalPriority: i + 1 })),
    ...ranked.filter((r) => r.rank === null).map((r) => ({ ...r, finalPriority: null })),
  ]
}
