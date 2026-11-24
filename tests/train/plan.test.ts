import { describe, expect, it } from "vitest";
import { generatePlan, weekMultiplier } from "@/lib/train/engine/plan";
import { isWeeklyPullSlot } from "@/lib/train/engine/schedule";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { FULL_EQUIPMENT } from "./helpers";
import { addDays, diffDays } from "@/lib/dates";
import type { GeneratePlanInput } from "@/lib/train/engine/types";

const INPUT: GeneratePlanInput = {
  today: "2026-11-23",
  prDate: "2027-02-21",
  maxReps: 8,
  equipment: FULL_EQUIPMENT,
  pullDays: [1, 4],
  crossDaysPerWeek: 2,
  bodyKg: 80,
  crossExercises: ["push-up", "plank", "hollow-body"],
};

// T08: remove `.skip` when implementing this ticket.
describe.skip("T08 plan generation", () => {
  it("places two weekly-pull slots per week, week-6 slot 1 is max_test, PR on prDate", () => {
    const plan = generatePlan(INPUT);
    expect(plan.prDate).toBe("2027-02-21");
    expect(plan.compressed).toBe(false);
    for (const week of plan.weeks) {
      const slots = plan.sessions.filter(
        (s) => s.weekIndex === week && isWeeklyPullSlot(s),
      );
      expect(slots, `week ${week} weekly-pull slots`).toHaveLength(2);
    }
    const week6 = plan.sessions.filter((s) => s.weekIndex === 6 && isWeeklyPullSlot(s));
    expect(week6.some((s) => s.slot === 1 && s.type === "max_test")).toBe(true);
    const pr = plan.sessions.filter((s) => s.type === "pr_attempt");
    expect(pr).toHaveLength(1);
    expect(pr[0]?.date).toBe("2027-02-21");
  });

  it("keeps ≥ 3 calendar days between consecutive weekly-pull slots and before PR", () => {
    const plan = generatePlan(INPUT);
    const pulls = plan.sessions
      .filter((s) => isWeeklyPullSlot(s))
      .sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < pulls.length; i++) {
      expect(diffDays(pulls[i - 1]!.date, pulls[i]!.date)).toBeGreaterThanOrEqual(
        TRAIN_CONFIG.MIN_DAYS_BETWEEN_PULL_DAYS,
      );
    }
    const lastPull = pulls[pulls.length - 1]!;
    expect(diffDays(lastPull.date, plan.prDate)).toBeGreaterThanOrEqual(
      TRAIN_CONFIG.LAST_PULL_BEFORE_PR_DAYS,
    );
  });

  it("weekMultiplier compounds at 7.5% then tapers off week 10", () => {
    expect(weekMultiplier(1)).toBe(1);
    for (let w = 2; w <= 10; w++) {
      const prev = weekMultiplier(w - 1);
      const cur = weekMultiplier(w);
      const rise = cur / prev - 1;
      expect(rise).toBeLessThanOrEqual(TRAIN_CONFIG.WEEKLY_INCREASE_CAP + 1e-12);
      expect(cur).toBeCloseTo((1 + TRAIN_CONFIG.BUILD_WEEKLY_INCREASE) ** (w - 1), 10);
    }
    const peak = weekMultiplier(10);
    expect(weekMultiplier(11)).toBeCloseTo(peak * 0.7, 10);
    expect(weekMultiplier(12)).toBeCloseTo(peak * 0.45, 10);
  });

  it("realized pull volume stays within 10% of target unless at the min-set floor", () => {
    const plan = generatePlan(INPUT);
    const pulls = plan.sessions.filter((s) => s.type === "pull");
    for (const session of pulls) {
      const target =
        TRAIN_CONFIG.START_VOLUME_X_MAX *
        INPUT.maxReps *
        weekMultiplier(session.weekIndex, plan.weeks);
      const cap = target * (1 + TRAIN_CONFIG.VOLUME_TOLERANCE);
      const atFloor = isMinSetFloor(session.plan.sets);
      if (!atFloor) {
        expect(session.plan.volumeScore).toBeLessThanOrEqual(cap + 1e-9);
      }
    }
  });

  it("build-week volume is non-decreasing through week 10; week 12 is < week 10 × 0.6", () => {
    const plan = generatePlan(INPUT);
    const byWeek = (w: number) =>
      plan.sessions
        .filter((s) => s.weekIndex === w && s.type === "pull")
        .reduce((sum, s) => sum + s.plan.volumeScore, 0);
    for (let w = 2; w <= 10; w++) {
      if (w === 6) continue;
      expect(byWeek(w)).toBeGreaterThanOrEqual(byWeek(w - 1) - 1e-9);
    }
    expect(byWeek(12)).toBeLessThan(byWeek(10) * 0.6);
  });

  it("schedules requested cross sessions per week, never on a pull day", () => {
    const plan = generatePlan(INPUT);
    for (const week of plan.weeks) {
      const cross = plan.sessions.filter((s) => s.weekIndex === week && s.type === "cross");
      const pullDates = new Set(
        plan.sessions.filter((s) => s.weekIndex === week && isWeeklyPullSlot(s)).map((s) => s.date),
      );
      expect(cross.length).toBeGreaterThanOrEqual(INPUT.crossDaysPerWeek);
      expect(cross.every((s) => !pullDates.has(s.date))).toBe(true);
    }
  });

  it("allows 1 cross day and 4 rest days in a week when consecutive rest stays ≤3", () => {
    const plan = generatePlan({ ...INPUT, crossDaysPerWeek: 1 });
    const training = new Set(plan.sessions.map((s) => s.date));
    let sawFourRestDays = false;
    for (let offset = 0; offset < plan.weeks.length; offset++) {
      const monday = addDays(plan.startDate, offset * 7);
      let rest = 0;
      for (let i = 0; i < 7; i++) {
        const day = addDays(monday, i);
        if (day > plan.prDate) break;
        if (!training.has(day)) rest += 1;
      }
      if (rest === 4) sawFourRestDays = true;
    }
    expect(sawFourRestDays).toBe(true);
    const week1Cross = plan.sessions.filter((s) => s.weekIndex === 1 && s.type === "cross");
    expect(week1Cross.length).toBeGreaterThanOrEqual(1);
  });

  it("never runs 4 consecutive rest days from startDate through prDate, including taper", () => {
    const plan = generatePlan(INPUT);
    const training = new Set(plan.sessions.map((s) => s.date));
    let run = 0;
    let maxRun = 0;
    for (let day = plan.startDate; day <= plan.prDate; day = addDays(day, 1)) {
      if (training.has(day)) {
        run = 0;
      } else {
        run += 1;
        maxRun = Math.max(maxRun, run);
      }
    }
    expect(maxRun).toBeLessThanOrEqual(TRAIN_CONFIG.MAX_CONSECUTIVE_REST_DAYS);
  });

  it("taper weeks keep cross days at low intensity instead of converting them to rest", () => {
    const plan = generatePlan(INPUT);
    for (const week of [11, 12]) {
      const cross = plan.sessions.filter((s) => s.weekIndex === week && s.type === "cross");
      expect(cross.length, `week ${week} cross days`).toBeGreaterThanOrEqual(
        INPUT.crossDaysPerWeek,
      );
      expect(cross.every((s) => s.plan.taper)).toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(generatePlan(INPUT)).toEqual(generatePlan(INPUT));
  });
});

function isMinSetFloor(sets: { phase: string }[]): boolean {
  const p1 = sets.filter((s) => s.phase === "p1").length;
  const p2 = sets.filter((s) => s.phase === "p2").length;
  const p3 = sets.filter((s) => s.phase === "p3").length;
  return p1 <= TRAIN_CONFIG.P1_SETS[0] && p2 <= TRAIN_CONFIG.P2_SETS[0] && p3 <= TRAIN_CONFIG.P3_SETS[0];
}
