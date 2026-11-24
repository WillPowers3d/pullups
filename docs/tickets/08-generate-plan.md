# T08 — Plan generation

Depends on T03, T04, T06, T07.

## Files to touch

- `src/lib/train/engine/plan.ts` — `weekMultiplier`, `generatePlan`
- `tests/train/plan.test.ts` — unskip

## Implement

`weekMultiplier(weekIndex, keptWeeks?)`:

- Uncompressed (`keptWeeks` omitted): week 1 → 1; weeks 2–10 → `(1+BUILD_WEEKLY_INCREASE)^(weekIndex-1)`; week 11 → week10 × 0.7; week 12 → week10 × 0.45.
- Compressed: `build = keptWeeks.filter(w => w <= 10).sort()`. Index `i` of `weekIndex` in `build` → `(1+BUILD)^(i)`. Peak = last build week's value. Weeks 11/12 still peak × TAPER_VOLUME.

`generatePlan(input)`:

1. `blockDates(input.today, input.prDate)`.
2. `ladder = availableLadder(input.equipment)`. If empty, still return a plan with no pull sessions? **Prefer: throw** `Error("No bar")` — tests use full equipment so they won't hit this.
3. For each `weekIndex` in `dates.weeks`, compute that week's Monday = `addDays(startDate, 7 * calendarIndex)`.
4. Two weekly-pull slots on `input.pullDays` (sorted; slot 0 = earlier weekday). Date = that week's Monday + offset (`weekday===0` is Sunday = Monday+6).
5. If `weekIndex === 6` and slot 1: `type max_test`, plan = `prescribeMaxTest(ladder)`.
6. Else pull: `prescribePullSession({ maxReps, ladder, weekIndex, volumeMultiplier: weekMultiplier(weekIndex, weeks), bodyKg, })`.
7. Cross: `n = max(CROSS_DAYS_MIN, input.crossDaysPerWeek)`, `placeCrossDays(pullDays, n)` → dates that week, `prescribeCross(crossExercises, weekIndex >= 11)`. **Taper keeps these requested cross days at low intensity** (`taper: true`, 2 rounds) — do not convert them to rest.
8. Append `pr_attempt` on `prDate` (weekIndex 12 or last kept week if 12 is kept — tests expect week 12 / date 2027-02-21). Plan = `prescribeMaxTest`.
9. If last **weekly-pull** is `< LAST_PULL_BEFORE_PR_DAYS` before prDate, shift that session earlier in its week to a legal weekday. Do **not** drop it if that would leave a 4-day rest run; move a cross day, or add an extra cross day, instead.
10. After placing everything, walk `[startDate, prDate]`. If any rest run is 4+ days, insert extra cross sessions to break it (prefer a non-day-before-pull in the run, else the 4th rest day). William's rule is **only** `maxLinearConsecutiveRest ≤ MAX_CONSECUTIVE_REST_DAYS` (3), including taper weeks. A week may have 4 rest days.
11. Same input → `toEqual` the same object. No `Date.now`, no `Math.random`.

Input for tests: today `2026-11-23`, PR `2027-02-21`, max 8, pullDays `[1,4]`, 2 cross days (and a second case with 1 cross day).

Worked rest layout (Mon/Thu + 2 cross): each build week is Mon pull, Tue cross, Wed rest, Thu pull, Fri cross, Sat rest, Sun rest. Longest rest run across Sat–Sun into next Monday pull = 2. Taper weeks 11–12 still have those two cross days (`plan.taper === true`).

Worked 1-cross layout (Mon/Thu): `placeCrossDays([1,4], 1) === [2]` → Mon pull, Tue cross, Wed rest, Thu pull, Fri–Sun rest. Four rest days that week is legal. Longest run = Fri–Sun = 3. No extra cross day, because 3 is at the cap not over it.

## Verify

```bash
npx vitest run tests/train/plan.test.ts
```
