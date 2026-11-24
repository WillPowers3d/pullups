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
7. Cross: `placeCrossDays(pullDays, crossDaysPerWeek)` → dates that week, `prescribeCross(crossExercises, weekIndex >= 11)`.
8. Append `pr_attempt` on `prDate` (weekIndex 12 or last kept week if 12 is kept — tests expect week 12 / date 2027-02-21). Plan = `prescribeMaxTest`.
9. If last **weekly-pull** is `< LAST_PULL_BEFORE_PR_DAYS` before prDate, shift that session earlier in its week to a legal weekday; if impossible, drop it (tests with Mon/Thu and Sunday PR already satisfy Thursday→Sunday = 3).
10. Same input → `toEqual` the same object. No `Date.now`, no `Math.random`.

Input for tests: today `2026-11-23`, PR `2027-02-21`, max 8, pullDays `[1,4]`, 2 cross days.

## Verify

```bash
npx vitest run tests/train/plan.test.ts
```
