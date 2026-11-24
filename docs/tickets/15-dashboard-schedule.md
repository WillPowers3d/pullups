# T15 — Dashboard, schedule, history

Depends on T12–T14.

## Files to touch

- `src/app/page.tsx` — replace the static marketing home with the dashboard when an active block exists; keep a short intro + Start CTA when not (or redirect to `/start`)
- `src/app/schedule/page.tsx`
- `src/app/history/page.tsx`
- Optional small components under `src/components/train/`

`src/components/shell.tsx` and `/principles` already exist. Do not restyle the whole app.

## Dashboard (`/`)

- Redirect to `/start` if `GET /api/train/blocks/current` is 404.
- Today card: next planned/in-progress session, Start → `/session/[id]`.
- Week strip Mon–Sun.
- "Week N of 12 · Build|Taper". Banner in weeks 11–12: "Taper: trust the process".
- Adherence % and rest-overrun count if the API returns them; otherwise omit rather than invent.

## Schedule (`/schedule`)

- Grid of kept weeks. Click session → details. Move: only dates from `legalMoveDays` (the API must reject others).
- Change PR date → `PATCH /api/train/blocks/current`.

## History (`/history`)

- Past sessions, max-reps over time (simple list is fine; a chart is optional).

## Verify (manual)

- Schedule offers only legal move days.
- Taper banner in weeks 11–12 (seed a compressed/taper week or generate a full plan and inspect week 11).
- Nav still shows Today / Schedule / History / Principles.
- `npm run lint && npm run typecheck && npm run build`
