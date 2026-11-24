# T16 — Local badges

## Files to touch

- `src/lib/train/badges.ts` — `trainBadges`
- `src/lib/train/repo.ts` — use `insertBadge` / `listBadges` from complete-session (if T11/T12 already exist; otherwise only implement the pure function)
- `tests/train/badges.test.ts` — unskip

## Implement

Pure function. No DB.

```ts
trainBadges(stats: TrainStats): BadgeId[]
```

Return **ids in `BADGE_IDS` order**, including every id whose condition is true:

| id | condition |
| --- | --- |
| `block_started` | `stats.blockStarted` |
| `warmup_perfect` | `warmupPerfectCount >= 10` |
| `on_the_clock` | `zeroOverrunCount >= 10` |
| `mid_test_up` | `week6Delta !== null && week6Delta >= MDC_REPS` |
| `new_pr` | `prDelta !== null && prDelta > 0` |
| `block_complete` | `stats.blockComplete` |

Call this from `POST .../complete` and insert missing badges. Completing a self-logged session must **not** create companion submissions (there is no submissions table here — don't add one).

## Verify

```bash
npx vitest run tests/train/badges.test.ts
```
