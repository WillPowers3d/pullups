import { TRAIN_CONFIG } from "@/lib/train/config";
import type { Equipment, StepResult, Variation } from "@/lib/train/engine/types";

/**
 * Rank from TRAIN_CONFIG.DIFFICULTY_RANK (ties are allowed).
 * @see docs/tickets/02-ladder.md
 */
export function difficultyRank(variation: Variation): number {
  return TRAIN_CONFIG.DIFFICULTY_RANK[variation];
}

/**
 * Volume factor. Weighted is `1 + addedKg / bodyKg` (bodyKg falls back to
 * TRAIN_CONFIG.DEFAULT_BODY_KG). Other variations use VARIATION_FACTORS.
 *
 * Worked: variationFactor("weighted", 8, 80) === 1.1
 */
export function variationFactor(
  variation: Variation,
  addedKg = 0,
  bodyKg?: number,
): number {
  if (variation === "weighted") {
    const kg = bodyKg ?? TRAIN_CONFIG.DEFAULT_BODY_KG;
    return 1 + addedKg / kg;
  }
  return TRAIN_CONFIG.VARIATION_FACTORS[variation];
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
export function availableLadder(equipment: Equipment): Variation[] {
  if (!equipment.hasBar) {
    return [];
  }

  const ladder: Variation[] = [];

  for (const v of TRAIN_CONFIG.LADDER_ORDER) {
    if (v === "weighted") {
      if (!equipment.hasWeight) continue;
    } else if (v === "negative" || v === "australian" || v === "strict" || v === "chest-to-bar") {
      // Always included when there's a bar
    } else if (v === "band-heavy" || v === "band-light") {
      if (equipment.bands === "none") continue;
      if (equipment.bands === "light" && v !== "band-light") continue;
      if (equipment.bands === "heavy" && v !== "band-heavy") continue;
    }
    ladder.push(v);
  }

  return ladder;
}

/**
 * Next harder rung on `ladder`. At weighted, add WEIGHT_STEP_KG.
 * If already at the top, return {capped:true} with the same variation/kg.
 *
 * Worked: stepUp("chest-to-bar", 0, ladderWithWeight)
 *   → {variation:"weighted", addedKg: 2.5}
 */
export function stepUp(
  variation: Variation,
  addedKg: number,
  ladder: Variation[],
): StepResult {
  const idx = ladder.indexOf(variation);

  if (variation === "weighted") {
    return { variation: "weighted", addedKg: addedKg + TRAIN_CONFIG.WEIGHT_STEP_KG };
  }

  if (idx === -1 || idx === ladder.length - 1) {
    return { variation, addedKg, capped: true };
  }

  const next = ladder[idx + 1];

  if (next === "weighted") {
    return { variation: "weighted", addedKg: TRAIN_CONFIG.INITIAL_WEIGHT_KG };
  }

  return { variation: next, addedKg: 0 };
}

/**
 * Next easier rung. Stepping down from weighted at INITIAL_WEIGHT_KG
 * yields chest-to-bar at 0 kg (or the previous rung present on `ladder`).
 *
 * Worked: stepDown("weighted", 2.5, L) → {variation:"chest-to-bar", addedKg:0}
 */
export function stepDown(
  variation: Variation,
  addedKg: number,
  ladder: Variation[],
): StepResult {
  if (variation === "weighted") {
    return { variation: "chest-to-bar", addedKg: 0 };
  }

  const idx = ladder.indexOf(variation);

  if (idx <= 0) {
    return { variation, addedKg };
  }

  const prev = ladder[idx - 1];

  if (prev === "weighted") {
    return { variation: "weighted", addedKg: TRAIN_CONFIG.INITIAL_WEIGHT_KG };
  }

  return { variation: prev, addedKg: 0 };
}
