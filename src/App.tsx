import { useState } from 'react'
import { impactLabel, newId, sampleFeatures, type Feature } from './features'
import { FeaturePanel } from './FeaturePanel'
import { ChallengePanel } from './ChallengePanel'
import { rankFeatures } from './scoring'
import { applyOverrides, assumptionFlags, describeWhatIf, sensitivity } from './decisions'
import { loadFeatures, saveFeatures } from './storage'
import { stakeholderSummary, toCsv } from './report'

const rice = [
  { letter: 'R', name: 'Reach', question: 'How many users benefit each quarter?' },
  { letter: 'I', name: 'Impact', question: 'How much does it help each of them?' },
  { letter: 'C', name: 'Confidence', question: 'How strong is the evidence?' },
  { letter: 'E', name: 'Effort', question: 'How many person-months of work?' },
]

const number = new Intl.NumberFormat('en-US')
// Display only. The engine never rounds.
const score = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** Which feature the side panel is open for: an id, 'new', or closed. */
type Editing = string | 'new' | null

// Touching `localStorage` itself can throw (blocked storage), so only reach for it
// inside the calls, where loadFeatures/saveFeatures catch it.
const browserStore = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
}

function downloadCsv(csv: string) {
  // The byte-order mark makes Excel read the file as UTF-8, so ₹ and é survive.
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `decidra-backlog-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [loaded] = useState(() => loadFeatures(browserStore))
  const [features, setFeatures] = useState<Feature[]>(loaded.features)
  const [saveError, setSaveError] = useState<string | null>(null)
  /** The summary text last copied, and whether it worked. Stale once the summary changes. */
  const [copied, setCopied] = useState<{ text: string; ok: boolean } | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const count = features.length
  const ranked = rankFeatures(features)
  const decided = applyOverrides(ranked)
  const flags = assumptionFlags(features)
  const flagCount = [...flags.values()].flat().length
  const overrideCount = features.filter((f) => f.override).length
  const summary = stakeholderSummary(decided, flags)
  const notice = saveError ?? loaded.notice
  const editingFeature = features.find((f) => f.id === editing) ?? null
  const editingRank = ranked.find((r) => r.feature.id === editing)?.rank ?? null

  // Every change is saved as it happens; there is no Save button to forget.
  const commit = (next: Feature[]) => {
    setFeatures(next)
    setSaveError(saveFeatures(browserStore, next))
  }

  const save = (values: Omit<Feature, 'id'>) => {
    commit(
      editing === 'new'
        ? [...features, { id: newId(), ...values }]
        : features.map((f) => (f.id === editing ? { ...f, ...values } : f)),
    )
    setEditing(null)
  }

  const remove = () => {
    commit(features.filter((f) => f.id !== editing))
    setEditing(null)
  }

  const resetDemo = () => {
    if (window.confirm('Replace the whole backlog, including PM decisions, with the GymBuddy samples? This can’t be undone.'))
      commit(sampleFeatures)
  }

  // Wrapped so a missing clipboard API (plain http) becomes a rejection, not a crash.
  const copySummary = () =>
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(summary))
      .then(
      () => setCopied({ text: summary, ok: true }),
      () => setCopied({ text: summary, ok: false }),
    )
  const copyState = copied?.text === summary ? (copied.ok ? 'copied' : 'failed') : 'idle'

  return (
    <div className="page">
      <header className="masthead">
        <p className="wordmark">Decidra</p>
        <p className="tagline">From possibilities to priorities.</p>
      </header>

      <main>
        <section className="explainer" aria-labelledby="rice-heading">
          <h1 id="rice-heading">Rank your backlog by value per unit of effort.</h1>
          <p className="lede">
            RICE scores each feature on four estimates, so every idea is compared the same way
            instead of by whoever argues loudest.
          </p>
          <dl className="rice-grid">
            {rice.map((r) => (
              <div key={r.letter} className="rice-item">
                <dt>
                  <span className="rice-letter" aria-hidden="true">{r.letter}</span>
                  {r.name}
                </dt>
                <dd>{r.question}</dd>
              </div>
            ))}
          </dl>
          <p className="formula">
            Score = (Reach × Impact × Confidence) ÷ Effort
          </p>
        </section>

        <section className="backlog" aria-labelledby="backlog-heading">
          <div className="backlog-head">
            <div>
              <h2 id="backlog-heading">GymBuddy backlog</h2>
              <p className="summary">
                {count} {count === 1 ? 'feature' : 'features'}
                {flagCount > 0 && ` · ${flagCount} ${flagCount === 1 ? 'flag' : 'flags'} to review`}
                {overrideCount > 0 &&
                  ` · ${overrideCount} PM ${overrideCount === 1 ? 'override' : 'overrides'}`}
              </p>
            </div>
            <div className="backlog-actions">
              <button type="button" className="button-ghost" onClick={resetDemo}>
                Reset demo data
              </button>
              <button
                type="button"
                className="button-ghost"
                onClick={() => downloadCsv(toCsv(decided, flags))}
                disabled={count === 0}
              >
                Export CSV
              </button>
              <button type="button" className="button-primary" onClick={() => setEditing('new')}>
                Add feature
              </button>
            </div>
          </div>

          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col" className="num">Priority</th>
                  <th scope="col">Feature</th>
                  <th scope="col" className="num">Reach / qtr</th>
                  <th scope="col">Impact</th>
                  <th scope="col" className="num">Confidence</th>
                  <th scope="col" className="num">Effort (p-m)</th>
                  <th scope="col" className="num">RICE score</th>
                  <th scope="col" className="num">Suggested rank</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {decided.map(({ feature: f, score: s, rank, finalPriority }) => {
                  const featureFlags = flags.get(f.id) ?? []
                  const whatIfs = s !== null && rank !== null ? sensitivity(features, f.id) : []
                  return (
                  <tr key={f.id}>
                    <td className="num priority">
                      {finalPriority ?? '–'}
                      {f.override && <span className="pm-badge">PM</span>}
                    </td>
                    <th scope="row">
                      <span className="feature-name">{f.name}</span>
                      {f.description && <span className="feature-desc">{f.description}</span>}
                      {f.override && (
                        <p className="override-note">
                          <strong>PM override:</strong> {f.override.reason}
                        </p>
                      )}
                      {featureFlags.length > 0 && (
                        <ul className="flags" aria-label="Assumption flags">
                          {featureFlags.map((flag) => (
                            <li key={flag.kind}>{flag.message}</li>
                          ))}
                        </ul>
                      )}
                      {whatIfs.length > 0 && (
                        <details className="whatif">
                          <summary>What if confidence changes?</summary>
                          <ul>
                            {whatIfs.map((w) => (
                              <li key={w.confidence}>
                                {describeWhatIf(
                                  { confidence: f.confidence, score: s!, rank: rank! },
                                  w,
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </th>
                    <td className="num">{number.format(f.reach)}</td>
                    <td>
                      {f.impact} <span className="muted">{impactLabel(f.impact)}</span>
                    </td>
                    <td className="num">{f.confidence}%</td>
                    <td className="num">{f.effort}</td>
                    <td className="num">
                      {s === null ? (
                        <span className="muted">Can’t score</span>
                      ) : (
                        <>
                          <span className="score">{score.format(s)}</span>
                          <span className="breakdown">
                            {number.format(f.reach)} × {f.impact} × {f.confidence / 100} ÷ {f.effort}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="num rank">{rank ?? '–'}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="button-ghost"
                        onClick={() => setEditing(f.id)}
                        aria-label={`Edit ${f.name}`}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                  )
                })}
                {count === 0 && (
                  <tr>
                    <td colSpan={9} className="empty">
                      No features yet. Add one to start building the backlog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {count > 1 && (
            <p className="table-note">
              Suggested rank: highest score first; equal scores go to lower effort, then higher
              confidence, then the order they were added. Priority is the final order after PM
              overrides. Flags ask for a second look; they never change a score.
            </p>
          )}
        </section>

        <ChallengePanel decided={decided} flags={flags} />

        <section className="summary-section" aria-labelledby="summary-heading">
          <div className="summary-head">
            <div>
              <h2 id="summary-heading">Stakeholder summary</h2>
              <p className="summary">Built from the numbers above. No AI, so it can’t invent a claim.</p>
            </div>
            <button type="button" className="button-ghost" onClick={copySummary}>
              {copyState === 'copied' ? 'Copied' : 'Copy summary'}
            </button>
          </div>
          {copyState === 'failed' && (
            <p className="notice" role="status">
              Couldn’t copy. Select the text below and copy it by hand.
            </p>
          )}
          <div className="summary-text">{summary}</div>
        </section>
      </main>

      {editing !== null && (
        <FeaturePanel
          key={editing}
          feature={editingFeature}
          suggestedRank={editingRank}
          maxPriority={editing === 'new' ? count + 1 : count}
          onSave={save}
          onDelete={remove}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

export default App
