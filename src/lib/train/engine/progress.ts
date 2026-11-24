import { notImplemented } from "@/lib/train/engine/not-implemented";
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
 *
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
export function progress(_input: ProgressInput): ProgressDecision {
  return notImplemented("progress");
}

/**
 * Mid-block / PR re-test. Only change if |newMax - oldMax| ≥ MDC_REPS.
 *
 * Worked: retarget(8, 9) → {changed:false, max:8}
 *         retarget(8, 10) → {changed:true, max:10}
 */
export function retarget(_oldMax: number, _newMax: number): RetargetResult {
  return notImplemented("retarget");
}

export function setHit(_set: LoggedSet): boolean {
  return notImplemented("setHit");
}
