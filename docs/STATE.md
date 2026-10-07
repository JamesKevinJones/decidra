# Project State

> Updated at the end of every session, by whichever agent was driving.
> Keep it under a page. This is a baton, not a diary.

**Last updated:** 2026-10-07 by claude-code

## Where things stand

All seven deck phases are done (2026-10-07). Decidra runs at
http://localhost:5173 (`npm run dev`). It covers backlog editing with
validation, live RICE scoring and ranking, assumption flags, confidence
sensitivity, PM overrides with reasons, localStorage persistence with safe
loading, CSV export and a stakeholder summary. README.md documents setup, the
formula, limitations and the three-minute demo. The demo was rehearsed end to
end in the browser and every number matched. Build, lint (0 warnings) and 44
tests pass. Nothing is committed yet.

## In progress

- [ ] Nothing. Waiting on Kevin: commit, and then optionally the deck's AI extension.

## The exact next step

1. Commit (no Claude co-author line). If it's ever pushed, run
   `/security-review` on the diff first (global rule).
2. Optional: deck Part 4 AI extension. Option A is parsing a messy list into
   suggested estimates; Option B is "Challenge my top 3". Either needs a mock
   adapter first and a server-side key; never put a key in the browser.

## Open questions

- Optional AI extension (deck Part 4): skipped for now. Revisit after Phase 7.

## Known traps

- Known limitations for the README: localStorage is per browser and per device;
  two open tabs overwrite each other (last save wins); a second corrupted load
  overwrites the earlier backup; no undo.

- Use the `.cmd` wrapper to start the dev server from the preview pane; the path has a space.
