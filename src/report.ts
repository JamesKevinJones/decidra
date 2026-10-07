import type { Decided, Flag } from './decisions.ts'

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/**
 * One CSV cell. Text that a spreadsheet would run as a formula (starts with =, +,
 * -, @, tab or carriage return) gets a leading apostrophe, then anything with a
 * comma, quote or line break is quoted with inner quotes doubled.
 */
export function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

export const csvHeader = [
  'Feature name',
  'Description',
  'Reach (users per quarter)',
  'Impact',
  'Confidence',
  'Effort (person-months)',
  'RICE score',
  'Suggested rank',
  'PM priority',
  'Evidence note',
  'Assumption flags',
  'Override reason',
]

/** Rows in final priority order. Scores are rounded to 2 dp, as on screen. */
export function toCsv(decided: Decided[], flags: Map<string, Flag[]>): string {
  const rows = decided.map(({ feature: f, score, rank, finalPriority }) => [
    f.name,
    f.description,
    f.reach,
    f.impact,
    `${f.confidence}%`,
    f.effort,
    score === null ? '' : Math.round(score * 100) / 100,
    rank ?? '',
    finalPriority ?? '',
    f.evidence,
    (flags.get(f.id) ?? []).map((x) => x.message).join('; '),
    f.override?.reason ?? '',
  ])
  return [csvHeader, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/** A plain-text summary built only from the saved numbers. No AI, so it can't invent a claim. */
export function stakeholderSummary(decided: Decided[], flags: Map<string, Flag[]>): string {
  const scored = decided.filter((d) => d.finalPriority !== null)
  if (scored.length === 0) return 'The backlog is empty, so there is nothing to prioritize yet.'

  const top = scored.slice(0, 3).map((d) => {
    const notes = [`score ${fmt.format(d.score!)}`]
    if (d.feature.override) notes.push(`suggested rank ${d.rank}, moved by the PM`)
    return `${d.finalPriority}. ${d.feature.name} (${notes.join(', ')})`
  })

  const assumptions = decided.flatMap((d) =>
    (flags.get(d.feature.id) ?? []).map((x) => `- ${d.feature.name}: ${x.message}`),
  )

  const overrides = scored
    .filter((d) => d.feature.override)
    .map(
      (d) =>
        `- ${d.feature.name}: suggested rank ${d.rank}, set to priority ${d.finalPriority}. Reason: ${d.feature.override!.reason}`,
    )

  return [
    `GymBuddy backlog: ${decided.length} ${decided.length === 1 ? 'feature' : 'features'} scored with RICE.`,
    '',
    scored.length > 3 ? 'Top 3 priorities' : 'Priorities',
    ...top,
    '',
    'Assumptions to check',
    ...(assumptions.length ? assumptions : ['- None flagged.']),
    '',
    'PM overrides',
    ...(overrides.length ? overrides : ['- None. The order follows the scores.']),
    '',
    'RICE scores compare features with each other. They are not revenue, ROI or a guaranteed outcome.',
  ].join('\n')
}
