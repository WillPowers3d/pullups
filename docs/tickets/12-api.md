# T12 — Zod schemas and API routes

Depends on T08 and T11.

## Files to touch

- `src/lib/train/schemas.ts` — implement the schema factories (they currently throw)
- `src/lib/api.ts` — create a tiny `json(data, status?)` / `jsonError(message, status)` helper if you need it
- Route handlers under `src/app/api/train/`:
  - `profile/route.ts` `GET` `PUT`
  - `blocks/route.ts` `POST`
  - `blocks/current/route.ts` `GET` `PATCH`
  - `sessions/[id]/route.ts` `GET` `PATCH`
  - `sessions/[id]/start/route.ts` `POST`
  - `sessions/[id]/complete/route.ts` `POST`
  - `sets/route.ts` `POST`
- `tests/train/schemas.test.ts` — unskip

Handlers: parse with zod, call repo + engine, return JSON. **No prescription math inline.** Await `params` (`const { id } = await params`).

`PUT /api/train/profile` body (all required unless noted):

```ts
{
  displayName?: string,
  hasBar: boolean,
  bands: "none"|"light"|"heavy"|"both",
  hasWeight: boolean,
  hasRings: boolean,
  bodyKg: number | null,
  pullDays: [number, number], // length 2, each 0–6 (gap check is engine, not zod)
  crossDaysPerWeek: number    // 2–3 (CROSS_DAYS_MIN / MAX; 1 is illegal)
}
```

`POST /api/train/blocks`: `{ prDate: YYYY-MM-DD, maxReps: int >= 0 }`. Load profile, `generatePlan`, `abandonActiveBlocks`, `insertBlock`, `insertSessions`. Snapshot `TRAIN_CONFIG` into `config_json`.

`PATCH /api/train/sessions/[id]`: `{ date }` validated by `legalMoveDays`.

`POST /api/train/sets`: `{ setId, actualReps >= 0, rir 0–4, quality 1–5, restTakenSec >= 0, verifiedFullReps?: number }`.

`POST .../complete`: load logs, `progress` or `retarget` for tests, write `decision_json`, re-prescribe the next same-slot planned session.

Single user: `TRAIN_CONFIG.DEFAULT_USER_ID`. No cookies required.

## Verify

```bash
npx vitest run tests/train/schemas.test.ts
npm run typecheck
npm run lint
```

Manual (after T11): `curl` POST a block then GET current — not required for this ticket's CI.
