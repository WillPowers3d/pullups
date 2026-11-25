import { TRAIN_CONFIG } from "@/lib/train/config";
import { variationFactor, difficultyRank } from "@/lib/train/engine/ladder";
import type {
  Equipment,
  ExerciseName,
  PrescribedSet,
  PrescribePullInput,
  SessionPlan,
  Track,
  Variation,
  WarmupStep,
} from "@/lib/train/engine/types";

/**
 * Four steps: general, mobility, activation, ramp.
 * Ramp reps = max(1, round(firstSet.targetReps * pct)) for WARMUP_RAMP_PCTS.
 * Ramp uses the same variation, or the next easier one if firstSet is weighted.
 *
 * Worked: buildWarmup(strict × 6) → 4 steps, ramp reps [2, 3]
 *   round(6*0.3)=2, round(6*0.5)=3.
 */
export function buildWarmup(firstSet: PrescribedSet): WarmupStep[] {
  const { WARMUP_GENERAL_SEC, WARMUP_MOBILITY_REPS, WARMUP_ACTIVATION_SETS, WARMUP_HANG_SEC, WARMUP_RAMP_PCTS, LADDER_ORDER } = TRAIN_CONFIG;

  // If firstSet is weighted, use the next easier variation for the ramp label
  const rampVariation: Variation = firstSet.variation === "weighted"
    ? (LADDER_ORDER[LADDER_ORDER.indexOf("weighted") - 1] as Variation)
    : (firstSet.variation as Variation);

  return [
    { id: "general", label: "General", kind: "timer", seconds: WARMUP_GENERAL_SEC },
    { id: "mobility", label: "Mobility", kind: "reps", reps: WARMUP_MOBILITY_REPS },
    { id: "activation", label: "Activation", kind: "hang", seconds: WARMUP_HANG_SEC, sets: WARMUP_ACTIVATION_SETS },
    { id: "ramp", label: `Ramp (${rampVariation})`, kind: "reps", rampReps: WARMUP_RAMP_PCTS.map((pct) => Math.max(1, Math.round(firstSet.targetReps * pct))) },
  ];
}

/**
 * Sort by phase order (p1, p2, p3, then test), then difficultyRank descending,
 * then targetReps ascending. Stable (original index as last key).
 */
export function orderSets(sets: PrescribedSet[]): PrescribedSet[] {
  const phaseOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2, test: 3, warmup: 4 };

  return sets
    .map((s, i) => ({ set: s, idx: i }))
    .sort((a, b) => {
      const pa = phaseOrder[a.set.phase] ?? 9;
      const pb = phaseOrder[b.set.phase] ?? 9;
      if (pa !== pb) return pa - pb;
      const ra = difficultyRank(a.set.variation as Variation);
      const rb = difficultyRank(b.set.variation as Variation);
      if (rb !== ra) return rb - ra;
      if (a.set.targetReps !== b.set.targetReps) return a.set.targetReps - b.set.targetReps;
      return a.idx - b.idx;
    })
    .map(({ set }) => set);
}

/**
 * Σ targetReps × variationFactor, then round the SUM to 1 decimal
 * (Math.round(sum * 10) / 10). Do not round per set.
 */
export function volumeScore(sets: PrescribedSet[], bodyKg?: number): number {
  const sum = sets.reduce((acc, s) => acc + s.targetReps * variationFactor(s.variation as Variation, s.addedKg, bodyKg), 0);
  return Math.round(sum * 10) / 10;
}

/**
 * Initial track from maxReps and the available ladder.
 *
 * maxReps > BEGINNER_MAX_INCLUSIVE:
 *   P1 hardest of: weighted if hasWeight-equivalent (weighted on ladder) and
 *      maxReps ≥ P1_WEIGHTED_MIN_MAX; else chest-to-bar if max ≥ P1_C2B_MIN_MAX
 *      and on ladder; else strict. Weighted starts at INITIAL_WEIGHT_KG.
 *   P1 reps = clamp(round(max * P1_PCT_OF_MAX), P1_REP_RANGE)
 *   P2 strict, reps = max(1, round(max * P2_PCT_OF_MAX))
 *   P3 band-light if on ladder, else australian; reps P3_DEFAULT_REPS
 *
 * maxReps ≤ BEGINNER_MAX_INCLUSIVE:
 *   P1 negative × 3, P2 band-heavy or australian × 5, P3 australian × 10.
 */
export function initialTrack(maxReps: number, ladder: Variation[], _bodyKg?: number): Track {
  const {
    BEGINNER_MAX_INCLUSIVE,
    P1_WEIGHTED_MIN_MAX,
    P1_C2B_MIN_MAX,
    P1_PCT_OF_MAX,
    P1_REP_RANGE,
    P2_PCT_OF_MAX,
    P3_DEFAULT_REPS,
    INITIAL_WEIGHT_KG,
  } = TRAIN_CONFIG;
  const has = (v: Variation) => ladder.includes(v);

  if (maxReps <= BEGINNER_MAX_INCLUSIVE) {
    return {
      p1: { variation: "negative", addedKg: 0, reps: BEGINNER_REPS.p1 },
      p2: { variation: has("band-heavy") ? "band-heavy" : "australian", addedKg: 0, reps: BEGINNER_REPS.p2 },
      p3: { variation: "australian", addedKg: 0, reps: P3_DEFAULT_REPS },
    };
  }

  let p1Variation: Variation = "strict";
  if (has("weighted") && maxReps >= P1_WEIGHTED_MIN_MAX) p1Variation = "weighted";
  else if (has("chest-to-bar") && maxReps >= P1_C2B_MIN_MAX) p1Variation = "chest-to-bar";
  const [p1Min, p1Max] = P1_REP_RANGE;
  const p1Reps = Math.min(p1Max, Math.max(p1Min, Math.round(maxReps * P1_PCT_OF_MAX)));

  return {
    p1: { variation: p1Variation, addedKg: p1Variation === "weighted" ? INITIAL_WEIGHT_KG : 0, reps: p1Reps },
    p2: { variation: "strict", addedKg: 0, reps: Math.max(1, Math.round(maxReps * P2_PCT_OF_MAX)) },
    p3: { variation: has("band-light") ? "band-light" : "australian", addedKg: 0, reps: P3_DEFAULT_REPS },
  };
}

/**
 * Beginner rep counts named in the initialTrack JSDoc (P1 negative × 3,
 * P2 band-heavy/australian × 5). P3 uses TRAIN_CONFIG.P3_DEFAULT_REPS.
 * Not in TRAIN_CONFIG yet; T06 may not edit config.ts.
 */
const BEGINNER_REPS = { p1: 3, p2: 5 } as const;

/** DESIGN.md §3 / T06: week-12 volume ≤ 0.5 × the week-10 session with the same inputs. */
const WEEK_12_MAX_FRACTION_OF_PEAK = 0.5;

type PullPhase = "p1" | "p2" | "p3";
type SetCounts = Record<PullPhase, number>;

function expandSets(track: Track, counts: SetCounts): PrescribedSet[] {
  const { REST_SEC, DEFAULT_RIR_FLOOR, P3_RIR_FLOOR } = TRAIN_CONFIG;
  const sets: PrescribedSet[] = [];
  for (const phase of ["p1", "p2", "p3"] as const) {
    const entry = track[phase];
    for (let i = 0; i < counts[phase]; i++) {
      sets.push({
        phase,
        variation: entry.variation,
        addedKg: entry.addedKg,
        targetReps: entry.reps,
        restSec: REST_SEC[phase],
        rirFloor: phase === "p3" ? P3_RIR_FLOOR : DEFAULT_RIR_FLOOR,
      });
    }
  }
  return sets;
}

/**
 * Set-count algorithm: start at the min-set floor, then round-robin
 * P2 → P1 → P3 while volumeScore stays ≤ cap and each phase is below its max.
 */
function chooseCounts(track: Track, weekIndex: number, cap: number, bodyKg: number): SetCounts {
  const { P1_SETS, P2_SETS, P3_SETS, WEEK_12_P3_SETS, BLOCK_WEEKS } = TRAIN_CONFIG;
  const isWeek12 = weekIndex === BLOCK_WEEKS;
  const counts: SetCounts = { p1: P1_SETS[0], p2: P2_SETS[0], p3: isWeek12 ? WEEK_12_P3_SETS : P3_SETS[0] };
  const max: SetCounts = { p1: P1_SETS[1], p2: P2_SETS[1], p3: isWeek12 ? WEEK_12_P3_SETS : P3_SETS[1] };
  let added = true;
  while (added) {
    added = false;
    for (const phase of ["p2", "p1", "p3"] as const) {
      if (counts[phase] >= max[phase]) continue;
      const trial = { ...counts, [phase]: counts[phase] + 1 };
      if (volumeScore(expandSets(track, trial), bodyKg) <= cap) {
        counts[phase] = trial[phase];
        added = true;
      }
    }
  }
  return counts;
}
/**
 * Build P1/P2/P3 sets from track (or initialTrack) plus set counts:
 *
 * target = START_VOLUME_X_MAX * maxReps * volumeMultiplier
 * 1. Start at min sets: P1 3, P2 3, P3 2. Week 12: P3 = WEEK_12_P3_SETS (0).
 * 2. Round-robin add one set to P2, then P1, then P3, only if the new
 *    volumeScore ≤ target * (1 + VOLUME_TOLERANCE) and the phase is below max.
 * 3. Stop when no set can be added. The min-set floor wins over the target.
 *
 * Rest from REST_SEC. rirFloor DEFAULT_RIR_FLOOR (P3 uses P3_RIR_FLOOR).
 * taper = weekIndex >= 11. Warmup from buildWarmup(first ordered set).
 *
 * Worked (max 10, full ladder, multiplier 1, body 80):
 *   P1 weighted 5 reps, P2 strict 6, P3 band-light 10
 *   rests 180 / 120 / 60
 *   counts P1 3, P2 4, P3 2, volumeScore 51.5
 *
 *   Min: 3×5×(1+2.5/80) + 3×6×1 + 2×10×0.6 = 15.46875+18+12 = 45.46875
 *   +1 P2: 51.46875 → 51.5 ≤ 55. Next P1 or P3 would exceed 55.
 */
export function prescribePullSession(input: PrescribePullInput): SessionPlan {
  const { START_VOLUME_X_MAX, VOLUME_TOLERANCE, BLOCK_WEEKS, TAPER_VOLUME, TAPER_WEEKS } = TRAIN_CONFIG;
  const { maxReps, ladder, weekIndex, volumeMultiplier, bodyKg } = input;
  const track = input.track ?? initialTrack(maxReps, ladder, bodyKg);
  const capFor = (multiplier: number) => START_VOLUME_X_MAX * maxReps * multiplier * (1 + VOLUME_TOLERANCE);

  const peakWeek = BLOCK_WEEKS - TAPER_WEEKS;
  let cap = capFor(volumeMultiplier);
  if (weekIndex === BLOCK_WEEKS) {
    // DESIGN §3: week 12 volume ≤ 0.5 × the week-10 session with the same inputs.
    // Week 12's multiplier is peak × TAPER_VOLUME[1], so recover the peak and cap
    // round-robin additions at half of that session's volume. The min-set floor still wins.
    const peakMultiplier = volumeMultiplier / TAPER_VOLUME[1];
    const peakSets = expandSets(track, chooseCounts(track, peakWeek, capFor(peakMultiplier), bodyKg));
    cap = Math.min(cap, volumeScore(peakSets, bodyKg) * WEEK_12_MAX_FRACTION_OF_PEAK);
  }

  const sets = orderSets(expandSets(track, chooseCounts(track, weekIndex, cap, bodyKg)));
  return {
    type: "pull",
    warmup: sets.length > 0 ? buildWarmup(sets[0]) : [],
    sets,
    volumeScore: volumeScore(sets, bodyKg),
    taper: weekIndex > peakWeek,
  };
}

/**
 * `rounds` (3, or 2 if taper) of each exercise, CROSS_REST_SEC rest, no pull-up
 * variations. Volume score 0. Empty warmup is allowed; still return 4 generic
 * steps if you have them, or a short general warmup — ticket T7 specifies
 * 3 rounds and every exercise is non-pull.
 */
export function prescribeCross(exercises: string[], taper: boolean): SessionPlan {
  const { CROSS_ROUNDS, CROSS_ROUNDS_TAPER, CROSS_REST_SEC, DEFAULT_RIR_FLOOR } = TRAIN_CONFIG;
  const rounds = taper ? CROSS_ROUNDS_TAPER : CROSS_ROUNDS;

  const sets: PrescribedSet[] = [];
  for (let r = 0; r < rounds; r++) {
    for (const exercise of exercises) {
      sets.push({
        phase: "p2",
        variation: exercise as ExerciseName,
        targetReps: 10,
        restSec: CROSS_REST_SEC,
        rirFloor: DEFAULT_RIR_FLOOR,
        addedKg: 0,
      });
    }
  }

  const warmup: WarmupStep[] = [
    { id: "general", label: "General", kind: "timer", seconds: TRAIN_CONFIG.WARMUP_GENERAL_SEC },
    { id: "mobility", label: "Mobility", kind: "reps", reps: TRAIN_CONFIG.WARMUP_MOBILITY_REPS },
    { id: "activation", label: "Activation", kind: "hang", seconds: TRAIN_CONFIG.WARMUP_HANG_SEC, sets: TRAIN_CONFIG.WARMUP_ACTIVATION_SETS },
    { id: "ramp", label: "Ramp", kind: "reps", rampReps: [1] },
  ];

  return {
    type: "cross",
    warmup,
    sets,
    volumeScore: 0,
    taper,
  };
}

/**
 * Warm-up + one strict set {targetReps:0, restSec: REST_SEC.test} meaning max.
 * If the ladder includes chest-to-bar or weighted, append one optional single
 * (targetReps 1) of the hardest of those. Tests only assert sets[0].
 */
export function prescribeMaxTest(ladder: Variation[]): SessionPlan {
  const { REST_SEC, DEFAULT_RIR_FLOOR } = TRAIN_CONFIG;

  const warmup = buildWarmup({
    phase: "p1",
    variation: "strict",
    targetReps: 5,
    restSec: REST_SEC.p1,
    addedKg: 0,
    rirFloor: DEFAULT_RIR_FLOOR,
  });

  const sets: PrescribedSet[] = [
    {
      phase: "test",
      variation: "strict",
      targetReps: 0,
      restSec: REST_SEC.test,
      addedKg: 0,
      rirFloor: 0,
    },
  ];

  const ladderSet = new Set(ladder);
  if (ladderSet.has("weighted") || ladderSet.has("chest-to-bar")) {
    const hardest: Variation = ladderSet.has("weighted") ? "weighted" : "chest-to-bar";
    sets.push({
      phase: "test",
      variation: hardest,
      targetReps: 1,
      restSec: REST_SEC.test,
      addedKg: 0,
      rirFloor: 0,
    });
  }

  return {
    type: "max_test",
    warmup,
    sets,
    volumeScore: 0,
    taper: false,
  };
}

/**
 * Cross catalog filtered by equipment: drop `ring-dip` when !hasRings.
 * Pull-up variations never appear here.
 */
export function filterCrossExercises(equipment: Equipment): string[] {
  const pullVariations = new Set(TRAIN_CONFIG.LADDER_ORDER);
  return TRAIN_CONFIG.CROSS_EXERCISES.filter((ex) => {
    if (pullVariations.has(ex as Variation)) return false;
    if (ex === "ring-dip" && !equipment.hasRings) return false;
    return true;
  });
}
