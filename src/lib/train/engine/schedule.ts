import { notImplemented } from "@/lib/train/engine/not-implemented";
import type {
  BlockDates,
  Plan,
  PlannedSession,
  PullDaysResult,
} from "@/lib/train/engine/types";

/**
 * Exactly two distinct weekdays (0=Sun … 6=Sat). Both circular distances
 * must be ≥ TRAIN_CONFIG.MIN_DAYS_BETWEEN_PULL_DAYS (3). Error text must
 * match /72/.
 *
 * Worked: [1,4], [2,5], [0,3] ok. [1,2], [1], [1,1], [6,1] fail.
 */
export function validatePullDays(_days: number[]): PullDaysResult {
  return notImplemented("validatePullDays");
}

/**
 * Rest days in a 7-day week given training weekdays (0=Sun … 6=Sat).
 * `7 - unique(trainingWeekdays).length`.
 */
export function restDaysPerWeek(_trainingWeekdays: number[]): number {
  return notImplemented("restDaysPerWeek");
}

/**
 * Longest circular run of rest days in a repeating Mon–Sun week.
 * Worked: training [1,2,4,5] (Mon, Tue, Thu, Fri) → rest Wed/Sat/Sun,
 * wrapping Sat–Sun = 2.
 */
export function maxCircularConsecutiveRest(_trainingWeekdays: number[]): number {
  return notImplemented("maxCircularConsecutiveRest");
}

/**
 * Longest run of rest days on the inclusive UTC date range `[from, to]`.
 * A day is training if it appears in `trainingDates`, otherwise rest.
 * Used to enforce William's maxConsecutiveRestDays across week boundaries.
 */
export function maxLinearConsecutiveRest(
  _trainingDates: readonly string[],
  _from: string,
  _to: string,
): number {
  return notImplemented("maxLinearConsecutiveRest");
}

/**
 * Pick `n` non-pull weekdays. Clamp `n` into
 * [CROSS_DAYS_MIN, CROSS_DAYS_MAX] (1–3). A week may have 4 rest days.
 *
 * Candidates = non-pull days that are NOT the day before a pull day.
 * If there are fewer than n candidates, add the excluded non-pull days
 * (the day-before-pull days) until n are available.
 *
 * Among n-combinations of the pool, choose the one with the largest minimum
 * circular gap between chosen days. Ties → lexicographically smallest
 * sorted array.
 *
 * Then, while maxCircularConsecutiveRest(pull ∪ chosen) >
 * MAX_CONSECUTIVE_REST_DAYS and unused non-pull days remain, add the
 * fewest extra cross days to break the longest rest run (prefer
 * not-day-before-pull, then lex-smallest weekday). Legal 3+4 pull pairs
 * already have circular rest ≤ 3, so n=1 does not get extras.
 *
 * Return sorted ascending.
 *
 * Worked: placeCrossDays([1,4], 2) → [2,5]
 *   Preferred candidates are Tue/Fri/Sat (2,5,6). Sun and Wed are
 *   day-before-pull. [2,5] and [2,6] both have min gap 3; lex smaller is [2,5].
 *   Layout: Mon pull, Tue cross, Wed rest, Thu pull, Fri cross, Sat rest, Sun rest.
 *   Circular consecutive rest (Sat–Sun) = 2.
 *
 * Worked: placeCrossDays([1,4], 1) → [2]
 *   Singletons in the preferred pool all tie on wrap-gap; lex-smallest is Tue.
 *   Training Mon/Tue/Thu. Rest Wed + Fri–Sun. Longest rest run = 3 (legal).
 *   Four rest days in the week is allowed — there is no weekly rest cap.
 */
export function placeCrossDays(_pullDays: number[], _n: number): number[] {
  return notImplemented("placeCrossDays");
}

/**
 * Lay out which training-week indices fit between `today` and `prDate`.
 *
 * Uncompressed: startDate is the Monday such that `prDate` falls in week 12
 * (the Sunday of that week, or any day in Mon–Sun of week 12).
 *
 * If that Monday is on or before `today`, the plan is compressed:
 * startDate = next Monday strictly after `today`, last week is the week
 * containing `prDate`, and week indices are chosen by keep-priority
 * [12, 11, 6, 10, 9, 8, 7, 5, 4, 3, 2, 1] until the calendar length is filled,
 * then sorted.
 *
 * Throws if prDate < today.
 *
 * Worked: blockDates("2026-11-23","2027-02-21")
 *   → {startDate:"2026-11-30", compressed:false, weeks:[1..12]}
 * Worked: blockDates("2026-11-23","2027-01-10")
 *   → {startDate:"2026-11-30", compressed:true, weeks:[6,8,9,10,11,12]}
 */
export function blockDates(_today: string, _prDate: string): BlockDates {
  return notImplemented("blockDates");
}

/**
 * Dates in the same Mon–Sun week as `session.date` where moving `session`
 * would still satisfy: 3-day pull gap, last weekly-pull ≥ 3 days before
 * prDate, no two sessions on one date, cross not on a pull day, and
 * William's consecutive-rest cap (maxLinearConsecutiveRest on
 * [plan.startDate, plan.prDate] ≤ MAX_CONSECUTIVE_REST_DAYS). A week
 * may have 4 rest days. A `pr_attempt` cannot move (return []).
 */
export function legalMoveDays(_session: PlannedSession, _plan: Plan): string[] {
  return notImplemented("legalMoveDays");
}

/** Weekly pull slots: type pull, or the week-6 max_test. Not pr_attempt. */
export function isWeeklyPullSlot(session: {
  type: PlannedSession["type"];
  weekIndex: number;
}): boolean {
  return (
    session.type === "pull" ||
    (session.type === "max_test" && session.weekIndex === 6)
  );
}
