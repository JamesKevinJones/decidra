# Project State

> Updated at the end of every session, by whichever agent was driving.
> Keep it under a page. This is a baton, not a diary.

**Last updated:** 2026-10-07 by claude-code

## Where things stand

All seven deck phases are done. Decidra runs at http://localhost:5173
(`npm run dev`). It covers backlog editing with validation, live RICE scoring
and ranking, assumption flags, confidence sensitivity, PM overrides with
reasons, localStorage persistence with safe loading, CSV export and a
stakeholder summary. README.md documents setup, the formula, limitations and
the three-minute demo. The demo was rehearsed end to end in the browser and
every number matched. Build, lint (0 warnings) and 44 tests pass.

Public at https://github.com/JamesKevinJones/decidra. `main` is at `e5d566e`
(3 commits), in sync with `origin/main`. The security-review workflow pins
`claude-opus-5-5`, synced from the `_agent-framework` template, which was
rolled out to the other projects the same day.

## In progress

- [ ] Nothing in progress.

## The exact next step

Nothing is required. Options, in order of value:

1. `gh secret set CLAUDE_API_KEY --repo JamesKevinJones/decidra`, so the
   security-review workflow runs on PRs. Kevin sets this himself, never through
   an agent. It only runs on `pull_request`, so direct pushes to `main` are
   covered by the local `/security-review` and nothing else.
2. Deck Part 4 AI extension. Option A is parsing a messy list into suggested
   estimates; Option B is "Challenge my top 3". Either needs a mock adapter first
   and a server-side key; never put a key in the browser.

## Open questions

- Whether to build the deck Part 4 AI extension at all. That's Kevin's call. The
  app is complete and useful without it.

## Known traps

- Run `/security-review` before every push. It diffs against `origin/HEAD`; if a
  fresh clone lacks it, run `git remote set-head origin -a`.
- The CI action's API check pings the retired `claude-3-5-haiku-20241022`, fails,
  and silently turns off its false-positive filter. Expect noisy PR comments.
  This is upstream in `anthropics/claude-code-security-review`, not fixable here.
  (An earlier note called `claude-opus-5` an invalid model ID. It isn't; it's
  just one generation older.)
- The project path contains a space. The Claude Code preview pane starts the
  dev server through `C:\.claude\decidra-dev.cmd` (config `decidra` in
  `C:\.claude\launch.json`).
- When the preview pane is hidden, it stops rendering: screenshots time out,
  clicks fail and `<dialog>` `close` events never fire. Drive checks with DOM
  events and measurements, or bring the pane into view. Escape is handled
  through `cancel`, which fires synchronously, so this doesn't affect real users.
- Tests use `node --test` on `.ts` files directly, which needs Node 22.18 or
  newer. Test imports need the `.ts` extension, and tested code can't use DOM
  APIs or TS-only syntax such as enums.
- There's no DOM test runner. The panel's drag-to-backdrop fix is checked by
  hand; the steps are in `docs/VERIFY.md`.
