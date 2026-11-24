import type { CrossExercise, TrainConfig } from "@/lib/train/config";

export type Variation = TrainConfig["LADDER_ORDER"][number];
export type ExerciseName = Variation | CrossExercise;
export type Phase = "warmup" | "p1" | "p2" | "p3" | "test";
export type SessionType = "pull" | "cross" | "max_test" | "pr_attempt";
export type Bands = "none" | "light" | "heavy" | "both";
export type SessionStatus =
  | "planned"
  | "in_progress"
  | "done"
  | "missed"
  | "skipped";
export type BlockStatus = "active" | "completed" | "abandoned";

export type Equipment = {
  hasBar: boolean;
  bands: Bands;
  hasWeight: boolean;
  /** Rings do not add pull-up rungs. They only unlock `ring-dip` on cross days. */
  hasRings: boolean;
};

export type PrescribedSet = {
  phase: Phase;
  /** Pull variation, or a cross-day exercise id. */
  variation: ExerciseName;
  addedKg: number;
  targetReps: number;
  restSec: number;
  rirFloor: number;
};

export type WarmupStep = {
  id: string;
  label: string;
  kind: "timer" | "reps" | "hang";
  seconds?: number;
  reps?: number;
  sets?: number;
  /** Present on the `ramp` step: e.g. [2, 3] for a 6-rep first set. */
  rampReps?: number[];
};

export type SessionPlan = {
  type: SessionType;
  warmup: WarmupStep[];
  sets: PrescribedSet[];
  volumeScore: number;
  taper: boolean;
};

export type PlannedSession = {
  weekIndex: number;
  date: string;
  type: SessionType;
  slot: 0 | 1;
  plan: SessionPlan;
};

export type Plan = {
  startDate: string;
  prDate: string;
  compressed: boolean;
  /** Week indices that exist in this block, chronological (e.g. [1..12] or [6,8,9,10,11,12]). */
  weeks: number[];
  sessions: PlannedSession[];
};

export type LoggedSet = PrescribedSet & {
  actualReps: number;
  rir: number;
  quality: number;
  verifiedFullReps?: number | null;
};

export type TrackEntry = {
  variation: Variation;
  addedKg: number;
  reps: number;
};

/**
 * Per-slot progression state. Set *counts* always come from the week's
 * volume algorithm — never from the 2-for-2 rule. P3 only progresses reps.
 */
export type Track = {
  p1: TrackEntry;
  p2: TrackEntry;
  p3: TrackEntry;
};

export type ProgressAction = "progress" | "hold" | "regress";

export type ProgressDecision = {
  action: ProgressAction;
  reason: string;
  track: Track;
};

export type StepResult = {
  variation: Variation;
  addedKg: number;
  capped?: boolean;
};

export type PullDaysResult =
  | { ok: true }
  | { ok: false; error: string };

export type BlockDates = {
  startDate: string;
  compressed: boolean;
  weeks: number[];
};

export type GeneratePlanInput = {
  today: string;
  prDate: string;
  maxReps: number;
  equipment: Equipment;
  pullDays: number[];
  crossDaysPerWeek: number;
  bodyKg: number;
  /** Already filtered by equipment (see filterCrossExercises). */
  crossExercises: string[];
};

export type PrescribePullInput = {
  maxReps: number;
  ladder: Variation[];
  weekIndex: number;
  volumeMultiplier: number;
  bodyKg: number;
  track?: Track;
};

export type RetargetResult = {
  changed: boolean;
  max: number;
};

export type MachineStage = "idle" | "warmup" | "set" | "rest" | "summary";

export type MachineState = {
  stage: MachineStage;
  warmupIdx: number;
  setIdx: number;
  restEndsAt: number | null;
  extensionsUsed: number;
  logs: LoggedSet[];
  skipped: string[];
  nowMs: number;
  warmup: WarmupStep[];
  sets: PrescribedSet[];
};

export type MachineEvent =
  | { type: "START"; nowMs: number }
  | { type: "WARMUP_DONE"; stepId: string }
  | { type: "WARMUP_SKIP"; stepId: string }
  | { type: "SET_DONE"; log: LoggedSet; nowMs: number }
  | { type: "REST_EXTEND" }
  | { type: "REST_TICK"; nowMs: number }
  | { type: "REST_END"; nowMs: number }
  | { type: "FINISH" };

export type TrainStats = {
  sessionsCompleted: number;
  pullSessionsCompleted: number;
  warmupPerfectCount: number;
  restOverrunCount: number;
  zeroOverrunCount: number;
  week6Delta: number | null;
  prDelta: number | null;
  blockComplete: boolean;
  blockStarted: boolean;
};

export const PHASE_ORDER: Phase[] = ["warmup", "p1", "p2", "p3", "test"];

export const INITIAL_MACHINE_STATE: MachineState = {
  stage: "idle",
  warmupIdx: 0,
  setIdx: 0,
  restEndsAt: null,
  extensionsUsed: 0,
  logs: [],
  skipped: [],
  nowMs: 0,
  warmup: [],
  sets: [],
};
