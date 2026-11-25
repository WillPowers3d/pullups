import { TRAIN_CONFIG } from "@/lib/train/config";
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
export function trainBadges(stats: TrainStats): BadgeId[] {
  const badges: BadgeId[] = [];

  for (const id of TRAIN_CONFIG.BADGE_IDS) {
    switch (id) {
      case "block_started":
        if (stats.blockStarted) badges.push(id);
        break;
      case "warmup_perfect":
        if (stats.warmupPerfectCount >= 10) badges.push(id);
        break;
      case "on_the_clock":
        if (stats.zeroOverrunCount >= 10) badges.push(id);
        break;
      case "mid_test_up":
        if (
          stats.week6Delta !== null &&
          stats.week6Delta >= TRAIN_CONFIG.MDC_REPS
        ) {
          badges.push(id);
        }
        break;
      case "new_pr":
        if (stats.prDelta !== null && stats.prDelta > 0) badges.push(id);
        break;
      case "block_complete":
        if (stats.blockComplete) badges.push(id);
        break;
    }
  }

  return badges;
}
