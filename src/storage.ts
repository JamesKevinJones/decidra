import { confidenceOptions, impactOptions, sampleFeatures, type Feature } from './features.ts'

export const STORAGE_KEY = 'decidra.features.v1'
/** Where an unreadable saved backlog is moved, so the next save can't destroy it. */
export const BACKUP_KEY = `${STORAGE_KEY}.unreadable`

type Store = Pick<Storage, 'getItem' | 'setItem'>

const isText = (v: unknown): v is string => typeof v === 'string'

/** Saved data is untrusted: check every field before the app uses it. */
function isFeature(v: unknown): v is Feature {
  if (typeof v !== 'object' || v === null) return false
  const f = v as Record<string, unknown>
  const o = f.override as Record<string, unknown> | null | undefined
  return (
    isText(f.id) &&
    isText(f.name) &&
    f.name.trim() !== '' &&
    isText(f.description) &&
    Number.isSafeInteger(f.reach) &&
    (f.reach as number) >= 0 &&
    impactOptions.some((x) => x.value === f.impact) &&
    confidenceOptions.some((x) => x.value === f.confidence) &&
    typeof f.effort === 'number' &&
    Number.isFinite(f.effort) &&
    f.effort > 0 &&
    isText(f.evidence) &&
    isText(f.dependency) &&
    (o === null ||
      (typeof o === 'object' &&
        Number.isSafeInteger(o.priority) &&
        (o.priority as number) >= 1 &&
        isText(o.reason) &&
        o.reason.trim() !== ''))
  )
}

export function parseSaved(raw: string): Feature[] | null {
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data) || !data.every(isFeature)) return null
    if (new Set(data.map((f) => f.id)).size !== data.length) return null
    return data
  } catch {
    return null
  }
}

export type Loaded = { features: Feature[]; notice: string | null }

/** Saved backlog if there is a readable one, otherwise the samples. Never throws. */
export function loadFeatures(store: Store): Loaded {
  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return {
      features: sampleFeatures,
      notice: 'Browser storage isn’t available here, so changes will be lost when you close this tab.',
    }
  }
  if (raw === null) return { features: sampleFeatures, notice: null }

  const saved = parseSaved(raw)
  if (saved) return { features: saved, notice: null }

  try {
    store.setItem(BACKUP_KEY, raw)
  } catch {
    // Can't back it up. Still start from the samples; the notice says what happened.
  }
  return {
    features: sampleFeatures,
    notice: `Your saved backlog couldn’t be read, so Decidra started from the sample data. The unreadable copy was kept in browser storage under “${BACKUP_KEY}”.`,
  }
}

/** Returns an error message, or null when the save worked. */
export function saveFeatures(store: Store, features: Feature[]): string | null {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(features))
    return null
  } catch {
    return 'Couldn’t save to browser storage (it may be full or blocked). Export a CSV to keep your work.'
  }
}
