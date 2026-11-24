import { describe, expect, it } from "vitest";
import {
  buildWarmup,
  filterCrossExercises,
  orderSets,
  prescribeCross,
  prescribeMaxTest,
  prescribePullSession,
  volumeScore,
} from "@/lib/train/engine/prescribe";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { FULL_EQUIPMENT, FULL_LADDER, set } from "./helpers";
import type { PrescribedSet } from "@/lib/train/engine/types";

// T05: remove `.skip` when implementing this ticket.
describe("T05 warm-up, ordering, volume score", () => {
  it("buildWarmup(strict × 6) has 4 named steps and ramp reps [2, 3]", () => {
    const steps = buildWarmup(
      set({ phase: "p1", variation: "strict", targetReps: 6, restSec: 180 }),
    );
    expect(steps.map((s) => s.id)).toEqual([
      "general",
      "mobility",
      "activation",
      "ramp",
    ]);
    const ramp = steps.find((s) => s.id === "ramp");
    expect(ramp?.rampReps).toEqual([2, 3]);
    expect(steps).toHaveLength(4);
  });

  it("orderSets is phase, then rank desc, then reps asc, and stable", () => {
    const a = set({ phase: "p2", variation: "strict", targetReps: 8 });
    const b = set({ phase: "p1", variation: "weighted", targetReps: 5, addedKg: 2.5 });
    const c = set({ phase: "p1", variation: "strict", targetReps: 3 });
    const d = set({ phase: "p1", variation: "strict", targetReps: 5 });
    const e = set({ phase: "p3", variation: "band-light", targetReps: 10 });
    const equalA = set({ phase: "p2", variation: "strict", targetReps: 8 });
    const shuffled = [e, a, d, b, c, equalA];
    const ordered = orderSets(shuffled);
    expect(ordered.map((s) => s.phase)).toEqual(["p1", "p1", "p1", "p2", "p2", "p3"]);
    expect(ordered[0].variation).toBe("weighted");
    expect(ordered[1].targetReps).toBe(3);
    expect(ordered[2].targetReps).toBe(5);
    const p2 = ordered.filter((s) => s.phase === "p2");
    expect(p2[0]).toBe(a);
    expect(p2[1]).toBe(equalA);
  });

  it("volumeScore rounds the SUM to 1 decimal — worked 51.5", () => {
    const sets: PrescribedSet[] = [
      ...Array.from({ length: 3 }, () =>
        set({ phase: "p1", variation: "weighted", targetReps: 5, addedKg: 2.5, restSec: 180 }),
      ),
      ...Array.from({ length: 4 }, () =>
        set({ phase: "p2", variation: "strict", targetReps: 6, restSec: 120 }),
      ),
      ...Array.from({ length: 2 }, () =>
        set({ phase: "p3", variation: "band-light", targetReps: 10, restSec: 60 }),
      ),
    ];
    expect(volumeScore(sets, 80)).toBe(51.5);
  });
});

// T06: remove `.skip` when implementing this ticket.
describe.skip("T06 pull-session prescription", () => {
  const base = {
    maxReps: 10,
    ladder: FULL_LADDER,
    weekIndex: 1,
    volumeMultiplier: 1,
    bodyKg: 80,
  };

  it("uses weighted / strict / band-light with the worked set counts", () => {
    const plan = prescribePullSession(base);
    const p1 = plan.sets.filter((s) => s.phase === "p1");
    const p2 = plan.sets.filter((s) => s.phase === "p2");
    const p3 = plan.sets.filter((s) => s.phase === "p3");
    expect(p1.every((s) => s.variation === "weighted" && s.targetReps === 5 && s.addedKg === 2.5)).toBe(true);
    expect(p2.every((s) => s.variation === "strict" && s.targetReps === 6)).toBe(true);
    expect(p3.every((s) => s.variation === "band-light" && s.targetReps === 10)).toBe(true);
    expect(p1[0]?.restSec).toBe(180);
    expect(p2[0]?.restSec).toBe(120);
    expect(p3[0]?.restSec).toBe(60);
    expect(p1).toHaveLength(3);
    expect(p2).toHaveLength(4);
    expect(p3).toHaveLength(2);
    expect(plan.volumeScore).toBe(51.5);
  });

  it("beginner path (max 2, no bands) stays on negatives and Australians", () => {
    const plan = prescribePullSession({
      maxReps: 2,
      ladder: ["negative", "australian", "strict", "chest-to-bar"],
      weekIndex: 1,
      volumeMultiplier: 1,
      bodyKg: 80,
    });
    expect(plan.sets.some((s) => s.phase === "p1" && s.variation === "negative")).toBe(true);
    expect(plan.sets.filter((s) => s.phase === "p2").every((s) => s.variation === "australian")).toBe(true);
    expect(plan.sets.filter((s) => s.phase === "p3").every((s) => s.variation === "australian")).toBe(true);
    expect(plan.sets.some((s) => s.variation === "strict" || s.variation === "weighted")).toBe(false);
  });

  it("week 12 drops P3 and is at most half of week-10 volume", () => {
    const week10 = prescribePullSession({ ...base, weekIndex: 10, volumeMultiplier: 1.075 ** 9 });
    const week12 = prescribePullSession({
      ...base,
      weekIndex: 12,
      volumeMultiplier: 1.075 ** 9 * TRAIN_CONFIG.TAPER_VOLUME[1],
    });
    expect(week12.sets.filter((s) => s.phase === "p3")).toHaveLength(0);
    expect(week12.volumeScore).toBeLessThanOrEqual(0.5 * week10.volumeScore);
    expect(week12.taper).toBe(true);
  });
});

// T07: remove `.skip` when implementing this ticket.
describe("T07 cross and max-test prescriptions", () => {
  it("prescribeCross runs 3 rounds of non-pull exercises", () => {
    const plan = prescribeCross(["push-up", "plank", "ring-dip"], false);
    expect(plan.type).toBe("cross");
    const names = plan.sets.map((s) => s.variation);
    expect(names.every((n) => n !== "strict" && n !== "weighted" && n !== "negative")).toBe(true);
    expect(plan.sets).toHaveLength(9);
    expect(plan.sets.every((s) => s.restSec === TRAIN_CONFIG.CROSS_REST_SEC)).toBe(true);
  });

  it("taper cross days drop to 2 rounds", () => {
    const plan = prescribeCross(["push-up", "plank", "ring-dip"], true);
    expect(plan.sets).toHaveLength(6);
    expect(plan.taper).toBe(true);
  });

  it("max test opens with a strict max set (targetReps 0, 300 s rest)", () => {
    const plan = prescribeMaxTest(FULL_LADDER);
    expect(plan.sets[0]).toMatchObject({
      variation: "strict",
      targetReps: 0,
      restSec: 300,
    });
  });

  it("filterCrossExercises drops ring-dip without rings", () => {
    expect(filterCrossExercises({ ...FULL_EQUIPMENT, hasRings: false })).not.toContain("ring-dip");
    expect(filterCrossExercises(FULL_EQUIPMENT)).toContain("ring-dip");
  });
});
