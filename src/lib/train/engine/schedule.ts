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
 * Pick `n` non-pull weekdays.
 *
 * Candidates = non-pull days that are NOT the day before a pull day.
 * If there are fewer than n candidates, add the excluded non-pull days
 * (the day-before-pull days) until n are available.
 *
 * Among n-combinations of the candidate pool, choose the one with the
 * largest minimum circular gap between chosen days. Ties → lexicographically
 * smallest sorted array. Return sorted ascending.
 *
 * Worked: placeCrossDays([1,4], 2) → [2,5]
 *   Preferred candidates are Tue/Fri/Sat (2,5,6). Sun and Wed are
 *   day-before-pull. [2,5] and [2,6] both have min gap 3; lex smaller is [2,5].
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
 * prDate, no two sessions on one date, cross not on a pull day.
 * A `pr_attempt` cannot move (return []).
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
