# Verification

Exact commands to prove a change works. Any agent, any tool, no guessing.

Rule: **don't report work as done without running these.** "It should work" is
not a result.

## Install

```bash
npm install
```

## Typecheck, build and lint

```bash
npm run build
npm run lint
```

`build` runs `tsc -b` first, so it is also the typecheck.

## Tests

```bash
npm test
```

Uses Node's built-in `node --test`, which runs `src/**/*.test.ts` directly (Node 24
strips the types). Test files are typechecked by `tsconfig.node.json`, not the app
config. Import with the `.ts` extension in tests.

## Run it

```bash
npm run dev
```

Then check http://localhost:5173. The GymBuddy backlog shows three features and
the browser console has no errors. Phase 2 checkpoint: add "AI Exercise Coach",
try effort 0 (rejected, message beside the field), set a valid effort, edit it,
then delete it. A refresh resets to the three samples until Phase 5.
Phase 3 checkpoint: Planner 800 at rank 1, Reminders 400 at rank 2, Videos 400
at rank 3. Edit Planner effort to 4 and the order becomes Reminders, Videos,
Planner, all at 400.
Phase 4 checkpoint: set Planner confidence to 100% and clear its evidence note,
and a flag appears ("Confidence is 100% but there's no evidence note..."). Then
set Videos to manual priority 1 with a reason. Saving without a reason is
refused. Videos shows Priority 1 with a PM badge and the reason, while its score
(400) and suggested rank (3) are unchanged.
Phase 5 checkpoint: add a feature, change its score, override its priority,
refresh, and everything remains. Export CSV opens in a spreadsheet with score,
suggested rank and PM priority in separate columns. Reset demo data asks first.
To test bad saved data, set `decidra.features.v1` to `{not json` in DevTools and
reload. You should see a notice, the samples, and a copy under
`decidra.features.v1.unreadable`.

In the Claude Code Browser pane, a hidden pane stalls rendering, so a `<dialog>`
`close` event never fires there. Escape is handled through `cancel`, which does fire.

The project path contains a space, so the Claude Code preview pane starts the
server through `C:\.claude\decidra-dev.cmd` (config `decidra` in
`C:\.claude\launch.json`).

Phase 6 manual regression checks (no DOM test runner, so these are by hand):
- Open a feature, press the mouse inside the name field, drag out over the dark
  backdrop and release. The panel must stay open with the edit intact. A plain
  click on the backdrop still closes it.
- At 375px wide (DevTools device mode) the page never scrolls sideways; only the
  table does. Add feature sits on its own row above Reset and Export.

AI review ("Challenge my top 3"), mock mode, with no `.env.local`: click the
button and three reviews appear, labelled "Mock review. No API call was made."
Then edit the Planner's effort and the review dims with "Your top 3 changed".
Endpoint guards, with the dev server running and BODY set to valid JSON:

```bash
curl -s -X POST -H "Content-Type: application/json" -H "Origin: https://evil.example" --data "$BODY" http://localhost:5173/api/challenge
```

That must return 403. A `text/plain` post returns 415, GET returns 405, and a
body over 32 KB returns 413.

Live mode needs `DECIDRA_AI=live` (plus a key or `ant auth login`) in
`.env.local`, a dev-server restart, and costs about 5 to 8 cents per click. Never
run it from tests; the tests use a fake Claude.

## Known-failing

- None.
