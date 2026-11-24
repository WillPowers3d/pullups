import { describe, expect, it } from "vitest";
import {
  blockDates,
  legalMoveDays,
  placeCrossDays,
  validatePullDays,
} from "@/lib/train/engine/schedule";
import type { Plan, PlannedSession } from "@/lib/train/engine/types";

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

  it("placeCrossDays([1,4], 2) is Tue+Fri — documented tie-break", () => {
    // Preferred candidates: 2,5,6 (0 and 3 are the day before a pull day).
    // Combinations of 2: [2,5] min-gap 3, [2,6] min-gap 3, [5,6] min-gap 1.
    // Tie on min-gap 3 → lexicographically smaller [2,5].
    expect(placeCrossDays([1, 4], 2)).toEqual([2, 5]);
  });

  it("placeCrossDays([1,4], 3) has length 3 and contains no pull days", () => {
    const days = placeCrossDays([1, 4], 3);
    expect(days).toHaveLength(3);
    expect(days).not.toContain(1);
    expect(days).not.toContain(4);
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
        dummyPull("s2", "2026-12-03", 1, 1),
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
