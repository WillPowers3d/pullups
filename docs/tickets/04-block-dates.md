# T04 — Block dates and legal moves

## Read

`docs/DESIGN.md` §4.2. Use `@/lib/dates` (`startOfWeekMonday`, `addDays`, `diffDays`, `weekdayUtc`).

## Files to touch

- `src/lib/train/engine/schedule.ts` — `blockDates`, `legalMoveDays` (`isWeeklyPullSlot` is already implemented)
- `tests/train/schedule.test.ts` — unskip the **second** describe (`T04 ...`). Keep T03 unskipped if you already did T03.

## Implement

`blockDates(today, prDate)`:

- If `prDate < today`, throw.
- Uncompressed start: Monday of the week containing `prDate`, minus 11 weeks (`addDays(startOfWeekMonday(prDate), -77)`). If that Monday is **after** `today`, `compressed=false`, `weeks=[1..12]`, `startDate` is that Monday.
- Else compressed: `startDate = nextMondayAfter(today)`, last week = week containing `prDate`, `n = diffDays(startDate, lastMonday)/7 + 1`. Choose `n` week indices from keep-priority `[12,11,6,10,9,8,7,5,4,3,2,1]`, then sort. Worked: today `2026-11-23`, pr `2027-01-10` → `startDate 2026-11-30`, `weeks [6,8,9,10,11,12]`.

Worked uncompressed: `blockDates("2026-11-23","2027-02-21")` → start `2026-11-30`, compressed false, weeks 1–12.

`legalMoveDays(session, plan)`:

- Empty if `session.type === "pr_attempt"`.
- Candidates = other `YYYY-MM-DD` in the same Mon–Sun week.
- A candidate is legal if, after moving this session there, no two sessions share a date, weekly-pull slots still have ≥ 3 calendar days between consecutive pulls **in the whole plan**, last weekly-pull stays ≥ 3 days before `prDate`, a cross session does not land on a weekly-pull date, and William's consecutive-rest cap still holds (`maxLinearConsecutiveRest` on `[plan.startDate, plan.prDate]` ≤ `MAX_CONSECUTIVE_REST_DAYS`). A week may have 4 rest days. The T04 fixture includes Tue/Fri cross days as the default 2-cross layout.

## Verify

```bash
npx vitest run tests/train/schedule.test.ts
npm run typecheck
```
