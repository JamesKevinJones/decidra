# Decidra

Decidra is a local, single-page RICE prioritization app for product managers. A PM
enters features with Reach, Impact, Confidence and Effort estimates; the app scores
and ranks them deterministically, flags weak assumptions, and lets the PM override
the order with a recorded reason. It follows the workshop deck "Build a RICE
Prioritization Agent with Codex" (Airtribe, Chennai), built one phase at a time.
The tool recommends; the PM decides.

## Stack

- Language / runtime: TypeScript 6, Node 24
- Framework: React 19, Vite 8 (create-vite react-ts template)
- Styling: plain CSS in `src/index.css`, tokens on `:root`. No component library, no Tailwind.
- Data: browser `localStorage`, key `decidra.features.v1`. No database.
- AI (optional): "Challenge my top 3" calls Claude Opus 5.5 (`claude-opus-5-5`) via
  `@anthropic-ai/sdk` from a Vite dev-server route in `server/`. Mock by default;
  live only with `DECIDRA_AI=live` in `.env.local`.
- Deploy: none. Runs on localhost only.

## Layout

```
src/
  App.tsx           # page, backlog table, feature list state
  FeaturePanel.tsx  # add/edit side panel (native <dialog>)
  features.ts       # Feature type, Impact/Confidence scales, samples, validateDraft()
  scoring.ts        # riceScore(), rankFeatures(): pure, no React, the only place maths happens
  decisions.ts      # assumptionFlags(), sensitivity(), applyOverrides(): pure, built on scoring.ts
  storage.ts        # localStorage load/save; validates saved data, backs up unreadable data
  report.ts         # CSV export (escaped, formula-safe) and the deterministic stakeholder summary
  challenge.ts      # AI review: input builder, JSON schema, reply validation, mock. No network.
  ChallengePanel.tsx # the "Challenge my top 3" section
  *.test.ts         # node:test, run by `npm test` (no test framework installed)
  index.css         # all styles and design tokens
server/             # Node only, never bundled: Vite plugin, request handler, Claude call
```

## Rules

1. All seven deck phases are done. For new work, keep the same habit: small steps, verify, then ask before the next.
2. Scores, ranking, flags, sensitivity and the summary are deterministic code. Never an LLM.
   The only AI is the optional review, which advises and never writes back.
3. Don't add dependencies without asking. No auth, database, payments or cloud. Paid AI calls
   only through `server/claude.ts`, only on an explicit click, never from tests.
4. Extend, don't rebuild. Run the checks in `docs/VERIFY.md` before reporting a phase done.
5. A PM override never changes the calculated score or suggested rank.

## System Operating Modes

Each mode is a persona defined in `.claude/modes/`. It sets what to focus on,
how to judge the work, and the output format.

| Mode | File | Switch (Claude Code) | Badge |
| --- | --- | --- | --- |
| Business Analyst | `ba.md` | `/mode ba` or `/ba` | `[Mode: Business Analyst]` |
| System Architect | `architect.md` | `/mode architect` or `/architect` | `[Mode: System Architect]` |
| Engineer (**default**) | `engineer.md` | `/mode engineer` or `/code` | `[Mode: Engineer]` |
| Auditor | `auditor.md` | `/mode auditor` or `/audit` | `[Mode: Auditor]` |

- `/mode reset` returns to Engineer.
- **Start every response with the current mode's badge on its own line.** If no mode has been chosen this session, use `[Mode: Engineer]`.
- A mode lasts until it is switched or reset. The Rules above apply in every mode.
- Codex and `agy` don't have these slash commands. Say "switch to ba mode" and they read `.claude/modes/ba.md` directly.

## Read these too

- `docs/STATE.md` — where we stopped, what's next
- `docs/DECISIONS.md` — why things are the way they are
- `docs/VERIFY.md` — how to prove a change works

## Don't touch

- Nothing generated is committed yet. `dist/` is build output and git-ignored.
