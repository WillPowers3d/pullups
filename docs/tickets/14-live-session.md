# T14 — Live guided session

Depends on T10 and T12.

## Files to touch

- `src/app/session/[id]/page.tsx` (server wrapper) + a client component e.g. `src/components/train/session-player.tsx`
- Optional: `src/app/session/[id]/session-player.tsx`

Do **not** add a `/record` page. Video grading is `companionRecordUrl` from `@/lib/companion` (hide the button when it returns null). User can type `verifiedFullReps` on the logger.

## Behavior

1. Load session via `GET /api/train/sessions/[id]`. `POST .../start` if `planned`.
2. Drive UI with `reducer` from `session-machine.ts`. Pass `nowMs: Date.now()` **in the client**, never inside the engine.
3. Warm-up checkboxes. Skip = confirm dialog → `WARMUP_SKIP`. Phase 1 locked until warmup complete.
4. Set screen: variation, target, kg, phase, rotating `FULL_FORCE_CUES`. Done → logger (reps stepper defaulting to target, RIR chips 0–4, quality 1–5) → `POST /api/train/sets` → `SET_DONE`.
5. Rest screen: countdown from `restEndsAt`. **No skip control.** `+30 s` disabled after 2. `REST_TICK` on an interval. Beep / `navigator.vibrate` at 10s and 0. Prefer computing `restEndsAt` once so a tab background doesn't reset the clock. Wake lock if `navigator.wakeLock` exists.
6. Summary: totals, `POST .../complete`, show `decision.reason`.
7. Taper: if `plan.taper`, show "Taper week: lower volume is intentional." No add-set button.

Await `params`. Do not import `getDb` in the client file.

## Verify (manual)

- Warm-up gate works.
- No rest skip; +30 disables after 2; timer survives a tab switch.
- Summary shows a decision.
- `npm run lint && npm run typecheck && npm run build`
