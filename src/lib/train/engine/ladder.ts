import { notImplemented } from "@/lib/train/engine/not-implemented";
import type { Equipment, StepResult, Variation } from "@/lib/train/engine/types";

/**
 * Rank from TRAIN_CONFIG.DIFFICULTY_RANK (ties are allowed).
 * @see docs/tickets/02-ladder.md
 */
export function difficultyRank(_variation: Variation): number {
  return notImplemented("difficultyRank");
}

/**
 * Volume factor. Weighted is `1 + addedKg / bodyKg` (bodyKg falls back to
 * TRAIN_CONFIG.DEFAULT_BODY_KG). Other variations use VARIATION_FACTORS.
 *
 * Worked: variationFactor("weighted", 8, 80) === 1.1
 */
export function variationFactor(_variation: Variation, _addedKg = 0, _bodyKg?: number): number {
  return notImplemented("variationFactor");
}

/**
 * Easiest → hardest, filtered by equipment.
 * - No bar → [] (pull training disabled).
 * - bands "none" drops both band rungs; "light"/"heavy" keep only that rung; "both" keeps both.
 * - No weight → drop `weighted`.
 * - hasRings does not affect this list.
 *
 * Worked: {hasBar:true, bands:"none", hasWeight:false, hasRings:false}
 *   → ["negative","australian","strict","chest-to-bar"]
 */
export function availableLadder(_equipment: Equipment): Variation[] {
  return notImplemented("availableLadder");
}

/**
 * Next harder rung on `ladder`. At weighted, add WEIGHT_STEP_KG.
 * If already at the top, return {capped:true} with the same variation/kg.
 *
 * Worked: stepUp("chest-to-bar", 0, ladderWithWeight)
 *   → {variation:"weighted", addedKg: 2.5}
 */
export function stepUp(_variation: Variation, _addedKg: number, _ladder: Variation[]): StepResult {
  return notImplemented("stepUp");
}

/**
 * Next easier rung. Stepping down from weighted at INITIAL_WEIGHT_KG
 * yields chest-to-bar at 0 kg (or the previous rung present on `ladder`).
 *
 * Worked: stepDown("weighted", 2.5, L) → {variation:"chest-to-bar", addedKg:0}
 */
export function stepDown(_variation: Variation, _addedKg: number, _ladder: Variation[]): StepResult {
  return notImplemented("stepDown");
}
