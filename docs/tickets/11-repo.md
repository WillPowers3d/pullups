# T11 — Repository (SQLite CRUD)

`migrate()` in `src/lib/db.ts` is already implemented and covered by `tests/train/db.test.ts`. **Do not drop tables.** Fill in `src/lib/train/repo.ts`.

## Files to touch

- `src/lib/train/repo.ts`
- `tests/train/repo.test.ts` — unskip

You may import `getDb` from `@/lib/db`. This file is **server-only** (never imported from a client component).

## Implement

Use the exported signatures as they are. Store booleans as 0/1. Store `pull_days` as `JSON.stringify`. `plan_json` / `decision_json` as JSON text.

`insertSessions`: one row per `plan.sessions`, `status: "planned"`. Generate ids with `idFactory()`.

`startSession`: set `status: "in_progress"`, `started_at`. If no `train_sets` yet, insert one row per `JSON.parse(plan_json).sets` with `idx` 0..n-1, leaving actuals null.

`upsertProfile`: `INSERT ... ON CONFLICT(user_id) DO UPDATE`. Default user id `TRAIN_CONFIG.DEFAULT_USER_ID`.

`insertBlock`: insert the block (`status: "active"`, `compressed` from `plan.compressed`). Do not insert sessions (caller uses `insertSessions`).

Tests open `DB_PATH=:memory:` via `resetDbForTests()` + `getDb()`.

## Verify

```bash
npx vitest run tests/train/db.test.ts tests/train/repo.test.ts
```

## Note

Do not add `better-sqlite3` to client files. If lint complains about Node APIs here, that is expected for a server module — do not switch to `sql.js`.
