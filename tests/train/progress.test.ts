import { describe, expect, it } from "vitest";
import { progress, retarget } from "@/lib/train/engine/progress";
import { FULL_LADDER, SAMPLE_TRACK, log, set } from "./helpers";
import type { LoggedSet, Track } from "@/lib/train/engine/types";

function sessionFromTrack(track: Track, hit: boolean, missBy = 0): LoggedSet[] {
  const p1 = set({
    phase: "p1",
    variation: track.p1.variation,
    addedKg: track.p1.addedKg,
    targetReps: track.p1.reps,
    restSec: 180,
    rirFloor: 1,
  });
  const p2 = set({
    phase: "p2",
    variation: track.p2.variation,
    addedKg: track.p2.addedKg,
    targetReps: track.p2.reps,
    restSec: 120,
    rirFloor: 1,
  });
  const p3 = set({
    phase: "p3",
    variation: track.p3.variation,
    targetReps: track.p3.reps,
    restSec: 60,
    rirFloor: 1,
  });
  const actual = (target: number) => (hit ? target : Math.max(0, target - missBy));
  const rir = hit ? 1 : 0;
  return [
    ...Array.from({ length: 3 }, () => log(p1, { actualReps: actual(p1.targetReps), rir })),
    ...Array.from({ length: 4 }, () => log(p2, { actualReps: actual(p2.targetReps), rir })),
    ...Array.from({ length: 2 }, () => log(p3, { actualReps: actual(p3.targetReps), rir })),
  ];
}

// T09: remove `.skip` when implementing this ticket.
describe("T09 progression", () => {
  it("two sessions of all hits at RIR ≥ 1 progress P2 by +1 rep", () => {
    const cur = sessionFromTrack(SAMPLE_TRACK, true);
    const decision = progress({
      prev: cur,
      cur,
      track: SAMPLE_TRACK,
      ladder: FULL_LADDER,
      maxReps: 10,
    });
    expect(decision.action).toBe("progress");
    expect(decision.track.p2.reps).toBe(SAMPLE_TRACK.p2.reps + 1);
  });

  it("P1 already at 5 reps steps up the variation and resets to 2", () => {
    const track: Track = {
      ...SAMPLE_TRACK,
      p1: { variation: "chest-to-bar", addedKg: 0, reps: 5 },
    };
    const cur = sessionFromTrack(track, true);
    const decision = progress({
      prev: cur,
      cur,
      track,
      ladder: FULL_LADDER,
      maxReps: 10,
    });
    expect(decision.action).toBe("progress");
    expect(decision.track.p1).toEqual({
      variation: "weighted",
      addedKg: 2.5,
      reps: 2,
    });
  });

  it("one hit session and one miss holds the track", () => {
    const hit = sessionFromTrack(SAMPLE_TRACK, true);
    const miss = sessionFromTrack(SAMPLE_TRACK, false, 2);
    const decision = progress({
      prev: hit,
      cur: miss,
      track: SAMPLE_TRACK,
      ladder: FULL_LADDER,
      maxReps: 10,
    });
    expect(decision.action).toBe("hold");
    expect(decision.track).toEqual(SAMPLE_TRACK);
  });

  it("two sessions with ≥ 50% of sets missed by ≥ 2 regress a step", () => {
    const miss = sessionFromTrack(SAMPLE_TRACK, false, 2);
    const decision = progress({
      prev: miss,
      cur: miss,
      track: SAMPLE_TRACK,
      ladder: FULL_LADDER,
      maxReps: 10,
    });
    expect(decision.action).toBe("regress");
    expect(decision.track.p1.variation).not.toBe("weighted");
  });

  it("verifiedFullReps below target counts as a miss even if actualReps hit", () => {
    const prescribed = set({
      phase: "p2",
      variation: "strict",
      targetReps: 5,
      restSec: 120,
      rirFloor: 1,
    });
    const missed = log(prescribed, {
      actualReps: 5,
      rir: 1,
      verifiedFullReps: 3,
    });
    const hitOthers = sessionFromTrack(SAMPLE_TRACK, true).map((s, i) =>
      i === 3 ? missed : s,
    );
    const decision = progress({
      prev: hitOthers,
      cur: hitOthers,
      track: SAMPLE_TRACK,
      ladder: FULL_LADDER,
      maxReps: 10,
    });
    expect(decision.action).not.toBe("progress");
  });

  it("retarget ignores changes smaller than MDC_REPS = 2", () => {
    expect(retarget(8, 9)).toEqual({ changed: false, max: 8 });
    expect(retarget(8, 10)).toEqual({ changed: true, max: 10 });
  });

  it("first session of a slot (prev null) holds", () => {
    const cur = sessionFromTrack(SAMPLE_TRACK, true);
    const decision = progress({
      prev: null,
      cur,
      track: SAMPLE_TRACK,
      ladder: FULL_LADDER,
      maxReps: 10,
    });
    expect(decision.action).toBe("hold");
    expect(decision.track).toEqual(SAMPLE_TRACK);
  });
});
