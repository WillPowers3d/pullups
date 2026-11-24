import type {
  Equipment,
  LoggedSet,
  PrescribedSet,
  Track,
  Variation,
} from "@/lib/train/engine/types";

export const FULL_EQUIPMENT: Equipment = {
  hasBar: true,
  bands: "both",
  hasWeight: true,
  hasRings: true,
};

export const NO_BANDS_NO_WEIGHT: Equipment = {
  hasBar: true,
  bands: "none",
  hasWeight: false,
  hasRings: false,
};

export const NO_BAR: Equipment = {
  hasBar: false,
  bands: "both",
  hasWeight: true,
  hasRings: true,
};

export const FULL_LADDER: Variation[] = [
  "negative",
  "band-heavy",
  "australian",
  "band-light",
  "strict",
  "chest-to-bar",
  "weighted",
];

export function set(partial: Partial<PrescribedSet> & Pick<PrescribedSet, "phase" | "variation" | "targetReps">): PrescribedSet {
  return {
    addedKg: 0,
    restSec: 60,
    rirFloor: 1,
    ...partial,
  };
}

export function log(
  prescribed: PrescribedSet,
  actual: Partial<Pick<LoggedSet, "actualReps" | "rir" | "quality" | "verifiedFullReps">>,
): LoggedSet {
  return {
    ...prescribed,
    actualReps: actual.actualReps ?? prescribed.targetReps,
    rir: actual.rir ?? prescribed.rirFloor,
    quality: actual.quality ?? 4,
    verifiedFullReps: actual.verifiedFullReps,
  };
}

export const SAMPLE_TRACK: Track = {
  p1: { variation: "weighted", addedKg: 2.5, reps: 5 },
  p2: { variation: "strict", addedKg: 0, reps: 6 },
  p3: { variation: "band-light", addedKg: 0, reps: 10 },
};
