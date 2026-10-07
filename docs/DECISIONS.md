# Decisions

Append-only. Newest at the top. Never edit an old entry — if it stops being
true, add a new one that supersedes it and say so.

---

## 2026-10-07 — Unreadable saved data is backed up, never silently replaced

**Context.** Phase 5 restores the backlog from localStorage. Saved data can be corrupted, hand-edited or from an older shape.

**Decision.** `loadFeatures()` validates every field. If the data fails, it copies the raw value to `decidra.features.v1.unreadable`, starts from the samples, and the app shows a notice. Valid data, even an empty list, is never replaced by samples.

**Why not the alternative.** Quietly loading the samples looks fine, but the next save would overwrite the real backlog with no trace.

**Consequences.** A second corruption overwrites the first backup. Saving happens in the event handlers (`commit()` in App.tsx), not in an effect, so nothing is written on first load.

---

## 2026-10-07 — CSV is RFC 4180 with CRLF, a UTF-8 BOM, and formula guarding

**Context.** The deck asks for safely escaped CSV that opens in Excel or Google Sheets.

**Decision.** Cells with a comma, quote or line break are quoted, with inner quotes doubled. Text starting with = + - @ tab or CR gets a leading apostrophe. Rows end in CRLF. The download is prefixed with a BOM. Scores are rounded to 2 dp, as on screen.

**Why not the alternative.** Without the BOM, Excel on Windows misreads ₹ and é. Without the apostrophe, a feature named "=HYPERLINK(...)" runs as a formula.

**Consequences.** A guarded cell shows a visible leading apostrophe in some spreadsheet apps. That's the accepted trade-off.

---

## 2026-10-07 — PM overrides claim slots; everything else fills the gaps

**Context.** Setting Videos to priority 1 while the Planner is still suggested rank 1 would give two features priority 1.

**Decision.** `applyOverrides()` places overridden features in their chosen slot first. Clashes go to the nearest free slot, with the better suggested rank first, and a priority past the end is clamped to last. Non-overridden features then fill the remaining slots in suggested order. The table is sorted by this final priority and shows the suggested rank in its own column.

**Why not the alternative.** Sorting by "priority minus a half" is simpler but puts a feature moved down one place too high, because the others shift up around it. Showing duplicate priorities pushes the conflict back onto the PM.

**Consequences.** Scores and suggested ranks are never touched by an override (tested). A stored priority can exceed the backlog size after deletions; it's clamped at display time.

---

## 2026-10-07 — "Unusually low effort" means under a quarter of the backlog median

**Context.** The deck's Phase 4 asks to flag unusually low effort but gives no threshold.

**Decision.** Flag effort below 0.25 × the median effort, only when the backlog has 3 or more features. Kevin's call.

**Why not the alternative.** A fixed floor (say 0.5 person-months) flags everything for a small-task team and nothing for a team whose features all take 6+ months. The mean would be dragged down by the very outlier we're trying to catch.

**Consequences.** It can't catch a team that underestimates everything evenly. That needs estimate-versus-actual history, which is out of scope.

---

## 2026-10-06 — Tests use node:test, not Vitest or Jest

**Context.** The deck asks for tests from Phase 3 and for the fewest dependencies.

**Decision.** `npm test` runs `node --test`. Node 24 runs `.ts` test files directly by stripping types, and the project already sets `allowImportingTsExtensions` and `erasableSyntaxOnly`.

**Why not the alternative.** Vitest is the usual choice with Vite, but it's a dependency the pure-logic tests don't need. Add it only if component or DOM tests become necessary.

**Consequences.** Tests import with `.ts` extensions and can't use TS-only syntax like enums. Logic under test must stay free of DOM APIs.

---

## 2026-10-06 — The feature editor is a native <dialog> side panel

**Context.** Phase 2 needs add/edit/delete. Kevin chose a side panel over inline row editing.

**Decision.** `FeaturePanel` opens a modal `<dialog>` styled as a right-hand panel. Numeric fields are text inputs (`inputMode` numeric/decimal) validated by `validateDraft()`, not `type="number"`.

**Why not the alternative.** `type="number"` reports an empty value for input like "1e3" or "abc", so the form couldn't tell "missing" from "invalid". The native dialog gives focus trapping, Escape and focus return without a library.

**Consequences.** Delete uses `window.confirm`. Escape goes through `cancel`. A `useLayoutEffect` cleanup closes the dialog so focus returns to the opener.

---

## 2026-10-06 — Confidence is stored as a percentage, converted at calculation time

**Context.** The deck's inputs are 100/80/50% and its Phase 3 prompt says to convert percentages to decimals before calculating.

**Decision.** `Feature.confidence` holds 80, not 0.8. The scoring engine divides by 100.

**Why not the alternative.** Storing 0.8 makes the UI and CSV do the conversion instead. The deck's "80,000 instead of 800" bug is exactly a missed conversion, and keeping it in one function makes it one test.

**Consequences.** Anything that does maths on confidence goes through the scoring engine.

---

## 2026-10-06 — Built in Claude Code, phase by phase, AI extension skipped

**Context.** The source is a Codex workshop deck with Prompt 0 plus Phases 1–7 and an optional OpenAI extension.

**Decision.** Same phases and same stack (React + TS + Vite, plain CSS, localStorage), with an approval stop after each phase. The optional AI extension is out of scope for now.

**Why not the alternative.** Building all seven phases at once skips the checkpoints the deck is built around. The AI extension needs a server-side key and adds cost to an app that's useful without it.

**Consequences.** If the AI extension is added later, it goes behind a mock adapter and a server-side endpoint, never a key in the browser.

---
