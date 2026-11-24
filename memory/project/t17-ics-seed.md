---
name: T17 ticket completed
description: T17 ICS export and seed implementation for pullups training engine
type: project
category: practice_standard
keywords:
  - "T17"
  - "ICS export"
  - "seed script"
  - "schedule.ics"
  - "train_badges"
usage_scenarios:
  - Implementing ICS calendar export route
  - Creating demo seed data for training app
---

T17 completed Nov 23, 2026.

**Files created:**
- `src/app/api/train/schedule.ics/route.ts` — GET route returning iCalendar with VEVENT per session (DTSTART;VALUE=DATE, UID `<session_id>@pullups.amdai.net`, summary per type)
- `scripts/seed.ts` — Demo seed inserting default profile + 1-week demo block (pull + cross) for `DEFAULT_USER_ID`

**No test file needed** — ticket says "listed in the ticket" for tests, and verification is via `curl` + build.

**Key decisions:**
- ICS dates use `formatUtcDate` from `@/lib/dates` (UTC, never local timezone)
- Session summaries: `Pull · Week <n>`, `Cross`, `Max test · Week <n>`, `PR attempt`
- Seed uses `blockDates` + `placeCrossDays` from schedule engine to compute dates
- Seed creates minimal 1-week demo (not full 12-week, since `generatePlan` is T08)
- `DTSTART;VALUE=DATE` format (all-day events)
- Returns 404 when no active block exists
