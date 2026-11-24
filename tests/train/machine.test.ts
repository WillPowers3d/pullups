import { describe, expect, it } from "vitest";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { createMachine, reducer } from "@/lib/train/engine/session-machine";
import { log, set } from "./helpers";
import type { MachineState, WarmupStep } from "@/lib/train/engine/types";

const WARMUP: WarmupStep[] = [
  { id: "general", label: "General", kind: "timer", seconds: 180 },
  { id: "mobility", label: "Mobility", kind: "reps", reps: 10 },
  { id: "activation", label: "Activation", kind: "hang", seconds: 20 },
  { id: "ramp", label: "Ramp", kind: "reps", rampReps: [2, 3] },
];

const SETS = [
  set({ phase: "p1", variation: "strict", targetReps: 5, restSec: 180 }),
  set({ phase: "p2", variation: "strict", targetReps: 6, restSec: 120 }),
];

const PLAN = {
  type: "pull" as const,
  warmup: WARMUP,
  sets: SETS,
  volumeScore: 0,
  taper: false,
};

function start(): MachineState {
  return reducer(createMachine(PLAN, 0), { type: "START", nowMs: 1_000 });
}

function finishWarmup(state: MachineState): MachineState {
  let next = state;
  for (const step of WARMUP) {
    next = reducer(next, { type: "WARMUP_DONE", stepId: step.id });
  }
  return next;
}

// T10: remove `.skip` when implementing this ticket.
describe.skip("T10 session state machine", () => {
  it("rejects SET_DONE during warmup and leaves state unchanged", () => {
    const before = start();
    expect(before.stage).toBe("warmup");
    const logged = log(SETS[0]!, { actualReps: 5, rir: 1 });
    const after = reducer(before, { type: "SET_DONE", log: logged, nowMs: 2_000 });
    expect(after).toEqual(before);
    expect(after.stage).toBe("warmup");
  });

  it("enters set after every warmup step is done or skipped", () => {
    let state = start();
    state = reducer(state, { type: "WARMUP_DONE", stepId: "general" });
    state = reducer(state, { type: "WARMUP_SKIP", stepId: "mobility" });
    state = reducer(state, { type: "WARMUP_DONE", stepId: "activation" });
    expect(state.stage).toBe("warmup");
    state = reducer(state, { type: "WARMUP_SKIP", stepId: "ramp" });
    expect(state.stage).toBe("set");
    expect(state.setIdx).toBe(0);
    expect(state.skipped).toEqual(["mobility", "ramp"]);
  });

  it("REST_EXTEND works twice; the third is a no-op", () => {
    let state = finishWarmup(start());
    state = reducer(state, {
      type: "SET_DONE",
      log: log(SETS[0]!, { actualReps: 5, rir: 1 }),
      nowMs: 10_000,
    });
    expect(state.stage).toBe("rest");
    const end0 = state.restEndsAt!;
    state = reducer(state, { type: "REST_EXTEND" });
    state = reducer(state, { type: "REST_EXTEND" });
    expect(state.extensionsUsed).toBe(TRAIN_CONFIG.REST_EXTENSIONS_MAX);
    expect(state.restEndsAt).toBe(end0 + 2 * TRAIN_CONFIG.REST_EXTENSION_SEC * 1000);
    const frozen = state.restEndsAt;
    const after = reducer(state, { type: "REST_EXTEND" });
    expect(after.restEndsAt).toBe(frozen);
    expect(after.extensionsUsed).toBe(2);
  });

  it("no event reduces restEndsAt", () => {
    let state = finishWarmup(start());
    state = reducer(state, {
      type: "SET_DONE",
      log: log(SETS[0]!, { actualReps: 5, rir: 1 }),
      nowMs: 10_000,
    });
    const end = state.restEndsAt!;
    const early = reducer(state, { type: "REST_END", nowMs: end - 1 });
    expect(early.restEndsAt).toBeGreaterThanOrEqual(end);
    expect(early.stage).toBe("rest");
    const tickEarly = reducer(state, { type: "REST_TICK", nowMs: end - 5_000 });
    expect(tickEarly.restEndsAt).toBe(end);
  });

  it("REST_TICK at restEndsAt advances setIdx", () => {
    let state = finishWarmup(start());
    state = reducer(state, {
      type: "SET_DONE",
      log: log(SETS[0]!, { actualReps: 5, rir: 1 }),
      nowMs: 10_000,
    });
    const end = state.restEndsAt!;
    state = reducer(state, { type: "REST_TICK", nowMs: end });
    expect(state.stage).toBe("set");
    expect(state.setIdx).toBe(1);
  });

  it("FINISH yields summary with the logs", () => {
    let state = finishWarmup(start());
    const first = log(SETS[0]!, { actualReps: 5, rir: 1 });
    state = reducer(state, { type: "SET_DONE", log: first, nowMs: 10_000 });
    state = reducer(state, { type: "FINISH" });
    expect(state.stage).toBe("summary");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]?.actualReps).toBe(5);
  });
});
