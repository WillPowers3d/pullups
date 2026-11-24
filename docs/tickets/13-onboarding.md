# T13 — Onboarding pages

Depends on T12.

## Files to touch

- `src/app/start/page.tsx` — client form
- `src/app/test/page.tsx` — baseline max test (can reuse a thin wrapper around the T14 session UI **or** a simpler dedicated logger; do not build the full live-session machine here if T14 is not done — a form that POSTs `{prDate, maxReps}` is enough)
- Optional: `src/components/train/setup-form.tsx`

## Behavior

1. `/start`: explain 12 principles (link `/principles`). Form: equipment, body kg, two pull weekdays, cross-days 1–3, PR date. Client-validate pull days with `validatePullDays` (this function is pure — OK to import from engine in a client component). Show compressed warning if PR is under 12 weeks out.
2. Submit profile via `PUT /api/train/profile`. Navigate to `/test`.
3. `/test`: log a strict max (default 0). Submit `POST /api/train/blocks` with `{prDate, maxReps}`. Redirect to `/`.
4. If `availableLadder` is empty, disable submit and say they need a bar.

`basePath` reminder: `<Link href="/test">`.

## Verify (manual)

- Pull days `[1,2]` show an error matching 72 hours.
- Completing the test creates a block (check `GET /api/train/blocks/current`).
- `npm run lint && npm run typecheck && npm run build`

No new vitest file required. Do not unskip T14–T17.
