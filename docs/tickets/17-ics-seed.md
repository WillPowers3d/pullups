# T17 — ICS export and seed (optional)

Do this last. Skip if the previous tickets are not green.

## Files to touch

- `src/app/api/train/schedule.ics/route.ts` — `GET`
- `scripts/seed.ts` — optional demo block
- `package.json` — add `"seed": "npx tsx scripts/seed.ts"` only if you add `tsx` as a **dev** dependency. Prefer implementing seed as a tiny `npx tsx` script; if adding `tsx` feels heavy, a `scripts/seed.mjs` that uses `better-sqlite3` is fine.

## ICS

- `Content-Type: text/calendar`
- One `VEVENT` per session: `DTSTART;VALUE=DATE=YYYYMMDD`, summary like `Pull · Week 4` / `Cross` / `Max test` / `PR attempt`
- `UID` = session id `@pullups.amdai.net`
- Dates UTC. No `Math.random` in UIDs.

## Seed

Insert the default profile and an active block for `DEFAULT_USER_ID` using `generatePlan` with today + 12 weeks. **No passwords, no emails of real people, no API keys.**

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
curl -sI http://localhost:3000/app/api/train/schedule.ics | head
```
