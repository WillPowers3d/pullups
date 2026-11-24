/**
 * Every training number lives here. The book's exact figures are unknown
 * (see docs/RESEARCH.md); these are cited defaults. Swap values here — never
 * hard-code them in the engine or UI.
 */

export const TRAIN_CONFIG = {
  PULL_DAYS_PER_WEEK: 2,
  /**
   * Minimum circular weekday distance between the two pull days.
   * 3 calendar days ≡ the "72 h / two full rest days" rule. The engine
   * compares YYYY-MM-DD dates, not wall-clock hours.
   */
  MIN_DAYS_BETWEEN_PULL_DAYS: 3,
  MIN_HOURS_BETWEEN_PULL_DAYS: 72,
  CROSS_DAYS_DEFAULT: 2,
  /** Floor is 1. Extra cross days are added only to break a 4+ rest run. */
  CROSS_DAYS_MIN: 1,
  CROSS_DAYS_MAX: 3,
  /**
   * William's rule (not a book number): longest allowed run of consecutive
   * rest days, including across week boundaries and through the taper.
   * There is no weekly rest-day cap.
   */
  MAX_CONSECUTIVE_REST_DAYS: 3,
  maxConsecutiveRestDays: 3,
  BLOCK_WEEKS: 12,
  TAPER_WEEKS: 2,
  /** Weeks 11 and 12 as a fraction of the week-10 (peak) multiplier. */
  TAPER_VOLUME: [0.7, 0.45] as const,
  BUILD_WEEKLY_INCREASE: 0.075,
  WEEKLY_INCREASE_CAP: 0.1,
  START_VOLUME_X_MAX: 5,
  VOLUME_TOLERANCE: 0.1,
  INITIAL_WEIGHT_KG: 2.5,
  WEIGHT_STEP_KG: 2.5,
  /** Week 0 = onboarding baseline (not produced by generatePlan). Week 12 = PR day. */
  MAX_TEST_WEEKS: [0, 6, 12] as const,
  MDC_REPS: 2,
  REST_SEC: {
    warmup: 60,
    p1: 180,
    p2: 120,
    p3: 60,
    test: 300,
  } as const,
  REST_EXTENSION_SEC: 30,
  REST_EXTENSIONS_MAX: 2,
  P1_SETS: [3, 5] as const,
  P1_REP_RANGE: [2, 5] as const,
  /** Initial P1 reps = clamp(round(maxReps * P1_PCT_OF_MAX), P1_REP_RANGE). */
  P1_PCT_OF_MAX: 0.5,
  P1_WEIGHTED_MIN_MAX: 8,
  P1_C2B_MIN_MAX: 5,
  P2_SETS: [3, 5] as const,
  P2_PCT_OF_MAX: 0.6,
  /** 2-for-2 progression cap for P2 reps before stepUp. */
  P2_PCT_CAP: 0.7,
  P3_SETS: [2, 3] as const,
  P3_REP_RANGE: [8, 15] as const,
  P3_DEFAULT_REPS: 10,
  P3_RIR_FLOOR: 1,
  DEFAULT_RIR_FLOOR: 1,
  /** maxReps <= this uses the beginner path (no strict / C2B / weighted). */
  BEGINNER_MAX_INCLUSIVE: 2,
  WEEK_12_P3_SETS: 0,
  LAST_PULL_BEFORE_PR_DAYS: 3,
  LAST_PULL_BEFORE_PR_HOURS: 72,
  DEFAULT_BODY_KG: 80,
  WEEKLY_PULL_SETS_TARGET: [10, 20] as const,
  TRAIN_SESSION_XP: 5,
  DEFAULT_USER_ID: "local",
  DEFAULT_PULL_DAYS: [1, 4] as const,
  WARMUP_GENERAL_SEC: 180,
  WARMUP_MOBILITY_REPS: 10,
  WARMUP_ACTIVATION_SETS: 2,
  WARMUP_ACTIVATION_REPS: 5,
  WARMUP_HANG_SEC: 20,
  WARMUP_RAMP_PCTS: [0.3, 0.5] as const,
  CROSS_REST_SEC: 60,
  CROSS_ROUNDS: 3,
  CROSS_ROUNDS_TAPER: 2,
  CROSS_EXERCISES: [
    "push-up",
    "ring-dip",
    "plank",
    "face-pull",
    "hollow-body",
    "air-squat",
    "reverse-lunge",
    "wall-sit",
  ] as const,
  FULL_FORCE_CUES: [
    "Pull explosively",
    "Chin over bar",
    "2 s down",
    "Full hang",
    "Stop if reps turn to half reps",
    "Intent is speed — even if the bar is slow",
  ] as const,
  VARIATION_FACTORS: {
    negative: 0.5,
    "band-heavy": 0.4,
    "band-light": 0.6,
    australian: 0.5,
    strict: 1.0,
    "chest-to-bar": 1.15,
  } as const,
  /**
   * Total order, easiest → hardest. Ranks in DIFFICULTY_RANK may tie;
   * this array breaks ties for stepUp / stepDown / availableLadder.
   */
  LADDER_ORDER: [
    "negative",
    "band-heavy",
    "australian",
    "band-light",
    "strict",
    "chest-to-bar",
    "weighted",
  ] as const,
  DIFFICULTY_RANK: {
    negative: 1,
    "band-heavy": 1,
    australian: 2,
    "band-light": 2,
    strict: 3,
    "chest-to-bar": 4,
    weighted: 5,
  } as const,
  BADGE_IDS: [
    "block_started",
    "warmup_perfect",
    "on_the_clock",
    "mid_test_up",
    "new_pr",
    "block_complete",
  ] as const,
} as const;

export type TrainConfig = typeof TRAIN_CONFIG;
export type BadgeId = (typeof TRAIN_CONFIG.BADGE_IDS)[number];
export type CrossExercise = (typeof TRAIN_CONFIG.CROSS_EXERCISES)[number];
