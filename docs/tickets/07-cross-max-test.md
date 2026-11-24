# T07 — Cross-day and max-test prescriptions

## Files to touch

- `src/lib/train/engine/prescribe.ts` — `prescribeCross`, `prescribeMaxTest`, `filterCrossExercises`
- `tests/train/prescribe.test.ts` — unskip `T07`

## Implement

`filterCrossExercises(eq)`: start from `TRAIN_CONFIG.CROSS_EXERCISES`. Drop `ring-dip` when `!eq.hasRings`. Never include pull-up variations.

`prescribeCross(exercises, taper)`:

- `rounds = taper ? CROSS_ROUNDS_TAPER : CROSS_ROUNDS` (2 vs 3).
- For `r` in 1..rounds, for each exercise, push a set: `phase: "p2"`, `variation: exercise`, `targetReps` 10 (or 30s-style 1 for planks — **use targetReps 10 for all** so tests can count sets), `restSec: CROSS_REST_SEC`, `rirFloor: DEFAULT_RIR_FLOOR`.
- `type: "cross"`, empty or short warmup, `volumeScore: 0`, `taper`.
- Tests: 3 exercises × 3 rounds = 9 sets; taper = 6; no variation named strict/weighted/negative.

`prescribeMaxTest(ladder)`:

- Warm-up via `buildWarmup` on a dummy strict set of 5.
- `sets[0] = { phase:"test", variation:"strict", targetReps:0, restSec: REST_SEC.test, addedKg:0, rirFloor:0 }`.
- Optional extra single of chest-to-bar or weighted if on the ladder (tests only assert `sets[0]`).
- `type: "max_test"`, `taper: false`.

## Verify

```bash
npx vitest run tests/train/prescribe.test.ts
```
