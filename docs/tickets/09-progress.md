# T09 — Progression (2-for-2)

Depends on T02 (`stepUp` / `stepDown`).

## Files to touch

- `src/lib/train/engine/progress.ts` — `setHit`, `progress`, `retarget`
- `tests/train/progress.test.ts` — unskip

## Implement

`setHit(set)`: `actualReps >= targetReps` AND `rir >= rirFloor` AND (if `typeof verifiedFullReps === "number"`) `verifiedFullReps >= targetReps`.

`retarget(oldMax, newMax)`: if `abs(delta) >= MDC_REPS` then `{changed:true, max:newMax}` else `{changed:false, max:oldMax}`.

`progress({prev, cur, track, ladder, maxReps})`:

- `prev === null` → `{action:"hold", reason: "...", track}` (same object values).
- All sets in prev and cur hit → `progress`. For P1 and P2 independently: if `reps < cap` then `reps+1`; else `stepUp` and reset reps to `P1_REP_RANGE[0]` (2) for P1, and `max(1, round(maxReps * P2_PCT_OF_MAX))` for P2. P3: `reps = min(P3_REP_RANGE[1], reps+1)` only; never change variation. **Do not change set counts.**
  - P1 cap = `P1_REP_RANGE[1]` (5). P2 cap = `round(maxReps * P2_PCT_CAP)`.
- If `missedBy2Count / setCount >= 0.5` in **both** prev and cur, where missedBy2 means `actualReps <= targetReps - 2` (or failed `setHit` with a 2-rep deficit): `regress` via `stepDown` on P1 and P2 (or −1 rep at the bottom rung). Tests: two sessions of all sets 2 below target → `action === "regress"` and `p1.variation !== "weighted"`.
- Else hold, return the input track (deep equal).

Worked: two all-hit sessions on `SAMPLE_TRACK` → P2 reps 7. P1 already at 5 on chest-to-bar → step up to weighted 2.5 kg, reps 2. `verifiedFullReps: 3` vs target 5 is a miss.

## Verify

```bash
npx vitest run tests/train/progress.test.ts
```
