import { describe, expect, it } from "vitest";
import { trainBadges } from "@/lib/train/badges";
import type { TrainStats } from "@/lib/train/engine/types";

const EMPTY: TrainStats = {
  sessionsCompleted: 0,
  pullSessionsCompleted: 0,
  warmupPerfectCount: 0,
  restOverrunCount: 0,
  zeroOverrunCount: 0,
  week6Delta: null,
  prDelta: null,
  blockComplete: false,
  blockStarted: false,
};

// T16: remove `.skip` when implementing this ticket.
describe.skip("T16 badge eligibility", () => {
  it("returns block_started when the block exists", () => {
    expect(trainBadges({ ...EMPTY, blockStarted: true })).toEqual(["block_started"]);
  });

  it("returns warmup_perfect at 10 skip-free sessions", () => {
    expect(trainBadges({ ...EMPTY, warmupPerfectCount: 10 })).toContain("warmup_perfect");
    expect(trainBadges({ ...EMPTY, warmupPerfectCount: 9 })).not.toContain("warmup_perfect");
  });

  it("returns on_the_clock at 10 sessions with zero rest overruns", () => {
    expect(trainBadges({ ...EMPTY, zeroOverrunCount: 10 })).toContain("on_the_clock");
  });

  it("returns mid_test_up when week-6 delta ≥ MDC", () => {
    expect(trainBadges({ ...EMPTY, week6Delta: 2 })).toContain("mid_test_up");
    expect(trainBadges({ ...EMPTY, week6Delta: 1 })).not.toContain("mid_test_up");
  });

  it("returns new_pr when PR beats baseline", () => {
    expect(trainBadges({ ...EMPTY, prDelta: 1 })).toContain("new_pr");
    expect(trainBadges({ ...EMPTY, prDelta: 0 })).not.toContain("new_pr");
  });

  it("returns block_complete when all 24 weekly-pull slots are done", () => {
    expect(trainBadges({ ...EMPTY, blockComplete: true })).toContain("block_complete");
  });
});
