/** A PM decision to put a feature somewhere other than its suggested rank. */
export type Override = {
  /** 1 = first. */
  priority: number
  reason: string
}

export type Feature = {
  id: string
  name: string
  description: string
  /** Users affected per quarter. */
  reach: number
  /** 3, 2, 1, 0.5 or 0.25. */
  impact: number
  /** Stored as a percentage (80 means 80%). */
  confidence: number
  /** Person-months. */
  effort: number
  evidence: string
  /** Dependency or strategic reason that might justify a different order. Optional. */
  dependency: string
  /** Null means the PM accepts the suggested rank. Never changes the score. */
  override: Override | null
}

export const impactOptions = [
  { value: 3, label: 'Massive' },
  { value: 2, label: 'High' },
  { value: 1, label: 'Medium' },
  { value: 0.5, label: 'Low' },
  { value: 0.25, label: 'Minimal' },
]

export const confidenceOptions = [
  { value: 100, label: 'Strong evidence' },
  { value: 80, label: 'Some evidence' },
  { value: 50, label: 'Weak evidence' },
]

/**
 * A unique id. `crypto.randomUUID` only exists on https or localhost, so opening the
 * app from a phone at http://192.168.x.x would otherwise break Add feature.
 */
export const newId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')

export const impactLabel = (value: number) =>
  impactOptions.find((o) => o.value === value)?.label ?? ''

// GymBuddy is the workshop's fictional fitness app.
export const sampleFeatures: Feature[] = [
  {
    id: 'gb-1',
    name: 'Beginner Workout Planner',
    description: 'A guided four-week plan for people new to the gym.',
    reach: 1000,
    impact: 2,
    confidence: 80,
    effort: 2,
    evidence: 'New-member survey and recurring support questions about where to start.',
    dependency: '',
    override: null,
  },
  {
    id: 'gb-2',
    name: 'Exercise Demonstration Videos',
    description: 'Short clips showing correct form for each exercise.',
    reach: 800,
    impact: 1,
    confidence: 100,
    effort: 2,
    evidence: 'Most-requested item in last quarter\'s feature-request board.',
    dependency: '',
    override: null,
  },
  {
    id: 'gb-3',
    name: 'Workout Reminder Notifications',
    description: 'Push reminders on the days a member planned to train.',
    reach: 1500,
    impact: 0.5,
    confidence: 80,
    effort: 1.5,
    evidence: 'Members who skip a planned session often stop logging for weeks.',
    dependency: '',
    override: null,
  },
]

/** What the form holds: numbers stay as typed text until they pass validation. */
export type Draft = {
  name: string
  description: string
  reach: string
  impact: number
  confidence: number
  effort: string
  evidence: string
  dependency: string
  decision: 'accept' | 'override'
  priority: string
  reason: string
}

export type DraftErrors = Partial<Record<'name' | 'reach' | 'effort' | 'priority' | 'reason', string>>

export const emptyDraft: Draft = {
  name: '',
  description: '',
  reach: '',
  impact: 1,
  confidence: 80,
  effort: '',
  evidence: '',
  dependency: '',
  decision: 'accept',
  priority: '',
  reason: '',
}

export const toDraft = (f: Feature): Draft => ({
  name: f.name,
  description: f.description,
  reach: String(f.reach),
  impact: f.impact,
  confidence: f.confidence,
  effort: String(f.effort),
  evidence: f.evidence,
  dependency: f.dependency,
  decision: f.override ? 'override' : 'accept',
  priority: f.override ? String(f.override.priority) : '',
  reason: f.override?.reason ?? '',
})

/**
 * Checks a draft and returns either the clean values or a message per bad field.
 * Commas are allowed as thousands separators ("1,000"). `maxPriority` is the
 * backlog size including this feature.
 */
export function validateDraft(
  draft: Draft,
  maxPriority: number,
): { ok: true; values: Omit<Feature, 'id'> } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {}

  const name = draft.name.trim()
  if (!name) errors.name = 'Give the feature a name.'

  const reachText = draft.reach.replaceAll(',', '').trim()
  const reach = Number(reachText)
  if (!reachText) errors.reach = 'Enter how many users this reaches per quarter.'
  else if (!Number.isFinite(reach)) errors.reach = 'Reach must be a number, like 1000.'
  else if (reach < 0) errors.reach = 'Reach can’t be negative.'
  else if (!/^\d+$/.test(reachText)) errors.reach = 'Reach counts people, so use a whole number.'
  else if (!Number.isSafeInteger(reach)) errors.reach = 'That number is too large.'

  const effortText = draft.effort.trim()
  const effort = Number(effortText)
  if (!effortText) errors.effort = 'Enter the effort in person-months.'
  else if (!/^-?(\d+\.?\d*|\.\d+)$/.test(effortText) || !Number.isFinite(effort))
    errors.effort = 'Effort must be a number, like 1.5.'
  else if (effort <= 0)
    errors.effort = 'Effort must be more than 0. Nothing takes zero work, and the score divides by it.'

  const overriding = draft.decision === 'override'
  const priorityText = draft.priority.trim()
  const priority = Number(priorityText)
  const reason = draft.reason.trim()
  if (overriding) {
    if (!/^\d+$/.test(priorityText) || priority < 1 || priority > maxPriority)
      errors.priority = `Enter a whole number from 1 to ${maxPriority}.`
    if (!reason) errors.reason = 'Say why. The reason is what makes an override reviewable later.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    values: {
      name,
      description: draft.description.trim(),
      reach,
      impact: draft.impact,
      confidence: draft.confidence,
      effort,
      evidence: draft.evidence.trim(),
      dependency: draft.dependency.trim(),
      override: overriding ? { priority, reason } : null,
    },
  }
}
