# T05 — Warm-up, orderSets, volumeScore

## Files to touch

- `src/lib/train/engine/prescribe.ts` — `buildWarmup`, `orderSets`, `volumeScore`
- `tests/train/prescribe.test.ts` — unskip the `T05` describe only

## Implement

`buildWarmup(firstSet)` returns **4** steps, ids exactly `general`, `mobility`, `activation`, `ramp`.

- general: `kind:"timer"`, `seconds: WARMUP_GENERAL_SEC`
- mobility: `kind:"reps"`, `reps: WARMUP_MOBILITY_REPS`
- activation: `kind:"hang"`, `seconds: WARMUP_HANG_SEC`, `sets: WARMUP_ACTIVATION_SETS`
- ramp: `kind:"reps"`, `rampReps: WARMUP_RAMP_PCTS.map(p => max(1, round(firstSet.targetReps * p)))`
  - Worked: strict × 6 → `[2, 3]`
  - If `firstSet.variation === "weighted"`, the ramp **label** should name the next easier variation (you may still store it on the step; tests only assert ids + `rampReps`).

`orderSets(sets)`: sort by phase order `p1,p2,p3,test,warmup`, then `difficultyRank` descending (treat unknown / cross names as rank 0), then `targetReps` ascending, then original index (stable).

`volumeScore(sets, bodyKg?)`: `Math.round(sum * 10) / 10` where `sum = Σ targetReps * variationFactor(...)`. **Do not round per set.** Worked 3× weighted 5 @ 2.5kg + 4× strict 6 + 2× band-light 10 at body 80 → **51.5**.

## Verify

```bash
npx vitest run tests/train/prescribe.test.ts
```
