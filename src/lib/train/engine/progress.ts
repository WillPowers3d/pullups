import { TRAIN_CONFIG } from "@/lib/train/config";
import { stepDown, stepUp } from "@/lib/train/engine/ladder";
import type {
  LoggedSet,
  ProgressDecision,
  RetargetResult,
  Track,
  Variation,
} from "@/lib/train/engine/types";

export type ProgressInput = {
  prev: LoggedSet[] | null;
  cur: LoggedSet[];
  track: Track;
  ladder: Variation[];
  maxReps: number;
};

/**
 * A set "hits" when actualReps ≥ targetReps, rir ≥ rirFloor, and
 * (if verifiedFullReps is a number) verifiedFullReps ≥ targetReps.
 */
export function setHit(set: LoggedSet): boolean {
  if (set.actualReps < set.targetReps) return false;
  if (set.rir < set.rirFloor) return false;
  if (typeof set.verifiedFullReps === "number" && set.verifiedFullReps < set.targetReps) {
    return false;
  }
  return true;
}

/**
 * Mid-block / PR re-test. Only change if |newMax - oldMax| ≥ MDC_REPS.
 *
 * Worked: retarget(8, 9) → {changed:false, max:8}
 *         retarget(8, 10) → {changed:true, max:10}
 */
export function retarget(oldMax: number, newMax: number): RetargetResult {
  const delta = Math.abs(newMax - oldMax);
  if (delta >= TRAIN_CONFIG.MDC_REPS) {
    return { changed: true, max: newMax };
  }
  return { changed: false, max: oldMax };
}

/**
 * Returns true when a single set counts as "missed by ≥ 2".
 * The set failed (setHit is false) and the rep gap is ≥ 2.
 */
function missedBy2(set: LoggedSet): boolean {
  if (!setHit(set)) {
    const gap = set.targetReps - set.actualReps;
    if (gap >= 2) return true;
  }
  return false;
}

/**
 * - prev is null (first session of a slot) → hold, same track.
 * - Every set hits in both prev and cur → progress:
 *     P1/P2: +1 rep until the phase cap (P1 P1_REP_RANGE[1], P2 round(max*P2_PCT_CAP)),
 *     then stepUp and reset reps to the bottom of the range (P1_REP_RANGE[0],
 *     P2 stays at max(1, round(max*P2_PCT_OF_MAX)) after a variation change).
 *     P3: +1 rep until P3_REP_RANGE[1]. Never change P3 variation. Never change set counts.
 * - ≥ half the sets missed by ≥ 2 reps in both prev and cur → regress (stepDown,
 *   or −1 rep if already at the bottom rung).
 * - Otherwise hold.
 *
 * Progression edits the track only. Set counts are re-derived next session
 * from prescribePullSession + that week's multiplier.
 */
export function progress(input: ProgressInput): ProgressDecision {
  const { prev, cur, track, ladder, maxReps } = input;

  // prev === null → first session, hold
  if (prev === null) {
    return { action: "hold", reason: "First session of slot — holding track.", track };
  }

  // Check if all sets hit in both prev and cur
  const prevAllHit = prev.every(setHit);
  const curAllHit = cur.every(setHit);

  if (prevAllHit && curAllHit) {
    // Progress: +1 rep per phase, stepUp when at cap
    const newTrack = deepCloneTrack(track);

    // P1 progression
    const p1Cap = TRAIN_CONFIG.P1_REP_RANGE[1]; // 5
    if (newTrack.p1.reps < p1Cap) {
      newTrack.p1.reps += 1;
    } else {
      // At cap → stepUp and reset to bottom of range
      const stepped = stepUp(newTrack.p1.variation, newTrack.p1.addedKg, ladder);
      newTrack.p1.variation = stepped.variation;
      newTrack.p1.addedKg = stepped.addedKg;
      newTrack.p1.reps = TRAIN_CONFIG.P1_REP_RANGE[0]; // 2
    }

    // P2 progression
    const p2Cap = Math.round(maxReps * TRAIN_CONFIG.P2_PCT_CAP);
    if (newTrack.p2.reps < p2Cap) {
      newTrack.p2.reps += 1;
    } else {
      // At cap → stepDown and reset
      const stepped = stepUp(newTrack.p2.variation, newTrack.p2.addedKg, ladder);
      newTrack.p2.variation = stepped.variation;
      newTrack.p2.addedKg = stepped.addedKg;
      // After stepUp, P2 reps stay at max(1, round(max * P2_PCT_OF_MAX))
      newTrack.p2.reps = Math.max(1, Math.round(maxReps * TRAIN_CONFIG.P2_PCT_OF_MAX));
    }

    // P3 progression: +1 rep to 15, never change variation, never change set counts
    const p3Max = TRAIN_CONFIG.P3_REP_RANGE[1]; // 15
    if (newTrack.p3.reps < p3Max) {
      newTrack.p3.reps += 1;
    }

    return { action: "progress", reason: "All sets hit in both sessions — progressing.", track: newTrack };
  }

  // Check regression: ≥ 50% of sets missed by ≥ 2 in BOTH prev and cur
  const prevMissedBy2Count = prev.filter(missedBy2).length;
  const curMissedBy2Count = cur.filter(missedBy2).length;
  const prevSetCount = prev.length;
  const curSetCount = cur.length;

  const prevMissRatio = prevSetCount > 0 ? prevMissedBy2Count / prevSetCount : 0;
  const curMissRatio = curSetCount > 0 ? curMissedBy2Count / curSetCount : 0;

  if (prevMissRatio >= 0.5 && curMissRatio >= 0.5) {
    // Regress: stepDown on P1 and P2
    const newTrack = deepCloneTrack(track);

    // P1 regress
    const p1Stepped = stepDown(newTrack.p1.variation, newTrack.p1.addedKg, ladder);
    if (p1Stepped.variation !== newTrack.p1.variation || p1Stepped.addedKg !== newTrack.p1.addedKg) {
      newTrack.p1.variation = p1Stepped.variation;
      newTrack.p1.addedKg = p1Stepped.addedKg;
      // If at bottom rung, -1 rep instead
      if (p1Stepped.variation === track.p1.variation && p1Stepped.addedKg === track.p1.addedKg) {
        newTrack.p1.reps = Math.max(1, newTrack.p1.reps - 1);
      }
    } else {
      newTrack.p1.variation = p1Stepped.variation;
      newTrack.p1.addedKg = p1Stepped.addedKg;
    }

    // P2 regress
    const p2Stepped = stepDown(newTrack.p2.variation, newTrack.p2.addedKg, ladder);
    if (p2Stepped.variation !== newTrack.p2.variation || p2Stepped.addedKg !== newTrack.p2.addedKg) {
      newTrack.p2.variation = p2Stepped.variation;
      newTrack.p2.addedKg = p2Stepped.addedKg;
      if (p2Stepped.variation === track.p2.variation && p2Stepped.addedKg === track.p2.addedKg) {
        newTrack.p2.reps = Math.max(1, newTrack.p2.reps - 1);
      }
    } else {
      newTrack.p2.variation = p2Stepped.variation;
      newTrack.p2.addedKg = p2Stepped.addedKg;
    }

    return { action: "regress", reason: "≥ 50% of sets missed by ≥ 2 in both sessions — regressing.", track: newTrack };
  }

  // Otherwise hold
  return { action: "hold", reason: "Mixed results — holding track.", track };
}

/** Deep clone the track so we never mutate the input. */
function deepCloneTrack(track: Track): Track {
  return {
    p1: { ...track.p1 },
    p2: { ...track.p2 },
    p3: { ...track.p3 },
  };
}
