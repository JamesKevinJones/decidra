import type { Feature } from './features.ts'

type Inputs = Pick<Feature, 'reach' | 'impact' | 'confidence' | 'effort'>

/**
 * RICE = (Reach × Impact × Confidence) ÷ Effort, with confidence converted from
 * a percentage (80 → 0.8). Returns null for inputs that can't be scored, rather
 * than Infinity or NaN. Never rounds: rounding is for display only.
 */
export function riceScore({ reach, impact, confidence, effort }: Inputs): number | null {
  const finite = [reach, impact, confidence, effort].every(Number.isFinite)
  if (!finite || reach < 0 || impact < 0 || confidence < 0 || effort <= 0) return null
  return (reach * impact * (confidence / 100)) / effort
}

export type Ranked = {
  feature: Feature
  score: number | null
  /** 1 = highest priority. Null when the feature can't be scored. */
  rank: number | null
}

// Scores that are equal on paper can differ in the last bit (1×3×0.8÷4 gives
// 0.6000000000000001, 1×3×0.5÷2.5 gives 0.6), so equality allows for that.
const sameScore = (a: number, b: number) =>
  Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b))

/**
 * Highest score first. Ties: lower effort, then higher confidence, then the
 * order features were added. Unscorable features go last, unranked.
 * Returns a new array; the input is never reordered.
 */
export function rankFeatures(features: Feature[]): Ranked[] {
  const sorted = features
    .map((feature, index) => ({ feature, index, score: riceScore(feature) }))
    .toSorted((a, b) => {
      if (a.score === null || b.score === null) {
        if (a.score !== b.score) return a.score === null ? 1 : -1
      } else if (!sameScore(a.score, b.score)) {
        return b.score - a.score
      }
      return (
        a.feature.effort - b.feature.effort ||
        b.feature.confidence - a.feature.confidence ||
        a.index - b.index
      )
    })

  return sorted.map(({ feature, score }, i) => ({
    feature,
    score,
    rank: score === null ? null : i + 1,
  }))
}
