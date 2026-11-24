import { TRAIN_CONFIG } from "@/lib/train/config";
import {
  addDays,
  diffDays,
  nextMondayAfter,
  startOfWeekMonday,
} from "@/lib/dates";
import type {
  BlockDates,
  Plan,
  PlannedSession,
  PullDaysResult,
} from "@/lib/train/engine/types";

// ── Helpers ─────────────────────────────────────────────────────────--------

/**
 * Circular distance between two weekdays (0=Sun … 6=Sat).
 * min((a-b+7)%7, (b-a+7)%7).
 */
function circularDistance(a: number, b: number): number {
  return Math.min((b - a + 7) % 7, (a - b + 7) % 7);
}

/**
 * Generate all C(arr, n) combinations as sorted arrays.
 * Yields in lexicographic order when arr is sorted ascending.
 */
function* combinations(arr: number[], n: number): Generator<number[]> {
  if (n === 0) { yield []; return; }
  if (n > arr.length) return;

  for (let i = 0; i <= arr.length - n; i++) {
    for (const combo of combinations(arr.slice(i + 1), n - 1)) {
      yield [arr[i], ...combo];
    }
  }
}

/** Minimum circular gap between consecutive chosen days. */
function minCircularGap(days: number[]): number {
  if (days.length <= 1) return 7;
  const s = [...days].sort((a, b) => a - b);
  let min = 7;
  for (let i = 1; i < s.length; i++) {
    min = Math.min(min, s[i] - s[i - 1]);
  }
  min = Math.min(min, 7 + s[0] - s[s.length - 1]);
  return min;
}

/** Lexicographic comparison of two sorted number arrays. */
function arraysLexSmaller(a: number[], b: number[]): boolean {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return a.length < b.length;
}

/** All 7 weekdays. */
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// ── T03 exports ─────────────────────────────────────────────────────────────

/**
 * Exactly two distinct weekdays (0=Sun … 6=Sat). Both circular distances
 * must be ≥ TRAIN_CONFIG.MIN_DAYS_BETWEEN_PULL_DAYS (3). Error text must
 * match /72/.
 *
 * Worked: [1,4], [2,5], [0,3] ok. [1,2], [1], [1,1], [6,1] fail.
 */
export function validatePullDays(days: number[]): PullDaysResult {
  if (days.length !== 2) {
    return { ok: false, error: "Exactly 2 pull days required (72-hour rule)" };
  }

  const [a, b] = days;

  if (a < 0 || a > 6 || b < 0 || b > 6) {
    return { ok: false, error: "Pull days must be 0-6 (72-hour rule)" };
  }

  if (a === b) {
    return { ok: false, error: "Pull days must be distinct (72-hour rule)" };
  }

  const dist = circularDistance(a, b);
  if (dist < TRAIN_CONFIG.MIN_DAYS_BETWEEN_PULL_DAYS) {
    return {
      ok: false,
      error: `Pull days must be ≥ ${TRAIN_CONFIG.MIN_DAYS_BETWEEN_PULL_DAYS} days apart (72-hour rule)`,
    };
  }

  return { ok: true };
}

/**
 * Rest days in a 7-day week given training weekdays (0=Sun … 6=Sat).
 * `7 - unique(trainingWeekdays).length`.
 */
export function restDaysPerWeek(trainingWeekdays: number[]): number {
  return 7 - new Set(trainingWeekdays).size;
}

/**
 * Longest circular run of rest days in a repeating Mon–Sun week.
 * Worked: training [1,2,4,5] (Mon, Tue, Thu, Fri) → rest Wed/Sat/Sun,
 * wrapping Sat–Sun = 2.
 */
export function maxCircularConsecutiveRest(trainingWeekdays: number[]): number {
  const trainingSet = new Set(trainingWeekdays);
  let maxRun = 0;

  for (let start = 0; start < 7; start++) {
    if (!trainingSet.has(start)) {
      let run = 0;
      for (let i = 0; i < 7; i++) {
        const day = (start + i) % 7;
        if (!trainingSet.has(day)) {
          run++;
        } else {
          break;
        }
      }
      maxRun = Math.max(maxRun, run);
    }
  }

  return maxRun;
}

/**
 * Longest run of rest days on the inclusive UTC date range `[from, to]`.
 * A day is training if it appears in `trainingDates`, otherwise rest.
 * Used to enforce William's maxConsecutiveRestDays across week boundaries.
 */
export function maxLinearConsecutiveRest(
  trainingDates: readonly string[],
  from: string,
  to: string,
): number {
  const trainingSet = new Set(trainingDates);
  const totalDays = diffDays(from, to) + 1; // inclusive
  let maxRun = 0;
  let currentRun = 0;

  for (let i = 0; i < totalDays; i++) {
    const day = addDays(from, i);
    if (!trainingSet.has(day)) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return maxRun;
}

/**
 * Pick `n` non-pull weekdays. Clamp `n` into
 * [CROSS_DAYS_MIN, CROSS_DAYS_MAX] (1–3). A week may have 4 rest days.
 *
 * Candidates = non-pull days that are NOT the day before a pull day.
 * If there are fewer than n candidates, add the excluded non-pull days
 * (the day-before-pull days) until n are available.
 *
 * Among n-combinations of the pool, choose the one with the largest minimum
 * circular gap between chosen days. Ties → lexicographically smallest
 * sorted array.
 *
 * Then, while maxCircularConsecutiveRest(pull ∪ chosen) >
 * MAX_CONSECUTIVE_REST_DAYS and unused non-pull days remain, add the
 * fewest extra cross days to break the longest rest run (prefer
 * not-day-before-pull, then lex-smallest weekday). Legal 3+4 pull pairs
 * already have circular rest ≤ 3, so n=1 does not get extras.
 *
 * Return sorted ascending.
 *
 * Worked: placeCrossDays([1,4], 2) → [2,5]
 *   Preferred candidates are Tue/Fri/Sat (2,5,6). Sun and Wed are
 *   day-before-pull. [2,5] and [2,6] both have min gap 3; lex smaller is [2,5].
 *   Layout: Mon pull, Tue cross, Wed rest, Thu pull, Fri cross, Sat rest, Sun rest.
 *   Circular consecutive rest (Sat–Sun) = 2.
 *
 * Worked: placeCrossDays([1,4], 1) → [2]
 *   Singletons in the preferred pool all tie on wrap-gap; lex-smallest is Tue.
 *   Training Mon/Tue/Thu. Rest Wed + Fri–Sun. Longest rest run = 3 (legal).
 *   Four rest days in the week is allowed — there is no weekly rest cap.
 */
export function placeCrossDays(pullDays: number[], n: number): number[] {
  // Step 1: Clamp n to [CROSS_DAYS_MIN, CROSS_DAYS_MAX]
  n = Math.max(
    TRAIN_CONFIG.CROSS_DAYS_MIN,
    Math.min(TRAIN_CONFIG.CROSS_DAYS_MAX, n),
  );

  const pullSet = new Set(pullDays);

  // Step 2: Non-pull weekdays
  const nonPull = ALL_DAYS.filter((d) => !pullSet.has(d));

  // Step 3: Preferred = non-pull days whose next day is NOT a pull day
  const preferred = nonPull.filter(
    (d) => !pullSet.has((d + 1) % 7),
  );

  // Step 4: Pool = preferred, append remaining non-pull if needed
  let pool = [...preferred];
  if (pool.length < n) {
    const dayBeforePull = nonPull.filter(
      (d) => pullSet.has((d + 1) % 7),
    );
    pool = [...preferred, ...dayBeforePull];
  }

  // Step 5: Among n-combinations, maximize min circular gap; tie → lex smallest
  let bestCombo: number[] | null = null;
  let bestGap = -1;

  for (const combo of combinations(pool, n)) {
    const gap = minCircularGap(combo);
    if (
      gap > bestGap ||
      (gap === bestGap &&
        bestCombo !== null &&
        arraysLexSmaller(combo, bestCombo))
    ) {
      bestGap = gap;
      bestCombo = combo;
    }
  }

  let chosen: number[] = bestCombo ?? [];

  // Step 6: Break rest runs exceeding MAX_CONSECUTIVE_REST_DAYS
  let allTraining = [...pullDays, ...chosen];

  while (
    maxCircularConsecutiveRest(allTraining) > TRAIN_CONFIG.MAX_CONSECUTIVE_REST_DAYS
  ) {
    // Find the longest circular rest run as an ordered list of weekdays
    const restSet = new Set(ALL_DAYS.filter((d) => !allTraining.includes(d)));
    const longestRun = findLongestRestRun(restSet);

    if (longestRun.length === 0) break;

    // Pick a break day: prefer not-day-before-pull, then lex-smallest
    const breakDay = longestRun.find(
      (d) => !pullSet.has((d + 1) % 7),
    ) ?? longestRun[0];

    if (breakDay === undefined || allTraining.includes(breakDay)) break;

    chosen = [...chosen, breakDay];
    allTraining = [...pullDays, ...chosen];
  }

  return [...chosen].sort((a, b) => a - b);
}

/**
 * Find the longest consecutive run of rest days in the circular week,
 * returned as an array of weekday numbers starting from the run head.
 */
function findLongestRestRun(restSet: Set<number>): number[] {
  let best: number[] = [];

  for (let start = 0; start < 7; start++) {
    if (!restSet.has(start)) continue;
    const run: number[] = [];
    for (let i = 0; i < 7; i++) {
      const day = (start + i) % 7;
      if (restSet.has(day)) {
        run.push(day);
      } else {
        break;
      }
    }
    if (run.length > best.length) {
      best = run;
    }
  }

  return best;
}

// ── T04 exports ─────────────────────────────────────────────────────────────

/**
 * Determine the block start date and which training-week indices survive.
 *
 * Uncompressed: `startDate = Monday(prDate) − 77 days`. If that Monday is
 * after `today`, the full 12-week block fits.
 *
 * Compressed: `startDate = nextMondayAfter(today)`. Pick the `n` highest-
 * priority weeks from `[12,11,6,10,9,8,7,5,4,3,2,1]` where
 * `n = diffDays(startDate, Monday(prDate)) / 7 + 1`.
 *
 * Throws when `prDate` is in the past.
 */
export function blockDates(today: string, prDate: string): BlockDates {
  if (prDate < today) {
    throw new Error("PR date must be after today");
  }

  const prMonday = startOfWeekMonday(prDate);
  const uncompressedStart = addDays(prMonday, -77);

  if (uncompressedStart > today) {
    return {
      startDate: uncompressedStart,
      compressed: false,
      weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    };
  }

  const startDate = nextMondayAfter(today);
  const lastMonday = prMonday;
  const n = diffDays(startDate, lastMonday) / 7 + 1;

  const priority = [
    12, 11, 6, 10, 9, 8, 7, 5, 4, 3, 2, 1,
  ];
  const weeks = priority.slice(0, n).sort((a, b) => a - b);

  return {
    startDate,
    compressed: true,
    weeks,
  };
}

/**
 * Dates in the same Mon–Sun week as `session.date` where moving `session`
 * would still satisfy all constraints.
 *
 * Rules:
 * - `pr_attempt` sessions cannot be moved.
 * - No two sessions share a date after the move.
 * - Weekly-pull slots maintain ≥ 3 calendar days between consecutive pulls
 *   across the whole plan.
 * - The last weekly pull stays ≥ 3 days before `prDate`.
 * - No cross session lands on a pull session date.
 * - William's consecutive-rest cap still holds
 *   (`maxLinearConsecutiveRest` on `[startDate, prDate]` ≤ `MAX_CONSECUTIVE_REST_DAYS`).
 */
export function legalMoveDays(session: PlannedSession, plan: Plan): string[] {
  if (session.type === "pr_attempt") {
    return [];
  }

  const weekStart = startOfWeekMonday(session.date);
  const weekEnd = addDays(weekStart, 6);

  const candidates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (d !== session.date) {
      candidates.push(d);
    }
  }

  const legal: string[] = [];
  for (const candidate of candidates) {
    if (candidate < weekStart || candidate > weekEnd) continue;
    if (isLegalMove(session, candidate, plan)) {
      legal.push(candidate);
    }
  }

  return legal;
}

/** Check whether moving `session` to `candidateDate` is legal. */
function isLegalMove(
  session: PlannedSession,
  candidateDate: string,
  plan: Plan,
): boolean {
  // 1. No date collision with another session
  const collision = plan.sessions.find(
    (s) => s.date === candidateDate && s !== session,
  );
  if (collision) return false;

  // 2. Simulate the move
  const simulated = plan.sessions.map((s) =>
    s === session ? { ...s, date: candidateDate } : s,
  );

  // 3. Weekly-pull gap ≥ 3 days across the whole plan
  const pullSessions = simulated.filter(isWeeklyPullSlot);
  const pullDates = pullSessions.map((s) => s.date).sort();
  for (let i = 1; i < pullDates.length; i++) {
    if (
      diffDays(pullDates[i - 1], pullDates[i]) <
      TRAIN_CONFIG.MIN_DAYS_BETWEEN_PULL_DAYS
    ) {
      return false;
    }
  }

  // 4. Last weekly pull ≥ 3 days before prDate
  if (pullDates.length > 0) {
    const lastPull = pullDates[pullDates.length - 1];
    if (
      diffDays(lastPull, plan.prDate) <
      TRAIN_CONFIG.LAST_PULL_BEFORE_PR_DAYS
    ) {
      return false;
    }
  }

  // 5. Cross session does not land on a pull date (covered by collision
  //    check above, but stated explicitly for clarity)

  // 6. William's consecutive-rest cap
  const trainingDates = simulated.map((s) => s.date);
  const maxRest = maxLinearConsecutiveRest(
    trainingDates,
    plan.startDate,
    plan.prDate,
  );
  if (maxRest > TRAIN_CONFIG.MAX_CONSECUTIVE_REST_DAYS) {
    return false;
  }

  return true;
}

/** Weekly pull slots: type pull, or the week-6 max_test. Not pr_attempt. */
export function isWeeklyPullSlot(session: {
  type: PlannedSession["type"];
  weekIndex: number;
}): boolean {
  return (
    session.type === "pull" ||
    (session.type === "max_test" && session.weekIndex === 6)
  );
}
