# T03 — Pull-day validation and cross-day placement

## Read

`docs/DESIGN.md` §4.1, JSDoc on `validatePullDays`, `placeCrossDays`, and the rest-cap helpers.

## Files to touch

- `src/lib/train/engine/schedule.ts` — implement `validatePullDays`, `placeCrossDays`, `restDaysPerWeek`, `maxCircularConsecutiveRest`, `maxLinearConsecutiveRest` (leave `blockDates` / `legalMoveDays` throwing)
- `tests/train/schedule.test.ts` — unskip the **first** `describe.skip` (`T03 ...`). Leave the T04 describe skipped.

## Implement

`validatePullDays(days)`:

- Exactly two distinct integers in `0..6`.
- Both circular distances ≥ `MIN_DAYS_BETWEEN_PULL_DAYS` (3).
- On failure, `error` must match `/72/`.
- `[1,4]`, `[2,5]`, `[0,3]` ok. `[1,2]`, `[1]`, `[1,1]`, `[6,1]` fail.

Circular distance: `min((a-b+7)%7, (b-a+7)%7)` but **do not** treat 0 as a valid distance for two different days. Distinct days with distances 3 and 4 are the only legal pairs.

`restDaysPerWeek(trainingWeekdays)` = `7 - unique length`. (Descriptive only — there is **no** weekly rest-day cap.)

`maxCircularConsecutiveRest(trainingWeekdays)`: longest run of missing weekdays, wrapping 6→0.

Worked: training `[1,2,4,5]` → rest `{0,3,6}` (Sun, Wed, Sat). Wrapping Sat–Sun = 2.

`maxLinearConsecutiveRest(dates, from, to)`: walk each UTC day in `[from, to]`; days not in `dates` are rest. Worked: Mon/Tue/Thu/Fri repeating across 2026-11-30..2026-12-13 → max run 2 (Sat–Sun). A hole of Dec 1–4 → 4 (over William's cap).

`placeCrossDays(pullDays, n)`:

1. Clamp `n` to `[CROSS_DAYS_MIN, CROSS_DAYS_MAX]` (1–3). `n=1` places **1** day.
2. Non-pull weekdays.
3. Preferred = those whose next day is **not** a pull day.
4. If `preferred.length < n`, append the remaining non-pull days until the pool has at least n (or all non-pull days).
5. Among n-combinations of the pool, maximize the minimum circular gap of the chosen set. Tie → lexicographically smallest sorted array.
6. If `maxCircularConsecutiveRest(pull ∪ chosen) > MAX_CONSECUTIVE_REST_DAYS`, add the fewest extra non-pull days to break the longest rest run (prefer not-day-before-pull, then lex-smallest). Legal 3+4 pull pairs already have circular rest ≤ 3, so this does not fire for them.
7. Return sorted ascending.

Worked: `placeCrossDays([1,4], 2) === [2,5]` because preferred is `{2,5,6}`; `[2,5]` and `[2,6]` both have min-gap 3; lex-smaller is `[2,5]`.

Layout with 2 cross days: **Mon pull, Tue cross, Wed rest, Thu pull, Fri cross, Sat rest, Sun rest**. Circular consecutive rest (Sat–Sun) = 2.

Worked: `placeCrossDays([1,4], 1) === [2]`. Layout: **Mon pull, Tue cross, Wed rest, Thu pull, Fri–Sun rest**. Four rest days in the week is legal. Longest rest run = Fri–Sun = 3 (at the cap, not over it). No extra cross day is added.

If a pull were missing, extras would fill the hole. Example (linear, for `generatePlan` / T08): training only Mon 2026-11-30 and Mon 2026-12-07 → rest Tue–Sun = 6. Insert a cross on Fri 2026-12-04 (preferred, not the day before a pull) so the runs are Tue–Thu (3) and Sat–Sun (2).

## Verify

```bash
npx vitest run tests/train/schedule.test.ts
```

T04 describes stay skipped, so this file should pass after T03 if you only unskipped T03.
