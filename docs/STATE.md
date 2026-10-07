# Project State

> Updated at the end of every session, by whichever agent was driving.
> Keep it under a page. This is a baton, not a diary.

**Last updated:** 2026-10-07 by claude-code

## Where things stand

All seven deck phases are done, plus the deck's optional AI extension, Option B:
"Challenge my top 3", a devil's-advocate review by Claude Opus 5.5. Decidra runs
at http://localhost:5173 (`npm run dev`). Build, lint (0 warnings) and 59 tests
pass. Public at https://github.com/JamesKevinJones/decidra.

The AI review is mock by default. Live mode is `DECIDRA_AI=live` plus a key in
`.env.local` (see `.env.example`). **It has never made a real API call:** there
are no Anthropic credentials on this machine. Mock mode, the endpoint guards
(403, 415, 405, 413) and the UI were verified in the browser, and the live path
is unit-tested against a fake Claude. The AI extension is committed locally but
not pushed.

## In progress

- [ ] AI extension committed and verified in mock mode, waiting for Kevin's first live run, then a push.

## The exact next step

1. Kevin: copy `.env.example` to `.env.local`, add a key, restart `npm run dev`,
   and click "Challenge my top 3" once (about 5 to 8 cents). Check that the reply
   names the right features, that the footer shows `claude-opus-5-5` with token
   counts, and that a second click on an unchanged top 3 says it reused the
   review. If the first call fails, the page shows the reason in plain English.
2. Run `/security-review` on the unpushed commit, then push.
3. Optional: deck Option A (parse a messy list), reusing `server/` and the
   `challenge.ts` validation pattern.
4. Optional: `gh secret set CLAUDE_API_KEY --repo JamesKevinJones/decidra` for the
   PR security workflow.

## Open questions

- Whether to build Option A as well. That's Kevin's call.

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
- Never call the live API from tests or CI. `server/challenge-handler.ts` takes the
  Claude caller as a parameter precisely so tests can pass a fake.
- `vite.config.ts` reads `.env.local` with `loadEnv(mode, cwd, '')`. Only
  `VITE_`-prefixed variables reach the browser; never rename the key to
  `VITE_ANTHROPIC_API_KEY`.
- Tests use `node --test` on `.ts` files directly, which needs Node 22.18 or
  newer. Test imports need the `.ts` extension, and tested code can't use DOM
  APIs or TS-only syntax such as enums.
- There's no DOM test runner. The panel's drag-to-backdrop fix is checked by
  hand; the steps are in `docs/VERIFY.md`.
