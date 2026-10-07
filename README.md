# Decidra

**From possibilities to priorities.**

Decidra is a small local web app that turns a feature backlog into a ranked,
explainable priority list using the RICE framework. You enter estimates. Decidra
calculates the scores, suggests an order, flags assumptions worth a second look,
and shows how fragile each ranking is. Then the product manager makes the final
call, with a recorded reason. **The tool recommends; the PM decides.**

Every calculation is plain, deterministic code: same input, same output, no AI
and no API calls. It runs entirely in your browser on your own machine.

Built phase by phase from the Airtribe workshop deck *Build a RICE
Prioritization Agent with Codex* (Anitha Kishorekumar), using its fictional
fitness app GymBuddy as sample data.

## The RICE formula

```
RICE score = (Reach × Impact × Confidence) ÷ Effort
```

| Input | Meaning | Allowed values |
|---|---|---|
| Reach | Users affected per quarter | Whole number, 0 or more |
| Impact | How much it helps each of them | 3 Massive, 2 High, 1 Medium, 0.5 Low, 0.25 Minimal |
| Confidence | How strong the evidence is | 100% strong, 80% some, 50% weak (80% is used as 0.8) |
| Effort | Total work in person-months | More than 0; decimals allowed |

Example: (1,000 × 2 × 0.8) ÷ 2 = **800**. Scores compare features with each
other. They are not revenue, ROI or a guaranteed outcome.

Equal scores are ordered by lower effort, then higher confidence, then the order
the features were added.

## What it does

- **Backlog editing:** add, edit and delete features in a side panel, with
  validation beside each field.
- **Live scoring:** the score, suggested rank and the working (1,000 × 2 × 0.8 ÷ 2)
  update as you type.
- **Assumption flags:** 100% confidence with no evidence; every feature rated
  Massive; effort under a quarter of the backlog's median; zero reach; a
  dependency or strategic note.
- **Sensitivity:** for each feature, how its score and rank would change at the
  other confidence levels.
- **PM override:** set a manual priority with a required reason. The score and
  suggested rank never change.
- **Saving:** changes are saved in the browser automatically and restored on
  reload.
- **Exports:** CSV export (opens in Excel or Google Sheets) and a plain-text
  stakeholder summary.

## Getting started

You need Node.js 24. The tests rely on Node running TypeScript directly, which
needs Node 22.18 or newer.

Install dependencies:

```bash
npm install
```

Start the app, then open http://localhost:5173:

```bash
npm run dev
```

Run the tests (Node's built-in test runner, no extra packages):

```bash
npm test
```

Check types and build for production:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Resetting the demo

Click **Reset demo data** above the backlog and confirm. This replaces the whole
backlog, including PM decisions, with the three GymBuddy samples.

To start completely fresh, delete the `decidra.features.v1` key in your browser's
DevTools (Application tab, then Local Storage) and reload.

If saved data can't be read, Decidra starts from the samples, shows a notice,
and keeps the unreadable copy under `decidra.features.v1.unreadable`.

## Project layout

```
src/
  features.ts      Feature type, rating scales, sample data, form validation
  scoring.ts       RICE score and ranking (pure functions, the only place maths happens)
  decisions.ts     assumption flags, sensitivity analysis, PM overrides
  storage.ts       saving to and loading from localStorage, with validation
  report.ts        CSV export and the stakeholder summary
  App.tsx          the page and backlog table
  FeaturePanel.tsx the add/edit side panel
  *.test.ts        tests for every module above
```

## Known limitations

- **Saved per browser, per device.** Data lives in that browser's localStorage.
  It isn't shared between people, devices or browsers, and clearing site data
  deletes it. Export a CSV to keep a copy.
- **Two open tabs overwrite each other.** The last change saved wins.
- **No undo.** Delete and Reset ask first but can't be reversed.
- **One backup only.** A second unreadable save replaces the earlier backup.
- **Garbage in, garbage out.** Flags catch outliers within one backlog, but not
  a team that underestimates everything by the same amount.
- **Sensitivity covers confidence only,** not reach, impact or effort.
- **Not secure storage.** localStorage is fine for a local prototype. Never put
  passwords or API keys in it.
- **One manual regression check.** The panel's drag-to-backdrop fix has no
  automated test, because there's no browser test runner. See `docs/VERIFY.md`.

## Possible future enhancements

- AI-assisted parsing of a messy feature list into suggested estimates, behind a
  mock adapter, with the API key kept on a server and every suggestion reviewed
  by the PM (deck Option A).
- A "Challenge my top 3" devil's-advocate review (deck Option B).
- CSV import, multiple named backlogs, and sensitivity for the other inputs.
- Shared storage, so a team can work on the same backlog.

## Three-minute demo

1. **The problem (30 s).** GymBuddy has three feature requests and capacity for
   one. Point at the RICE explainer.
2. **The calculation (45 s).** The Planner scores 800: 1,000 × 2 × 0.8 ÷ 2. Edit
   it, set effort to 4, and save. All three now score 400, and the order flips to
   Reminders, Videos, Planner, settled by effort. Zero AI calls.
3. **Challenge an assumption (45 s).** Edit Exercise Videos (100% confidence),
   clear its evidence note, and save. A flag appears. Open Reminders' "What if
   confidence changes?": at 50% it drops from rank 1 to rank 3.
4. **The human decision (30 s).** Edit the Planner, choose "Set a manual
   priority", enter 1 and a reason, and save. It moves to Priority 1 with a PM
   badge. Its score (400) and suggested rank (3) stay as they were.
5. **The finished product (30 s).** Refresh the page, and everything is still
   there. Click Export CSV and open it in a spreadsheet. Show the stakeholder
   summary.

Click **Reset demo data** before you start.
