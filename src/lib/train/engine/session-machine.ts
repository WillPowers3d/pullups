import { notImplemented } from "@/lib/train/engine/not-implemented";
import type {
  MachineEvent,
  MachineState,
  SessionPlan,
} from "@/lib/train/engine/types";
import { INITIAL_MACHINE_STATE } from "@/lib/train/engine/types";

export { INITIAL_MACHINE_STATE };

/**
 * Pure session UI state machine. Pass `nowMs` in; never call Date.now here.
 *
 * Guards:
 * - SET_DONE during warmup is ignored (return previous state unchanged).
 * - After every warmup step is DONE or SKIP, stage becomes `set`, setIdx 0.
 * - REST_EXTEND succeeds at most REST_EXTENSIONS_MAX times; extra calls no-op.
 *   Each success adds REST_EXTENSION_SEC * 1000 to restEndsAt.
 * - No event may reduce restEndsAt. REST_END / REST_TICK only advance when
 *   nowMs ≥ restEndsAt.
 * - SET_DONE on a non-last set → stage `rest`, restEndsAt = nowMs + restSec*1000.
 * - SET_DONE on the last set → stage `summary` (no trailing rest).
 * - FINISH → summary, logs preserved.
 */
export function reducer(_state: MachineState, _event: MachineEvent): MachineState {
  return notImplemented("reducer");
}

export function createMachine(plan: SessionPlan, nowMs = 0): MachineState {
  return {
    ...INITIAL_MACHINE_STATE,
    nowMs,
    warmup: plan.warmup,
    sets: plan.sets,
  };
}
