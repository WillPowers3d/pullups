import { TRAIN_CONFIG } from "@/lib/train/config";
import { addDays, diffDays } from "@/lib/dates";
import { availableLadder } from "@/lib/train/engine/ladder";
import { prescribeCross, prescribeMaxTest, prescribePullSession } from "@/lib/train/engine/prescribe";
import { blockDates, isWeeklyPullSlot, placeCrossDays } from "@/lib/train/engine/schedule";
import type { GeneratePlanInput, Plan, PlannedSession } from "@/lib/train/engine/types";

/**
 * Volume multiplier for a week index.
 *
 * Uncompressed (keptWeeks omitted or 1..12):
 *   week 1 → 1.0
 *   weeks 2–10 → (1 + BUILD_WEEKLY_INCREASE)^(weekIndex - 1)
 *   week 11 → week10 * TAPER_VOLUME[0]
 *   week 12 → week10 * TAPER_VOLUME[1]
 *
 * Compressed: remaining build weeks (≤10) are renormalized so the first
 * remaining build week is 1.0, then +BUILD_WEEKLY_INCREASE per remaining
 * build week. Taper still applies to that peak. This avoids dumping a
 * late joiner into week-6 volume on day one.
 *
 * Week-over-week rise for build weeks is BUILD_WEEKLY_INCREASE (7.5%),
 * which must stay ≤ WEEKLY_INCREASE_CAP (10%).
 */
export function weekMultiplier(weekIndex: number, keptWeeks?: readonly number[]): number {
  const { BLOCK_WEEKS, TAPER_WEEKS, BUILD_WEEKLY_INCREASE, TAPER_VOLUME } = TRAIN_CONFIG;
  const lastBuildWeek = BLOCK_WEEKS - TAPER_WEEKS;
  const growth = 1 + BUILD_WEEKLY_INCREASE;
  const build = (keptWeeks ?? Array.from({ length: lastBuildWeek }, (_, i) => i + 1))
    .filter((w) => w <= lastBuildWeek)
    .sort((a, b) => a - b);

  if (weekIndex <= lastBuildWeek) {
    const i = build.indexOf(weekIndex);
    return growth ** (i >= 0 ? i : weekIndex - 1);
  }
  const peak = build.length > 0 ? growth ** (build.length - 1) : 1;
  const taperIdx = Math.min(TAPER_VOLUME.length - 1, Math.max(0, weekIndex - lastBuildWeek - 1));
  return peak * TAPER_VOLUME[taperIdx];
}

/** Offset of a weekday (0=Sun … 6=Sat) from that week's Monday. */
function mondayOffset(weekday: number): number {
  return weekday === 0 ? 6 : weekday - 1;
}

function byDate(a: PlannedSession, b: PlannedSession): number {
  return a.date.localeCompare(b.date);
}

/**
 * Build the 12-week (or compressed) calendar.
 *
 * - Use blockDates(today, prDate) for startDate / weeks / compressed.
 * - Each kept week has exactly 2 weekly-pull slots on pullDays (earlier
 *   weekday = slot 0). Week 6 slot 1 is type max_test.
 * - Cross days from placeCrossDays(pullDays, max(CROSS_DAYS_MIN, crossDaysPerWeek));
 *   none share a date with a pull slot. Taper weeks keep those requested
 *   cross days (prescribeCross(..., taper=true) — low intensity, not rest).
 * - If maxLinearConsecutiveRest on [startDate, prDate] would exceed
 *   MAX_CONSECUTIVE_REST_DAYS, insert extra cross days to break the run
 *   (prefer not-day-before-pull, then the 4th rest day of the run).
 * - pr_attempt is an extra session on prDate (not one of the two weekly slots).
 * - Last weekly-pull date must be ≥ LAST_PULL_BEFORE_PR_DAYS before prDate;
 *   shift that slot if not. Do not drop a weekly-pull if that would create
 *   a 4-day rest run; move or add a cross day instead.
 * - William's rule (not a weekly cap): maxLinearConsecutiveRest over
 *   [startDate, prDate] is ≤ MAX_CONSECUTIVE_REST_DAYS, including taper.
 * - Pull prescriptions use weekMultiplier(weekIndex, weeks).
 * - Same input → deep-equal output. No Date.now, no Math.random.
 */
export function generatePlan(input: GeneratePlanInput): Plan {
  const {
    BLOCK_WEEKS,
    TAPER_WEEKS,
    CROSS_DAYS_MIN,
    LAST_PULL_BEFORE_PR_DAYS,
    MIN_DAYS_BETWEEN_PULL_DAYS,
    MAX_CONSECUTIVE_REST_DAYS,
    MAX_TEST_WEEKS,
  } = TRAIN_CONFIG;
  const dates = blockDates(input.today, input.prDate);
  const ladder = availableLadder(input.equipment);
  if (ladder.length === 0) throw new Error("No bar");

  const prDate = input.prDate;
  const midTestWeek = MAX_TEST_WEEKS[1];
  const isTaper = (w: number) => w > BLOCK_WEEKS - TAPER_WEEKS;
  const pullOffsets = [...input.pullDays].map(mondayOffset).sort((a, b) => a - b);
  const crossOffsets = placeCrossDays(input.pullDays, Math.max(CROSS_DAYS_MIN, input.crossDaysPerWeek)).map(mondayOffset);
  const weekOfDate = new Map<string, number>();
  const sessions: PlannedSession[] = [];

  const crossSession = (weekIndex: number, date: string): PlannedSession => ({
    weekIndex,
    date,
    type: "cross",
    slot: 0,
    plan: prescribeCross(input.crossExercises, isTaper(weekIndex)),
  });

  dates.weeks.forEach((weekIndex, calendarIndex) => {
    const monday = addDays(dates.startDate, 7 * calendarIndex);
    for (let i = 0; i < 7; i++) weekOfDate.set(addDays(monday, i), weekIndex);

    pullOffsets.forEach((offset, slotIdx) => {
      const slot = slotIdx === 0 ? 0 : 1;
      const date = addDays(monday, offset);
      if (weekIndex === midTestWeek && slot === 1) {
        sessions.push({ weekIndex, date, type: "max_test", slot, plan: prescribeMaxTest(ladder) });
      } else {
        sessions.push({
          weekIndex,
          date,
          type: "pull",
          slot,
          plan: prescribePullSession({
            maxReps: input.maxReps,
            ladder,
            weekIndex,
            volumeMultiplier: weekMultiplier(weekIndex, dates.weeks),
            bodyKg: input.bodyKg,
          }),
        });
      }
    });
    for (const offset of crossOffsets) sessions.push(crossSession(weekIndex, addDays(monday, offset)));
  });

  // Step 9: the last weekly pulls must be ≥ LAST_PULL_BEFORE_PR_DAYS before prDate.
  // Shift offending slots earlier inside their own week; never onto another pull.
  const pulls = sessions.filter(isWeeklyPullSlot).sort(byDate);
  for (let i = 0; i < pulls.length; i++) {
    const pull = pulls[i]!;
    if (diffDays(pull.date, prDate) >= LAST_PULL_BEFORE_PR_DAYS) continue;
    const prev = pulls[i - 1];
    const monday = addDays(dates.startDate, 7 * dates.weeks.indexOf(pull.weekIndex));
    let moved = false;
    for (let d = addDays(prDate, -LAST_PULL_BEFORE_PR_DAYS); d >= monday; d = addDays(d, -1)) {
      if (prev && diffDays(prev.date, d) < MIN_DAYS_BETWEEN_PULL_DAYS) continue;
      if (pulls.some((p) => p !== pull && p.date === d)) continue;
      pull.date = d;
      moved = true;
      break;
    }
    if (!moved) {
      // No legal day left in this week (e.g. PR early in week 12): drop the slot.
      sessions.splice(sessions.indexOf(pull), 1);
      pulls.splice(i, 1);
      i -= 1;
    }
  }

  // Nothing after PR day, nothing else on PR day, one session per date (pulls win).
  const pullDates = new Set(sessions.filter(isWeeklyPullSlot).map((s) => s.date));
  const kept: PlannedSession[] = [];
  const usedDates = new Set<string>();
  for (const s of [...sessions].sort(byDate)) {
    if (s.date >= prDate) continue;
    if (!isWeeklyPullSlot(s) && pullDates.has(s.date)) continue;
    if (usedDates.has(s.date)) continue;
    usedDates.add(s.date);
    kept.push(s);
  }
  const prWeek = weekOfDate.get(prDate) ?? dates.weeks[dates.weeks.length - 1]!;
  kept.push({ weekIndex: prWeek, date: prDate, type: "pr_attempt", slot: 0, plan: prescribeMaxTest(ladder) });
  usedDates.add(prDate);

  // Step 10: break any rest run longer than MAX_CONSECUTIVE_REST_DAYS with extra cross days.
  let run: string[] = [];
  for (let d = dates.startDate; d <= prDate; d = addDays(d, 1)) {
    if (usedDates.has(d)) {
      run = [];
      continue;
    }
    run.push(d);
    if (run.length > MAX_CONSECUTIVE_REST_DAYS) {
      const pick =
        run.find((day) => !pullDates.has(addDays(day, 1))) ?? run[MAX_CONSECUTIVE_REST_DAYS]!;
      const weekIndex = weekOfDate.get(pick) ?? prWeek;
      kept.push(crossSession(weekIndex, pick));
      usedDates.add(pick);
      run = run.slice(run.indexOf(pick) + 1);
    }
  }

  return {
    startDate: dates.startDate,
    prDate,
    compressed: dates.compressed,
    weeks: dates.weeks,
    sessions: kept.sort(byDate),
  };
}
