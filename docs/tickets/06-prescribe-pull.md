# T06 — Pull-session prescription

Depends on T02 (ladder) and T05 (`volumeScore`, `buildWarmup`, `orderSets`). If those still throw, implement them first.

## Files to touch

- `src/lib/train/engine/prescribe.ts` — `initialTrack`, `prescribePullSession`
- `tests/train/prescribe.test.ts` — unskip `T06`

## Implement

`initialTrack(maxReps, ladder)` as in the JSDoc. Beginner if `maxReps <= BEGINNER_MAX_INCLUSIVE`.

`prescribePullSession({maxReps, ladder, weekIndex, volumeMultiplier, bodyKg, track?})`:

1. `track = track ?? initialTrack(...)`.
2. `target = START_VOLUME_X_MAX * maxReps * volumeMultiplier`.
3. Set counts start at P1 3, P2 3, P3 2. If `weekIndex === 12`, P3 = `WEEK_12_P3_SETS` (0).
4. Round-robin add one set to **P2, then P1, then P3**. Add only if new `volumeScore <= target * (1+VOLUME_TOLERANCE)` and the phase is below its max (5, 5, 3). Stop when nothing can be added. Min-set floor wins (do not drop below the start counts).
5. Expand counts × track into `PrescribedSet[]`. Rest from `REST_SEC`. `rirFloor` is `DEFAULT_RIR_FLOOR` (P3: `P3_RIR_FLOOR`).
6. `orderSets`, `warmup = buildWarmup(sets[0])` if any, `taper = weekIndex >= 11`, `volumeScore`.

Worked (max 10, full ladder, multiplier 1, body 80): P1 weighted 5 reps × 3, P2 strict 6 × 4, P3 band-light 10 × 2, rests 180/120/60, volumeScore **51.5**.

Beginner (max 2, ladder without bands): P1 negative, P2 and P3 australian, no strict/weighted.

Week 12: no P3; volumeScore ≤ 0.5 × week-10 session with the same inputs (test uses `volumeMultiplier: 1.075**9` vs `* 0.45`).

## Verify

```bash
npx vitest run tests/train/prescribe.test.ts
```
