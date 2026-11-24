# Design spec: Guided pull-up training (`/app`)

| | |
| --- | --- |
| **Status** | v1 foundation, Nov 24, 2026 |
| **Repo** | `WillPowers3d/pullups` (this repo). Self-contained. |
| **Companion** | [`WillPowers3d/pullups-with-friends`](https://github.com/WillPowers3d/pullups-with-friends) — video grading, points, leaderboard. Link out only. Never import its code or share its DB. |
| **Publish** | `amdai.net/app` via Next.js `basePath: "/app"` |
| **Implementer** | Local Qwen 3.6 coding model, ticket by ticket (`docs/tickets/`). |

Research and citations: `docs/RESEARCH.md`. Wherever the book's exact figure is unknown, the value is an evidence-based default in **`src/lib/train/config.ts`**.

---

## What changed from the first draft

The original draft targeted `/train` inside Pullups With Friends. This app is a **separate product** on `/app`.

1. **Standalone Next.js app.** Own SQLite, own UI, own tickets. No edits to the companion repo.
2. **`basePath: "/app"`.** App-dir routes are `/`, `/start`, `/session/[id]`, … Public URLs are `/app`, `/app/start`, `/app/session/:id`. `<Link href="/start">` — never `/app/start`.
3. **Single local user** (`TRAIN_CONFIG.DEFAULT_USER_ID = "local"`). No password auth in v1. Not a multi-tenant security model.
4. **Video grading is an outbound URL** (`src/lib/companion.ts`) when `NEXT_PUBLIC_COMPANION_ORIGIN` is set. Self-logged reps never create companion submissions or leaderboard points.
5. **Calendar days, not wall-clock hours.** "72 h" means a circular weekday gap ≥ 3 (two full rest days). Engine code uses `MIN_DAYS_BETWEEN_PULL_DAYS`.
6. **Config matches the prescribe algorithm.** P1 initial reps are `round(max × 0.5)` clamped to 2–5, not the unused 40–60% range.
7. **P3 extra sets come from weekly volume, not 2-for-2.** Progression edits the *track* (variation, kg, reps) only.
8. **Ladder has a total order** (`LADDER_ORDER`). `bands: "light" | "heavy"` keeps only that rung. `hasRings` unlocks `ring-dip` on cross days; it does not add pull rungs. No bar → empty ladder, pull training disabled.
9. **Compressed plans** keep week indices by priority `[12, 11, 6, 10, 9, 8, 7, 5, 4, 3, 2, 1]`. Volume is **renormalized** so the first remaining *build* week is multiplier 1.0.
10. **`volumeScore` rounds the SUM** to 1 decimal, not each term. Worked example 51.5 depends on this.
11. **Week 0 baseline** is created during onboarding, not by `generatePlan`. **`pr_attempt` is extra** on `prDate`; it is not one of the two weekly-pull slots.
12. **Session machine holds the plan** (`warmup` + `sets` on state). `REST_END` / `REST_TICK` cannot fire early.
13. **William's rest cap (not a book number):** `maxRestDaysPerWeek = 3` and `maxConsecutiveRestDays = 3`. Cross-day minimum is 2. Taper keeps cross days at low intensity instead of turning them into rest.

---

## 0. Ground rules

1. Read Next.js docs in `node_modules/next/dist/docs/` before writing a route, page, or server action. `params` are async. SQLite is Node-only.
2. **No new runtime dependencies** without a ticket. Use zod, better-sqlite3, lucide-react, shadcn in `src/components/ui`. Dates: `src/lib/dates.ts` (UTC `YYYY-MM-DD`).
3. **Keep the rule engine pure.** `src/lib/train/engine/*`: no DB, no `Date.now()`, no `Math.random()`, no `next` / `node:*`. Pass `today`, `nowMs`, `idFactory` in.
4. **Constants live in `src/lib/train/config.ts`.** Never hard-code a training number in the engine or UI.
5. **One ticket at a time.** Unskip only that ticket's `describe.skip`. See `docs/LOCAL_AI_GUIDE.md`.

---

## 1. Vocabulary

| Term | Meaning |
| --- | --- |
| **Variation** | A rung on the pull-up difficulty ladder. |
| **Max test** | One all-out strict set after a warm-up. `maxReps` drives every prescription. |
| **Block** | One plan ending on a PR date (Principle 11). Usually 12 weeks. |
| **Week index** | 0 is onboarding baseline (outside `generatePlan`). 1–12 are training weeks. 11–12 are the taper. Compressed blocks skip some indices. |
| **Weekly-pull slot** | `type === "pull"`, or the week-6 `max_test`. **Not** `pr_attempt`. Exactly two per kept week. |
| **Cross day** | Push, core, scapular/grip, legs. No extra pulling. |
| **Session** | One scheduled workout: pull, cross, max test, or PR attempt. |
| **Phase** | Warm-up, then P1 Strength, P2 Volume, P3 Endurance. |
| **Track** | Per pull-day slot: `{p1,p2,p3: {variation, addedKg, reps}}`. Set *counts* are not in the track. |
| **Prescribed set** | variation, targetReps, restSec, addedKg, rirFloor, phase. |
| **Logged set** | actualReps, rir 0–4, quality 1–5, optional `verifiedFullReps` from a companion video. |

**Ladder** (easiest → hardest). Rank may tie; `LADDER_ORDER` breaks ties.

| Variation | difficultyRank | factor |
| --- | --- | --- |
| `negative` | 1 | 0.5 |
| `band-heavy` | 1 | 0.4 |
| `australian` | 2 | 0.5 |
| `band-light` | 2 | 0.6 |
| `strict` | 3 | 1.0 |
| `chest-to-bar` | 4 | 1.15 |
| `weighted` | 5 | `1 + addedKg / bodyKg` (bodyKg defaults to 80) |

`availableLadder`:

- `hasBar: false` → `[]` (show "you need a bar").
- `bands: "none"` drops both band rungs; `"light"` / `"heavy"` keep only that rung; `"both"` keeps both.
- `hasWeight: false` drops `weighted`.
- `hasRings` does **not** change this list.

---

## 2. Product flows

Public URL = `/app` + path. In code, paths have **no** `/app` prefix.

### 2.1 Onboarding: `/start`, then `/test`

1. Intro: twelve principles in one line each, "Why?" → `/principles`.
2. Setup form (zod, ticket T12/T13):
   - Equipment: bar, bands (none/light/heavy/both), weight belt/vest, rings.
   - Bodyweight kg, optional.
   - Two weekdays for pull days. Default Mon+Thu. Validate with `validatePullDays`.
   - Cross days per week 2–3, default 2 (William's rest cap: at least 4 training days).
   - PR date: default 12 weeks out, landing on a Sunday if possible. If fewer than 12 weeks remain, show a **compressed plan** warning.
3. Baseline max test (`/test`, type `max_test`, week_index 0):
   - Warm-up, 1 strict max set.
   - Optional "Grade with video" if companion origin is set.
   - Max of 0: offer dead-hang time + negative count (store as maxReps 0; beginner path).
4. `generatePlan()` → persist block + sessions. Redirect to `/`.

### 2.2 Dashboard: `/`

- **Today** card: next session, type, estimated duration, **Start**.
- **Week strip:** Mon–Sun icons (pull / cross / rest / test / PR) and status.
- **Block progress:** "Week 4 of 12 · Build", max-reps sparkline, taper badge in weeks 11–12.
- **Adherence:** % sessions done, rest-overrun count.
- No active block → redirect to `/start`.

### 2.3 Schedule: `/schedule`

- 12-week (or compressed) grid.
- Move uses only `legalMoveDays`. Never break the 3-day pull gap, never put two sessions on one date, never let the last weekly-pull fall inside 3 days of PR day, never move a `pr_attempt`, never create a 4th rest day in the week or a 4-day rest run.
- Change PR date regenerates **future, non-done** sessions; keep completed ones.
- ICS export is T17.

### 2.4 Live session: `/session/[id]`

Client state machine (`session-machine.ts`), persisted after every logged set.

```
idle → warmup(step i) → set ⇄ rest → … → summary
```

- Warm-up: four steps from `buildWarmup()`. Skip needs confirm; skips are logged. Phase 1 locked until all done or skipped.
- Set screen: variation, target reps, kg, phase. Rotate `FULL_FORCE_CUES` (6). Logger: reps stepper (default target), RIR 0–4, quality 1–5. Optional companion video link for strict / C2B / weighted / negative.
- Rest: big countdown of `restSec`. **No skip.** `+30 s` at most `REST_EXTENSIONS_MAX` times. Beep + `navigator.vibrate` at 10 s and 0. `restEndsAt = nowMs + restSec*1000` at rest start so backgrounding the tab is safe. Wake lock if available. At 0, next set appears.
- Summary: totals, volumeScore, hits vs prescribed, rest overruns, `progress()` decision.
- Save via `POST /api/train/sets` after each set.

### 2.5 Cross day (`type = cross`)

Circuit from `TRAIN_CONFIG.CROSS_EXERCISES` filtered by equipment (`ring-dip` needs rings). 3 rounds, **2 in taper (low intensity — the days stay on the calendar)**. Rest 60 s. Optional companion "Record for points" links are outbound only. At least two cross days every week, including taper.

### 2.6 Max test (week 6) and PR (end of week 12)

Same protocol as baseline. After week 6, `retarget()`; if changed, regenerate remaining non-done weeks. PR summary shows delta vs baseline and awards badges. Strongly prompt for a companion video if origin is set.

### 2.7 Progression

`progress({prev, cur, track, ladder, maxReps})` on pull-session complete. Writes `decision_json`. Next same-slot session is re-prescribed from the new track + that week's multiplier.

### 2.8 Taper

`generatePlan` writes weeks 11–12 at 70% and 45% of peak volume. Dashboard banner. Hide any "add a set" control. Engine never adds sets in week 12 P3 (`WEEK_12_P3_SETS = 0`). **Cross days stay on the calendar** at `CROSS_ROUNDS_TAPER` (2 rounds); they are not converted to rest. William's rest cap still applies through the taper.

---

## 3. Data model (SQLite)

Ids are TEXT UUIDs. Timestamps ISO. Dates `YYYY-MM-DD` UTC. Schema already lives in `src/lib/db.ts` (`migrate()` is idempotent). Ticket T11 implements `src/lib/train/repo.ts`.

```sql
train_profiles (user_id PK, display_name, has_bar, bands, has_weight, has_rings,
  body_kg, pull_days JSON, cross_days_per_week, updated_at)
train_blocks (id, user_id, status active|completed|abandoned, start_date, pr_date,
  baseline_max, current_max, compressed, config_json, created_at)
train_sessions (id, block_id, user_id, week_index, date, type, slot, status,
  plan_json, started_at, completed_at, rest_extensions, warmup_skipped, decision_json)
train_sets (id, session_id, idx, phase, variation, added_kg, target_reps, rest_sec,
  actual_reps, rir, quality, rest_taken_sec, companion_submission_id, verified_full_reps, logged_at)
train_badges (user_id, badge_id, earned_at, PK)
```

`companion_submission_id` is an optional opaque id from the other app. It is **not** a foreign key.

---

## 4. Rule engine

Modules: `ladder.ts`, `schedule.ts`, `prescribe.ts`, `plan.ts`, `progress.ts`, `session-machine.ts`. Signatures and JSDoc are in those files. Tests with worked numbers are in `tests/train/*.test.ts`.

### 4.1 Spacing

`validatePullDays`: exactly 2 distinct weekdays `0..6`. Both circular distances ≥ 3. Valid pairs are the 3+4 splits of the week: `[0,3],[1,4],[2,5],[3,6],[4,0],[5,1],[6,2]`. Error text must match `/72/`. `[6,1]` (Sat–Mon) is **illegal**.

`placeCrossDays([1,4], 2) === [2, 5]`. Preferred candidates skip the day before a pull day. Combinations that violate William's rest cap are discarded. Tie-break: largest minimum circular gap, then lex-smallest sorted array.

Worked layout (Mon/Thu pulls): Mon pull, Tue cross, Wed rest, Thu pull, Fri cross, Sat rest, Sun rest. Rest days = 3 (`maxRestDaysPerWeek`). Longest rest run = Sat–Sun = 2 (`maxConsecutiveRestDays`). `n` is clamped to `[CROSS_DAYS_MIN, CROSS_DAYS_MAX]` so a caller cannot schedule 4 rest days.

### 4.1.1 William's rest cap (not a book number)

| Constant | Value | Meaning |
| --- | --- | --- |
| `MAX_REST_DAYS_PER_WEEK` / `maxRestDaysPerWeek` | 3 | ≥4 training days per Mon–Sun week: 2 pull + ≥2 cross |
| `MAX_CONSECUTIVE_REST_DAYS` / `maxConsecutiveRestDays` | 3 | No 4-day rest run, including across week boundaries and taper |
| `CROSS_DAYS_MIN` | 2 | Floor that makes (a) possible |

`generatePlan` and `legalMoveDays` both enforce these on the calendar (`YYYY-MM-DD` UTC), not on wall-clock hours. Helpers: `restDaysPerWeek`, `maxCircularConsecutiveRest`, `maxLinearConsecutiveRest`.

### 4.2 Block dates (worked)

`blockDates("2026-11-23", "2027-02-21")` → `{ startDate: "2026-11-30", compressed: false, weeks: [1..12] }`.

Week 12 is Mon 2027-02-15 … Sun 2027-02-21.

`blockDates("2026-11-23", "2027-01-10")` → `{ startDate: "2026-11-30", compressed: true, weeks: [6, 8, 9, 10, 11, 12] }` (6 calendar weeks; keep-priority fills taper + week 6 + latest build weeks).

`prDate < today` throws.

### 4.3 Prescribe pull (worked)

max 10, full ladder, multiplier 1, body 80:

- Track: P1 weighted 2.5 kg × 5, P2 strict × 6, P3 band-light × 10. Rests 180 / 120 / 60.
- Target volume = `5 × 10 × 1 = 50`. Cap = 55.
- Min sets: `3×5×(1+2.5/80) + 3×6 + 2×10×0.6 = 15.46875 + 18 + 12 = 45.46875`.
- Add one P2 set → 51.46875 → **51.5** ≤ 55. Next P1 or P3 would exceed 55.
- Result: P1×3, P2×4, P3×2, `volumeScore === 51.5`.

Beginner (`maxReps ≤ 2`): P1 negatives, P2 band-heavy or Australian, P3 Australian. No strict/weighted.

Week 12: zero P3 sets. Volume ≤ 0.5 × week-10 session with the same inputs.

### 4.4 Plan

Each kept week: two weekly-pull slots on `pullDays` (earlier weekday = slot 0). Week 6 slot 1 is `max_test`. Cross from `placeCrossDays` (≥2 days, including taper at low intensity). `pr_attempt` extra on `prDate`. Last weekly-pull ≥ 3 days before PR. Every week ≤3 rest days; no 4-day rest run on `[startDate, prDate]`. Deterministic.

`weekMultiplier` uncompressed: week 1 = 1.0; weeks 2–10 = `1.075^(w-1)`; week 11 = peak × 0.7; week 12 = peak × 0.45. Compressed: first remaining build week (indices ≤ 10) is 1.0, then compound; taper still uses that peak.

### 4.5 Progress (2-for-2)

Hit = `actualReps ≥ target` AND `rir ≥ rirFloor` AND (if `verifiedFullReps` is a number) `verifiedFullReps ≥ target`.

- `prev === null` → hold.
- All sets hit in prev and cur → progress (+1 rep, then `stepUp` / reset to bottom of range). P3: +1 rep to 15, never change variation, never change set counts.
- ≥ 50% of sets missed by ≥ 2 in both sessions → regress (`stepDown` or −1 rep at the bottom rung).
- Else hold.

`retarget(8,9)` unchanged; `retarget(8,10)` `{changed:true,max:10}`.

### 4.6 Session machine

State includes `warmup` and `sets` from the `SessionPlan`. Illegal events return the previous state (deep-equal, preferably same reference). No event reduces `restEndsAt`. `REST_EXTEND` no-ops after 2 uses.

---

## 5. API (`src/app/api/train/*`)

Server-only. Zod bodies. JSON `{error}` on failure. Operate on the local user. Handlers call repo + engine only — no business logic inline.

| Method & path | Purpose |
| --- | --- |
| `GET/PUT /api/train/profile` | Read or upsert `train_profiles` |
| `POST /api/train/blocks` | `{prDate, maxReps}` + profile → `generatePlan`, persist, abandon previous active |
| `GET /api/train/blocks/current` | Active block, sessions, stats |
| `PATCH /api/train/blocks/current` | `{prDate}` regenerate future non-done sessions |
| `GET /api/train/sessions/[id]` | Session + sets |
| `POST /api/train/sessions/[id]/start` | `in_progress`, materialize `train_sets` from `plan_json` |
| `PATCH /api/train/sessions/[id]` | Move date via `legalMoveDays` |
| `POST /api/train/sets` | Log one set |
| `POST /api/train/sessions/[id]/complete` | `progress` or `retarget`, write decision, re-prescribe next slot, badges |
| `GET /api/train/schedule.ics` | T17 |

`params` in route handlers are `Promise<{id: string}>` — await them.

---

## 6. Pages (`src/app/*`)

| Route (code) | Public URL | Ticket |
| --- | --- | --- |
| `/` | `/app` | T15 (dashboard; scaffold already has a static home) |
| `/start` | `/app/start` | T13 |
| `/test` | `/app/test` | T13 |
| `/schedule` | `/app/schedule` | T15 |
| `/session/[id]` | `/app/session/:id` | T14 |
| `/principles` | `/app/principles` | scaffolded |
| `/history` | `/app/history` | T15 |

Nav is `src/components/shell.tsx` (already linked).

---

## 7. Companion (additive, optional)

- Points stay in Pullups With Friends. This app never writes `submissions`.
- `companionRecordUrl({trainSetId, sessionId})` returns null when origin is unset.
- User may type `verifiedFullReps` by hand. That is enough for progression without the other app.
- Local badges (`train_badges`) and `TRAIN_SESSION_XP` are **not** leaderboard points.

---

## 8. Non-goals (v1)

- Push notifications, PWA, social features, auto rep-counting, multi-user auth, yearly improvement pot.

---

## 9. Tickets

See `docs/tickets/01-*.md` … `17-*.md`. Tests: `tests/train/*.test.ts`. T01 and date/migration helpers already run. T02–T17 start as `describe.skip`.
