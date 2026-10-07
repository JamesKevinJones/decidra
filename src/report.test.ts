import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sampleFeatures, type Feature } from './features.ts'
import { rankFeatures } from './scoring.ts'
import { applyOverrides, assumptionFlags } from './decisions.ts'
import { csvCell, csvHeader, stakeholderSummary, toCsv } from './report.ts'

const build = (features: Feature[]) => {
  const decided = applyOverrides(rankFeatures(features))
  const flags = assumptionFlags(features)
  return { csv: toCsv(decided, flags), summary: stakeholderSummary(decided, flags) }
}

/** A small RFC 4180 parser, so tests check what a spreadsheet would actually see. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted && c === '"' && text[i + 1] === '"') {
      cell += '"'
      i++
    } else if (c === '"') {
      quoted = !quoted
    } else if (!quoted && c === ',') {
      row.push(cell)
      cell = ''
    } else if (!quoted && c === '\r' && text[i + 1] === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i++
    } else {
      cell += c
    }
  }
  return rows
}

const overridden = sampleFeatures.map((f) =>
  f.id === 'gb-2' ? { ...f, override: { priority: 1, reason: 'Needed for the coach' } } : f,
)

test('escapes commas, quotes and line breaks', () => {
  assert.equal(csvCell('plain'), 'plain')
  assert.equal(csvCell('a, b'), '"a, b"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('line 1\nline 2'), '"line 1\nline 2"')
  assert.equal(csvCell(1.5), '1.5')
})

test('neutralises spreadsheet formulas in text', () => {
  assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`)
  assert.equal(csvCell('+1'), "'+1")
  assert.equal(csvCell('-2'), "'-2")
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)")
  assert.equal(csvCell('a=b'), 'a=b')
})

test('score, suggested rank and PM priority are separate columns', () => {
  const [header, ...rows] = parseCsv(build(overridden).csv)
  assert.deepEqual(header, csvHeader)
  const col = (name: string) => header.indexOf(name)
  const videos = rows.find((r) => r[0] === 'Exercise Demonstration Videos')!
  assert.equal(videos[col('RICE score')], '400')
  assert.equal(videos[col('Suggested rank')], '3')
  assert.equal(videos[col('PM priority')], '1')
  assert.equal(videos[col('Override reason')], 'Needed for the coach')
  assert.equal(videos[col('Confidence')], '100%')
  assert.equal(rows[0][0], 'Exercise Demonstration Videos', 'rows follow final priority')
})

test('awkward text survives a round trip, including Unicode', () => {
  const tricky = {
    ...sampleFeatures[0],
    name: '=cmd|"/c calc"!A1',
    description: 'Café plan, ₹0 cost, "beta"\nsecond line 💪',
    dependency: 'Needs, the "SDK"',
  }
  const [header, row] = parseCsv(build([tricky]).csv)
  assert.equal(row.length, header.length)
  assert.equal(row[0], `'=cmd|"/c calc"!A1`)
  assert.equal(row[1], 'Café plan, ₹0 cost, "beta"\nsecond line 💪')
  assert.match(row[header.indexOf('Assumption flags')], /Needs, the "SDK"/)
})

test('scores are rounded to 2 decimals in the export', () => {
  const thirds = { ...sampleFeatures[0], reach: 1000, impact: 1, confidence: 100, effort: 3 }
  const [header, row] = parseCsv(build([thirds]).csv)
  assert.equal(row[header.indexOf('RICE score')], '333.33')
})

test('summary lists priorities, flags and overrides from the numbers', () => {
  const unsupported = overridden.map((f) => (f.id === 'gb-1' ? { ...f, confidence: 100, evidence: '' } : f))
  const { summary } = build(unsupported)
  assert.match(summary, /^GymBuddy backlog: 3 features/)
  assert.match(summary, /1\. Exercise Demonstration Videos \(score 400, suggested rank 3, moved by the PM\)/)
  assert.match(summary, /2\. Beginner Workout Planner \(score 1,000\)/)
  assert.match(summary, /- Beginner Workout Planner: Confidence is 100%/)
  assert.match(summary, /suggested rank 3, set to priority 1\. Reason: Needed for the coach/)
})

test('summary with no flags or overrides says so, and handles an empty backlog', () => {
  const { summary } = build(sampleFeatures)
  assert.match(summary, /- None flagged\./)
  assert.match(summary, /- None\. The order follows the scores\./)
  assert.match(build([]).summary, /empty/)
})
