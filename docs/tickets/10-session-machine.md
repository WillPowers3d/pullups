# T10 — Session state machine

## Files to touch

- `src/lib/train/engine/session-machine.ts` — `reducer` (`createMachine` is already implemented)
- `tests/train/machine.test.ts` — unskip

The tests **do not pass the plan into `reducer`**. They call `createMachine(plan)` first, so `state.warmup` and `state.sets` are already filled. `START` should set `stage: "warmup"` (or `set` if warmup is empty) and `nowMs`.

## Implement

Illegal events return the previous state unchanged (`Object.is` preferred; deep equal is enough).

- `SET_DONE` while `stage === "warmup"` → no-op.
- `WARMUP_DONE` / `WARMUP_SKIP`: append skip id on skip, increment `warmupIdx`. When `warmupIdx >= warmup.length`, `stage = "set"`, `setIdx = 0`.
- `SET_DONE` on a non-last set: push log, `stage = "rest"`, `restEndsAt = nowMs + sets[setIdx].restSec * 1000`. Do **not** increment `setIdx` yet.
- `SET_DONE` on the last set: push log, `stage = "summary"`.
- `REST_EXTEND`: if `stage==="rest"` and `extensionsUsed < REST_EXTENSIONS_MAX` and `restEndsAt !== null`, add `REST_EXTENSION_SEC * 1000`, increment `extensionsUsed`. Else no-op. Never decrease `restEndsAt`.
- `REST_TICK` / `REST_END`: if `nowMs >= restEndsAt`, `stage = "set"`, `setIdx += 1`, `restEndsAt = null`. If `nowMs < restEndsAt`, no-op (stay in rest).
- `FINISH`: `stage = "summary"`, keep logs.

## Verify

```bash
npx vitest run tests/train/machine.test.ts
```
