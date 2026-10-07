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
tests pass. Committed as 15dffee and pushed to
https://github.com/JamesKevinJones/decidra (public) on 2026-10-07.

## In progress

- [ ] Nothing in progress.

## The exact next step

1. Optional: `gh secret set CLAUDE_API_KEY --repo JamesKevinJones/decidra` so the
   security-review workflow can run on PRs (Kevin sets this himself). The
   workflow pins `claude-opus-5-5`, synced from the framework template on
   2026-10-07. (An earlier note here called `claude-opus-5` invalid; that was
   wrong, it's a real model, just one generation older.) Known upstream issue:
   the action's API check pings the retired `claude-3-5-haiku-20241022`, so its
   false-positive filter switches itself off and PR comments will be noisier.
2. Optional: deck Part 4 AI extension. Option A is parsing a messy list into
   suggested estimates; Option B is "Challenge my top 3". Either needs a mock
   adapter first and a server-side key; never put a key in the browser.
3. Before any future push, run `/security-review`. It needs `origin/HEAD`, which
   now exists.

## Open questions

- Optional AI extension (deck Part 4): skipped for now. Revisit after Phase 7.

## Known traps

- Known limitations for the README: localStorage is per browser and per device;
  two open tabs overwrite each other (last save wins); a second corrupted load
  overwrites the earlier backup; no undo.

- Use the `.cmd` wrapper to start the dev server from the preview pane; the path has a space.
