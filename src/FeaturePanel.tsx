import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import {
  confidenceOptions,
  emptyDraft,
  impactOptions,
  toDraft,
  validateDraft,
  type Draft,
  type DraftErrors,
  type Feature,
} from './features'

type Props = {
  /** The feature being edited, or null when adding a new one. */
  feature: Feature | null
  /** The feature's current suggested rank, or null for a new feature. */
  suggestedRank: number | null
  /** Backlog size including this feature: the lowest priority a PM can set. */
  maxPriority: number
  onSave: (values: Omit<Feature, 'id'>) => void
  onDelete: () => void
  onClose: () => void
}

export function FeaturePanel({ feature, suggestedRank, maxPriority, onSave, onDelete, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState<Draft>(feature ? toDraft(feature) : emptyDraft)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [submitted, setSubmitted] = useState(false)
  // Drag-selecting text from a field onto the backdrop fires a click on the dialog too.
  // Only a press that also started on the backdrop should close the panel.
  const pressedBackdrop = useRef(false)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    // Closing before unmount lets the browser hand focus back to the button that opened it.
    return () => dialog?.close()
  }, [])

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    // After the first save attempt, errors clear as soon as the field is fixed.
    if (submitted) {
      const result = validateDraft(next, maxPriority)
      setErrors(result.ok ? {} : result.errors)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    const result = validateDraft(draft, maxPriority)
    if (result.ok) {
      onSave(result.values)
      return
    }
    setErrors(result.errors)
    const firstBad = Object.keys(result.errors)[0]
    formRef.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus()
  }

  const handleDelete = () => {
    if (feature && window.confirm(`Delete “${feature.name}”? This can’t be undone.`)) onDelete()
  }

  const fieldProps = (field: keyof DraftErrors) => ({
    id: `f-${field}`,
    name: field,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby':
      [field !== 'name' && `f-${field}-hint`, errors[field] && `f-${field}-error`]
        .filter(Boolean)
        .join(' ') || undefined,
  })

  const errorText = (field: keyof DraftErrors) =>
    errors[field] && (
      <p id={`f-${field}-error`} className="field-error">
        {errors[field]}
      </p>
    )

  return (
    <dialog
      ref={dialogRef}
      className="panel"
      aria-labelledby="panel-title"
      // Escape fires `cancel` synchronously; let React unmount the panel instead of
      // the browser closing it behind React's back.
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // Fallback for a native close that skipped `cancel`. The event is queued, so it can
      // arrive after a dev-mode remount reopened the dialog: only act if it's really closed.
      onClose={() => !dialogRef.current?.open && onClose()}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === dialogRef.current
      }}
      onClick={(e) => e.target === dialogRef.current && pressedBackdrop.current && onClose()}
    >
      <form ref={formRef} className="panel-body" onSubmit={handleSubmit} noValidate>
        <header className="panel-head">
          <h2 id="panel-title">{feature ? 'Edit feature' : 'Add feature'}</h2>
          <button type="button" className="button-ghost" onClick={onClose}>
            Cancel
          </button>
        </header>

        <div className="fields">
          <div className="field">
            <label htmlFor="f-name">Feature name</label>
            <input
              {...fieldProps('name')}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              autoComplete="off"
            />
            {errorText('name')}
          </div>

          <div className="field">
            <label htmlFor="f-description">
              Short description <span className="optional">optional</span>
            </label>
            <textarea
              id="f-description"
              rows={2}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="f-reach">Reach</label>
            <p id="f-reach-hint" className="hint">
              Users affected <strong>per quarter</strong> (three months). Use the same window for every feature.
            </p>
            <input
              {...fieldProps('reach')}
              inputMode="numeric"
              value={draft.reach}
              onChange={(e) => update({ reach: e.target.value })}
              autoComplete="off"
            />
            {errorText('reach')}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="f-impact">Impact</label>
              <select
                id="f-impact"
                value={draft.impact}
                onChange={(e) => update({ impact: Number(e.target.value) })}
              >
                {impactOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value} · {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="f-confidence">Confidence</label>
              <select
                id="f-confidence"
                value={draft.confidence}
                onChange={(e) => update({ confidence: Number(e.target.value) })}
              >
                {confidenceOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value}% · {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="f-effort">Effort</label>
            <p id="f-effort-hint" className="hint">
              Total person-months. Decimals are fine, like 1.5.
            </p>
            <input
              {...fieldProps('effort')}
              inputMode="decimal"
              value={draft.effort}
              onChange={(e) => update({ effort: e.target.value })}
              autoComplete="off"
            />
            {errorText('effort')}
          </div>

          <div className="field">
            <label htmlFor="f-evidence">Evidence or assumption</label>
            <p id="f-evidence-hint" className="hint">
              What your estimates rest on: research, data, or an honest guess.
            </p>
            <textarea
              id="f-evidence"
              rows={2}
              aria-describedby="f-evidence-hint"
              value={draft.evidence}
              onChange={(e) => update({ evidence: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="f-dependency">
              Dependency or strategic note <span className="optional">optional</span>
            </label>
            <p id="f-dependency-hint" className="hint">
              Anything that might justify a different order, like “Needed before the coach launch.”
            </p>
            <textarea
              id="f-dependency"
              rows={2}
              aria-describedby="f-dependency-hint"
              value={draft.dependency}
              onChange={(e) => update({ dependency: e.target.value })}
            />
          </div>

          <fieldset className="decision">
            <legend>PM decision</legend>
            <p className="hint">
              {suggestedRank === null
                ? 'The suggested rank is calculated once the feature is added.'
                : `Suggested rank from the score: ${suggestedRank}. An override changes the order, never the score.`}
            </p>
            <label className="radio">
              <input
                type="radio"
                name="decision"
                checked={draft.decision === 'accept'}
                onChange={() => update({ decision: 'accept' })}
              />
              Accept the suggested rank
            </label>
            <label className="radio">
              <input
                type="radio"
                name="decision"
                checked={draft.decision === 'override'}
                onChange={() => update({ decision: 'override' })}
              />
              Set a manual priority
            </label>

            {draft.decision === 'override' && (
              <>
                <div className="field">
                  <label htmlFor="f-priority">Priority</label>
                  <p id="f-priority-hint" className="hint">
                    1 is first. From 1 to {maxPriority}.
                  </p>
                  <input
                    {...fieldProps('priority')}
                    inputMode="numeric"
                    value={draft.priority}
                    onChange={(e) => update({ priority: e.target.value })}
                    autoComplete="off"
                  />
                  {errorText('priority')}
                </div>
                <div className="field">
                  <label htmlFor="f-reason">Reason</label>
                  <p id="f-reason-hint" className="hint">
                    For example: a dependency, a regulatory deadline, or a commitment to a customer.
                  </p>
                  <textarea
                    {...fieldProps('reason')}
                    rows={2}
                    value={draft.reason}
                    onChange={(e) => update({ reason: e.target.value })}
                  />
                  {errorText('reason')}
                </div>
              </>
            )}
          </fieldset>
        </div>

        <footer className="panel-foot">
          {feature && (
            <button type="button" className="button-danger" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button type="submit" className="button-primary">
            {feature ? 'Save changes' : 'Add feature'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
