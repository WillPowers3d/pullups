import { describe, expect, it } from "vitest";
import { TRAIN_CONFIG } from "@/lib/train/config";
import {
  blockDates,
  legalMoveDays,
  maxCircularConsecutiveRest,
  maxLinearConsecutiveRest,
  placeCrossDays,
  restDaysPerWeek,
  validatePullDays,
} from "@/lib/train/engine/schedule";
import type { Plan, PlannedSession } from "@/lib/train/engine/types";
import { addDays } from "@/lib/dates";

// T03: remove `.skip` when implementing this ticket.
describe.skip("T03 pull-day validation and cross-day placement", () => {
  it("accepts pairs 3–4 calendar days apart (Mon/Thu, Tue/Fri, Sun/Wed)", () => {
    expect(validatePullDays([1, 4]).ok).toBe(true);
    expect(validatePullDays([2, 5]).ok).toBe(true);
    expect(validatePullDays([0, 3]).ok).toBe(true);
  });

  it("rejects pairs closer than 3 days, duplicates, and length ≠ 2", () => {
    const adjacent = validatePullDays([1, 2]);
    expect(adjacent.ok).toBe(false);
    if (!adjacent.ok) expect(adjacent.error).toMatch(/72/);

    expect(validatePullDays([1]).ok).toBe(false);
    expect(validatePullDays([1, 1]).ok).toBe(false);

    const weekend = validatePullDays([6, 1]);
    expect(weekend.ok).toBe(false);
    if (!weekend.ok) expect(weekend.error).toMatch(/72/);
  });

  it("placeCrossDays([1,4], 2) is Tue+Fri — documented tie-break and rest cap", () => {
    // Preferred candidates: 2,5,6 (0 and 3 are the day before a pull day).
    // Combinations of 2: [2,5] min-gap 3, [2,6] min-gap 3, [5,6] min-gap 1.
    // Tie on min-gap 3 → lexicographically smaller [2,5].
    // Layout: Mon pull, Tue cross, Wed rest, Thu pull, Fri cross, Sat rest, Sun rest.
    const cross = placeCrossDays([1, 4], 2);
    expect(cross).toEqual([2, 5]);
    const training = [1, 4, ...cross];
    expect(restDaysPerWeek(training)).toBe(TRAIN_CONFIG.MAX_REST_DAYS_PER_WEEK);
    expect(maxCircularConsecutiveRest(training)).toBe(2);
    expect(maxCircularConsecutiveRest(training)).toBeLessThanOrEqual(
      TRAIN_CONFIG.MAX_CONSECUTIVE_REST_DAYS,
    );
  });

  it("placeCrossDays([1,4], 3) has length 3, no pull days, and ≤3 rest days", () => {
    const days = placeCrossDays([1, 4], 3);
    expect(days).toHaveLength(3);
    expect(days).not.toContain(1);
    expect(days).not.toContain(4);
    const training = [1, 4, ...days];
    expect(restDaysPerWeek(training)).toBeLessThanOrEqual(TRAIN_CONFIG.MAX_REST_DAYS_PER_WEEK);
    expect(maxCircularConsecutiveRest(training)).toBeLessThanOrEqual(
      TRAIN_CONFIG.MAX_CONSECUTIVE_REST_DAYS,
    );
  });

  it("clamps n up to CROSS_DAYS_MIN so a week cannot have 4 rest days", () => {
    const days = placeCrossDays([1, 4], 1);
    expect(days).toHaveLength(TRAIN_CONFIG.CROSS_DAYS_MIN);
    expect(restDaysPerWeek([1, 4, ...days])).toBeLessThanOrEqual(
      TRAIN_CONFIG.MAX_REST_DAYS_PER_WEEK,
    );
  });

  it("counts circular consecutive rest for the Mon/Thu + Tue/Fri layout", () => {
    // Rest weekdays: Wed=3, Sat=6, Sun=0. Wrapping Sat–Sun = 2, isolated Wed = 1.
    expect(restDaysPerWeek([1, 2, 4, 5])).toBe(3);
    expect(maxCircularConsecutiveRest([1, 2, 4, 5])).toBe(2);
  });

  it("maxLinearConsecutiveRest spans week boundaries (William's 3-day cap)", () => {
    // Week 1: Mon 11-30 pull, Tue 12-01 cross, Thu 12-03 pull, Fri 12-04 cross
    // Week 2: same pattern starting Mon 12-07. Rest Sat 12-05 + Sun 12-06 = 2.
    const training = [
      "2026-11-30",
      "2026-12-01",
      "2026-12-03",
      "2026-12-04",
      "2026-12-07",
      "2026-12-08",
      "2026-12-10",
      "2026-12-11",
    ];
    expect(
      maxLinearConsecutiveRest(training, "2026-11-30", "2026-12-13"),
    ).toBe(2);

    // Four open days (Dec 1–4) is over the cap — this layout is illegal.
    expect(
      maxLinearConsecutiveRest(["2026-11-30", "2026-12-05"], "2026-11-30", "2026-12-05"),
    ).toBe(4);
    expect(addDays("2026-11-30", 4)).toBe("2026-12-04");
  });
});

// T04: remove `.skip` when implementing this ticket.
describe.skip("T04 block dates and legal moves", () => {
  it("aligns a 12-week block so PR Sunday is the last day of week 12", () => {
    const result = blockDates("2026-11-23", "2027-02-21");
    expect(result.startDate).toBe("2026-11-30");
    expect(result.compressed).toBe(false);
    expect(result.weeks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("compresses a short window, keeping taper + week 6, dropping from the front", () => {
    const result = blockDates("2026-11-23", "2027-01-10");
    expect(result.compressed).toBe(true);
    expect(result.startDate).toBe("2026-11-30");
    expect(result.weeks).toEqual([6, 8, 9, 10, 11, 12]);
    expect(result.weeks).toContain(11);
    expect(result.weeks).toContain(12);
    expect(result.weeks.length).toBeLessThan(12);
  });

  it("throws when the PR date is in the past", () => {
    expect(() => blockDates("2026-11-23", "2026-11-01")).toThrow();
  });

  it("legalMoveDays returns same-week dates that keep the 3-day pull gap", () => {
    const plan: Plan = {
      startDate: "2026-11-30",
      prDate: "2027-02-21",
      compressed: false,
      weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      sessions: [
        dummyPull("s1", "2026-11-30", 1, 0),
        dummyCross("c1", "2026-12-01", 1),
        dummyPull("s2", "2026-12-03", 1, 1),
        dummyCross("c2", "2026-12-04", 1),
      ],
    };
    const legal = legalMoveDays(plan.sessions[0], plan);
    expect(legal.every((d) => d >= "2026-11-30" && d <= "2026-12-06")).toBe(true);
    expect(legal).not.toContain("2026-12-03");
    expect(legal).not.toContain("2026-12-02");
  });

  it("does not allow moving a PR attempt", () => {
    const pr: PlannedSession = {
      weekIndex: 12,
      date: "2027-02-21",
      type: "pr_attempt",
      slot: 0,
      plan: { type: "pr_attempt", warmup: [], sets: [], volumeScore: 0, taper: true },
    };
    const plan: Plan = {
      startDate: "2026-11-30",
      prDate: "2027-02-21",
      compressed: false,
      weeks: [12],
      sessions: [pr],
    };
    expect(legalMoveDays(pr, plan)).toEqual([]);
  });
});

function dummyPull(
  _id: string,
  date: string,
  weekIndex: number,
  slot: 0 | 1,
): PlannedSession {
  return {
    weekIndex,
    date,
    type: "pull",
    slot,
    plan: { type: "pull", warmup: [], sets: [], volumeScore: 0, taper: false },
  };
}

function dummyCross(_id: string, date: string, weekIndex: number): PlannedSession {
  return {
    weekIndex,
    date,
    type: "cross",
    slot: 0,
    plan: { type: "cross", warmup: [], sets: [], volumeScore: 0, taper: false },
  };
}
