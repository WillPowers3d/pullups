import { notImplemented } from "@/lib/train/engine/not-implemented";
import type { BadgeId } from "@/lib/train/config";
import type { TrainStats } from "@/lib/train/engine/types";

/**
 * Pure eligibility. Does not write to the DB.
 *
 * - block_started: stats.blockStarted
 * - warmup_perfect: warmupPerfectCount ≥ 10
 * - on_the_clock: zeroOverrunCount ≥ 10
 * - mid_test_up: week6Delta ≠ null && week6Delta ≥ MDC_REPS
 * - new_pr: prDelta ≠ null && prDelta > 0
 * - block_complete: stats.blockComplete
 *   (24 of 24 weekly-pull slots done — 2 per week × 12, not counting PR)
 */
export function trainBadges(_stats: TrainStats): BadgeId[] {
  return notImplemented("trainBadges");
}
