# Local AI guide (Qwen 3.6, ~35B, llama.cpp)

You implement **one ticket at a time**. The architecture, types, stubs, skipped tests, and
docs are already in the repo. Do not redesign the engine. Do not start the next ticket.

## Before you write code

1. Read `AGENTS.md` (Next.js 16 APIs differ from your training data).
2. Read this file.
3. Read `docs/DESIGN.md` sections named by the ticket, and the ticket itself.
4. Read the stub file you will fill in — the JSDoc **is** the contract, including worked numbers.
5. If you touch a route or server action, open the matching guide under `node_modules/next/dist/docs/` first.

## Commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Run only the ticket's file while iterating:

```bash
npx vitest run tests/train/ladder.test.ts
```

Dev server: `npm run dev` then open **http://localhost:3000/app** (basePath is `/app`).

## Conventions

| Rule | Detail |
| --- | --- |
| One ticket | Fill in stubs. Do not invent extra modules unless the ticket says so. |
| Unskip tests | In that ticket's test file, change `describe.skip(` to `describe(`. Leave other files skipped. |
| Purity | `src/lib/train/engine/*` imports only `config`, `types`, `dates` (pure), and other engine files. No `fs`, no `better-sqlite3`, no `next`, no `Date.now()`, no `Math.random()`. |
| Numbers | Import `TRAIN_CONFIG`. If you type `180` or `0.7` as a literal in engine code, you failed. |
| Dates | `YYYY-MM-DD` UTC via `@/lib/dates`. `getDay()` / local timezone is a bug. |
| Links | `<Link href="/start">` not `/app/start`. `basePath` prefixes for you. |
| Params | `const { id } = await params;` — Next.js 16. Same for route handlers. |
| Companion | Optional URL from `@/lib/companion`. Do not clone Pullups With Friends. |
| SQLite | `getDb()` from `@/lib/db`. `DB_PATH=:memory:` in tests; call `resetDbForTests()` in `afterEach`. |
| IDs | Caller passes `idFactory` (tests use a counter). Production can use `crypto.randomUUID`. |
| Return types | Keep the exported signatures. Do not change `types.ts` unless the ticket says the type is wrong — then stop and say so. |
| Stub args | Unimplemented functions prefix unused parameters with `_` so lint stays green. When you implement the body, rename `_variation` back to `variation` (etc.). |

## Definition of done (every ticket)

- [ ] Only files listed in the ticket (plus the test file) are modified, unless the ticket allows a type fix.
- [ ] `describe.skip` removed **only** for this ticket.
- [ ] `npx vitest run <the test file>` passes, including the worked-number cases.
- [ ] `npm run lint` is clean.
- [ ] `npm run typecheck` is clean.
- [ ] `npm test` still passes (later tickets remain skipped).
- [ ] Engine files still have no `Date.now` / DB / `next` imports.
- [ ] No secrets, no `.env`, no `node_modules` in git.
- [ ] You did not implement the next ticket "while you were here."

## Things this model class usually gets wrong

- Using local timezone instead of UTC for weekdays.
- Rounding `volumeScore` per set instead of the sum (breaks the 51.5 example).
- Treating `pr_attempt` as one of the two weekly-pull slots.
- Putting `Math.random()` in `generatePlan` (must be deterministic).
- Adding a skip-rest button because it feels nicer (forbidden).
- Hard-coding `/app` in `<Link>` hrefs (double prefix).
- Sync `params` (`{ params: { id } }`) — this Next.js version needs `await params`.
- Importing `better-sqlite3` from a client component.
- Changing P3 set counts inside `progress()` (set counts belong to `prescribePullSession`).
- Dropping requested taper cross days (they stay; intensity drops). Inventing a weekly rest-day cap, or leaving a 4-day rest run unfilled.
- Implementing T02–T17 in one shot. Don't.

## Ticket map

| # | File | Test file |
| --- | --- | --- |
| T01 | done in the scaffold (`config.ts`, `types.ts`) | `tests/train/config.test.ts` |
| T02 | `engine/ladder.ts` | `tests/train/ladder.test.ts` |
| T03 | `engine/schedule.ts` (validate + placeCrossDays + rest-cap helpers) | `tests/train/schedule.test.ts` (first describe) |
| T04 | `engine/schedule.ts` (blockDates + legalMoveDays) | `tests/train/schedule.test.ts` (second describe) |
| T05 | `engine/prescribe.ts` (warmup, order, volume) | `tests/train/prescribe.test.ts` (T05) |
| T06 | `engine/prescribe.ts` (pull session) | `tests/train/prescribe.test.ts` (T06) |
| T07 | `engine/prescribe.ts` (cross + max test) | `tests/train/prescribe.test.ts` (T07) |
| T08 | `engine/plan.ts` | `tests/train/plan.test.ts` |
| T09 | `engine/progress.ts` | `tests/train/progress.test.ts` |
| T10 | `engine/session-machine.ts` | `tests/train/machine.test.ts` |
| T11 | `src/lib/train/repo.ts` | `tests/train/repo.test.ts` |
| T12 | `schemas.ts` + `src/app/api/train/**` | `tests/train/schemas.test.ts` |
| T13 | `/start`, `/test` pages | manual, listed in the ticket |
| T14 | `/session/[id]` | manual |
| T15 | dashboard, schedule, history | manual |
| T16 | `src/lib/train/badges.ts` | `tests/train/badges.test.ts` |
| T17 | ICS + seed | listed in the ticket |
