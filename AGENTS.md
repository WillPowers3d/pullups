<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This repo

- `basePath` is `/app`. Use `<Link href="/start">`, never `/app/start`.
- Training constants: only `src/lib/train/config.ts`.
- Engine (`src/lib/train/engine/*`) is pure: no DB, no `Date.now()`, no `Math.random()`, no `next` or `node:*` imports.
- Pass `today` / `nowMs` / `idFactory` in from the caller.
- Do not import anything from `pullups-with-friends`. Optional outbound URLs live in `src/lib/companion.ts`.
- One ticket at a time from `docs/tickets/`. Read `docs/LOCAL_AI_GUIDE.md` first.
- Dates are `YYYY-MM-DD` UTC (`src/lib/dates.ts`).
- Next.js route `params` are async. SQLite is server-only (`better-sqlite3`).
