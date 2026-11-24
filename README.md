# pullups

Guided pull-up training and scheduling, built on the twelve training principles
from *Pull Yourself Up*. Companion to
[Pullups With Friends](https://github.com/WillPowers3d/pullups-with-friends)
(video-graded sets, points, leaderboard). This repo is self-contained: it may
link out to that app, but it does not import its code or share its database.

The site is served under the **`/app`** base path (amdai.net/app).

## Status

Architecture and foundation only. Feature tickets in `docs/tickets/` are sized
for a local coding model. The rule engine is stubbed; T01 config tests and date
helpers run. T02–T17 specs are written and skipped until each ticket is
implemented.

## Stack

Next.js 16 (App Router, TypeScript strict), Tailwind 4, shadcn/ui (base-nova),
SQLite via `better-sqlite3`, vitest, eslint.

## Develop

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open http://localhost:3000/app (not `/` — `basePath` is `/app`).

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Unskip a ticket's tests by removing `.skip` from its `describe.skip` (see
`docs/LOCAL_AI_GUIDE.md`).

## Docs

| File | What |
| --- | --- |
| `docs/DESIGN.md` | Flows, schema, engine contracts, routes |
| `docs/RESEARCH.md` | Per-principle evidence and cited defaults |
| `docs/LOCAL_AI_GUIDE.md` | Conventions and definition of done |
| `docs/REVIEW_CHECKLIST.md` | Reviewer checklist after each ticket |
| `docs/tickets/` | Ordered implementation tickets |
