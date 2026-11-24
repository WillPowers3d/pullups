import { notImplemented } from "@/lib/train/engine/not-implemented";
import type { GeneratePlanInput, Plan } from "@/lib/train/engine/types";

/**
 * Volume multiplier for a week index.
 *
 * Uncompressed (keptWeeks omitted or 1..12):
 *   week 1 → 1.0
 *   weeks 2–10 → (1 + BUILD_WEEKLY_INCREASE)^(weekIndex - 1)
 *   week 11 → week10 * TAPER_VOLUME[0]
 *   week 12 → week10 * TAPER_VOLUME[1]
 *
 * Compressed: remaining build weeks (≤10) are renormalized so the first
 * remaining build week is 1.0, then +BUILD_WEEKLY_INCREASE per remaining
 * build week. Taper still applies to that peak. This avoids dumping a
 * late joiner into week-6 volume on day one.
 *
 * Week-over-week rise for build weeks is BUILD_WEEKLY_INCREASE (7.5%),
 * which must stay ≤ WEEKLY_INCREASE_CAP (10%).
 */
export function weekMultiplier(_weekIndex: number, _keptWeeks?: readonly number[]): number {
  return notImplemented("weekMultiplier");
}

/**
 * Build the 12-week (or compressed) calendar.
 *
 * - Use blockDates(today, prDate) for startDate / weeks / compressed.
 * - Each kept week has exactly 2 weekly-pull slots on pullDays (earlier
 *   weekday = slot 0). Week 6 slot 1 is type max_test.
 * - Cross days from placeCrossDays(pullDays, max(CROSS_DAYS_MIN, crossDaysPerWeek));
 *   none share a date with a pull slot. Taper weeks keep those requested
 *   cross days (prescribeCross(..., taper=true) — low intensity, not rest).
 * - If maxLinearConsecutiveRest on [startDate, prDate] would exceed
 *   MAX_CONSECUTIVE_REST_DAYS, insert extra cross days to break the run
 *   (prefer not-day-before-pull, then the 4th rest day of the run).
 * - pr_attempt is an extra session on prDate (not one of the two weekly slots).
 * - Last weekly-pull date must be ≥ LAST_PULL_BEFORE_PR_DAYS before prDate;
 *   shift that slot if not. Do not drop a weekly-pull if that would create
 *   a 4-day rest run; move or add a cross day instead.
 * - William's rule (not a weekly cap): maxLinearConsecutiveRest over
 *   [startDate, prDate] is ≤ MAX_CONSECUTIVE_REST_DAYS, including taper.
 * - Pull prescriptions use weekMultiplier(weekIndex, weeks).
 * - Same input → deep-equal output. No Date.now, no Math.random.
 */
export function generatePlan(_input: GeneratePlanInput): Plan {
  return notImplemented("generatePlan");
}
