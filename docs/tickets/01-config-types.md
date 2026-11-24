# T01 — Config and types

**Status: done in this scaffold.** Do not rewrite these files unless a later ticket
proves a type is wrong. If you are the local model, skip this ticket.

## Files (already present)

- `src/lib/train/config.ts`
- `src/lib/train/engine/types.ts`
- `tests/train/config.test.ts` (not skipped)
- `src/lib/dates.ts` + `tests/train/dates.test.ts`

## Verify

```bash
npx vitest run tests/train/config.test.ts tests/train/dates.test.ts
npm run typecheck
```

## Acceptance

- `TRAIN_CONFIG.TAPER_VOLUME` equals `[0.7, 0.45]`.
- `TRAIN_CONFIG.REST_SEC.p1 === 180`.
- `TRAIN_CONFIG.CROSS_DAYS_MIN === 1`.
- There is no `maxRestDaysPerWeek` / `MAX_REST_DAYS_PER_WEEK`.
- `TRAIN_CONFIG.MAX_CONSECUTIVE_REST_DAYS === TRAIN_CONFIG.maxConsecutiveRestDays === 3`.
- `tsc --noEmit` passes.
