# T03 — Pull-day validation and cross-day placement

## Read

`docs/DESIGN.md` §4.1, JSDoc on `validatePullDays` and `placeCrossDays`.

## Files to touch

- `src/lib/train/engine/schedule.ts` — implement those two functions only (leave `blockDates` / `legalMoveDays` throwing)
- `tests/train/schedule.test.ts` — unskip the **first** `describe.skip` (`T03 ...`). Leave the T04 describe skipped.

## Implement

`validatePullDays(days)`:

- Exactly two distinct integers in `0..6`.
- Both circular distances ≥ `MIN_DAYS_BETWEEN_PULL_DAYS` (3).
- On failure, `error` must match `/72/`.
- `[1,4]`, `[2,5]`, `[0,3]` ok. `[1,2]`, `[1]`, `[1,1]`, `[6,1]` fail.

Circular distance: `min((a-b+7)%7, (b-a+7)%7)` but **do not** treat 0 as a valid distance for two different days. Distinct days with distances 3 and 4 are the only legal pairs.

`placeCrossDays(pullDays, n)`:

1. Non-pull weekdays.
2. Preferred = those whose next day is **not** a pull day.
3. If `preferred.length < n`, append the remaining non-pull days until the pool has at least n (or all non-pull days).
4. Among n-combinations of the pool, maximize the minimum circular gap of the chosen set (sorted, wrap from last to first with `+7`). Tie → lexicographically smallest sorted array.
5. Return sorted ascending.

Worked: `placeCrossDays([1,4], 2) === [2,5]` because preferred is `{2,5,6}`; `[2,5]` and `[2,6]` both have min-gap 3; lex-smaller is `[2,5]`.

## Verify

```bash
npx vitest run tests/train/schedule.test.ts
```

T04 describes stay skipped, so this file should pass after T03 if you only unskipped T03.
