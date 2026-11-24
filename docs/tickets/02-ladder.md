# T02 — Variation ladder

## Read

`docs/DESIGN.md` §1, JSDoc on `src/lib/train/engine/ladder.ts`, `TRAIN_CONFIG.LADDER_ORDER`.

## Files to touch

- `src/lib/train/engine/ladder.ts` (replace `notImplemented` bodies)
- `tests/train/ladder.test.ts` — change `describe.skip` → `describe`

Do not add files. Do not edit `config.ts`.

## Implement

```ts
difficultyRank(v: Variation): number
variationFactor(v, addedKg?, bodyKg?): number
availableLadder(eq: Equipment): Variation[]
stepUp(v, addedKg, ladder): StepResult
stepDown(v, addedKg, ladder): StepResult
```

Rules:

- Rank and factors from config. Weighted factor = `1 + addedKg / (bodyKg ?? DEFAULT_BODY_KG)`.
- `availableLadder` easiest → hardest using `LADDER_ORDER`.
  - No bar → `[]`.
  - `bands: "none"` drops both band rungs; `"light"` keeps `band-light` only; `"heavy"` keeps `band-heavy` only.
  - No weight → drop `weighted`. `hasRings` ignored.
- `stepUp` at `chest-to-bar` with weighted on the ladder → `{variation:"weighted", addedKg: INITIAL_WEIGHT_KG}`.
- Without weighted on the ladder → `{variation:"chest-to-bar", addedKg:0, capped:true}`.
- `stepDown("weighted", INITIAL_WEIGHT_KG, L)` → `{variation:"chest-to-bar", addedKg:0}`.
- `stepUp` on weighted adds `WEIGHT_STEP_KG`.

## Verify

```bash
npx vitest run tests/train/ladder.test.ts
npm run typecheck
```

## Acceptance (also in the test file)

- `difficultyRank("weighted") > chest-to-bar > strict > band-light`
- `availableLadder({hasBar:true,bands:"none",hasWeight:false,hasRings:false})` = `["negative","australian","strict","chest-to-bar"]`
- No bar → `[]`
- `variationFactor("weighted", 8, 80) === 1.1`
