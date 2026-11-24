# Review checklist (after each local-model ticket)

Use this when reviewing a Qwen/local PR. Fail the ticket if any box is unchecked
without a documented reason.

## Process

- [ ] Only one ticket. No drive-by refactors, no "I also did T+1."
- [ ] The ticket's `describe.skip` was removed; later tickets are still skipped.
- [ ] Worked-number assertions are still present (not deleted or loosened to `toBeGreaterThan(0)`).
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` is green.

## Engine purity (T02–T10)

- [ ] No imports from `fs`, `path`, `better-sqlite3`, `next`, or `node:*` in `src/lib/train/engine`.
- [ ] No `Date.now()` or `Math.random()` in the engine. Time and ids come in as arguments.
- [ ] Every rest second, %, kg, set cap, and factor is `TRAIN_CONFIG.*`, not a literal.

## Training logic

- [ ] Pull-day gap is **3 calendar days** (UTC weekdays), not `getHours()`.
- [ ] `volumeScore` rounds the sum to 1 decimal. The max-10 example still equals **51.5**.
- [ ] `pr_attempt` is extra; each kept week still has exactly 2 weekly-pull slots.
- [ ] Week 0 baseline is not emitted by `generatePlan`.
- [ ] `progress()` does not change set counts. P3 does not change variation.
- [ ] Compressed plans renormalize multipliers (first remaining build week = 1.0).
- [ ] Rest UI (T14) has **no skip**. `+30 s` disables after 2 uses.
- [ ] Warm-up gates Phase 1.

## App / Next.js

- [ ] `params` and searchParams are awaited where Next 16 requires it.
- [ ] Links are `/start`, `/session/${id}`, never `/app/start`.
- [ ] Client components that would pull in `better-sqlite3` don't. DB stays in server modules.
- [ ] No new dependencies unless the ticket allowed it.
- [ ] No secrets, `.env`, or sqlite files committed.

## Companion boundary

- [ ] No imports from `pullups-with-friends`.
- [ ] Video grading is an optional outbound URL or a manual `verifiedFullReps` field.
- [ ] Completing a self-logged session does not invent leaderboard points.

## Types

- [ ] Exported function signatures match `docs/DESIGN.md` / the stub JSDoc.
- [ ] `strict` TypeScript: no `any`, no `as unknown as` to silence tests.
