import { TRAIN_CONFIG } from "@/lib/train/config";
import type {
  MachineEvent,
  MachineState,
  SessionPlan,
} from "@/lib/train/engine/types";
import { INITIAL_MACHINE_STATE } from "@/lib/train/engine/types";

export { INITIAL_MACHINE_STATE };

/** Advance from rest → set, incrementing setIdx and clearing restEndsAt. */
function advanceToSet(state: MachineState, nowMs: number): MachineState {
  return {
    ...state,
    stage: "set",
    setIdx: state.setIdx + 1,
    restEndsAt: null,
    nowMs,
  };
}

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
export function reducer(
  state: MachineState,
  event: MachineEvent,
): MachineState {
  const { type } = event;

  switch (type) {
    case "START": {
      const { nowMs } = event;
      const warmupEmpty = state.warmup.length === 0;
      return {
        ...state,
        stage: warmupEmpty ? "set" : "warmup",
        nowMs,
      };
    }

    case "SET_DONE": {
      // No-op during warmup (or any non-set stage).
      if (state.stage !== "set") {
        return state;
      }
      const { log, nowMs } = event;
      const isLastSet = state.setIdx >= state.sets.length - 1;
      const newLogs = [...state.logs, log];

      if (isLastSet) {
        return {
          ...state,
          stage: "summary",
          logs: newLogs,
          nowMs,
        };
      }

      const restSec = state.sets[state.setIdx].restSec;
      return {
        ...state,
        stage: "rest",
        logs: newLogs,
        restEndsAt: nowMs + restSec * 1000,
        nowMs,
      };
    }

    case "WARMUP_DONE": {
      const newIdx = state.warmupIdx + 1;
      if (newIdx >= state.warmup.length) {
        return {
          ...state,
          warmupIdx: newIdx,
          stage: "set",
          setIdx: 0,
        };
      }
      return {
        ...state,
        warmupIdx: newIdx,
      };
    }

    case "WARMUP_SKIP": {
      const { stepId } = event;
      const newIdx = state.warmupIdx + 1;
      const newSkipped = [...state.skipped, stepId];
      if (newIdx >= state.warmup.length) {
        return {
          ...state,
          warmupIdx: newIdx,
          stage: "set",
          setIdx: 0,
          skipped: newSkipped,
        };
      }
      return {
        ...state,
        warmupIdx: newIdx,
        skipped: newSkipped,
      };
    }

    case "REST_EXTEND": {
      if (
        state.stage !== "rest" ||
        state.restEndsAt === null ||
        state.extensionsUsed >= TRAIN_CONFIG.REST_EXTENSIONS_MAX
      ) {
        return state;
      }
      return {
        ...state,
        restEndsAt: state.restEndsAt + TRAIN_CONFIG.REST_EXTENSION_SEC * 1000,
        extensionsUsed: state.extensionsUsed + 1,
      };
    }

    case "REST_TICK":
    case "REST_END": {
      const { nowMs } = event;
      if (
        state.stage !== "rest" ||
        state.restEndsAt === null ||
        nowMs < state.restEndsAt
      ) {
        return state;
      }
      return advanceToSet(state, nowMs);
    }

    case "FINISH": {
      return {
        ...state,
        stage: "summary",
      };
    }

    default:
      return state;
  }
}

export function createMachine(
  plan: SessionPlan,
  nowMs = 0,
): MachineState {
  return {
    ...INITIAL_MACHINE_STATE,
    nowMs,
    warmup: plan.warmup,
    sets: plan.sets,
  };
}
