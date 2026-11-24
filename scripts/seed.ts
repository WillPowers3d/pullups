/**
 * scripts/seed.ts — optional demo seed
 *
 * Inserts a default profile and an active training block for
 * `DEFAULT_USER_ID` so the app has something to show on first run.
 *
 * Run with: `npx tsx scripts/seed.ts`
 *
 * No passwords, no emails of real people, no API keys.
 */

import { TRAIN_CONFIG } from "@/lib/train/config";
import { upsertProfile, insertBlock, insertSessions } from "@/lib/train/repo";
import { formatUtcDate } from "@/lib/dates";
import { addDays } from "@/lib/dates";
import { blockDates, placeCrossDays } from "@/lib/train/engine/schedule";
import { generatePlan } from "@/lib/train/engine";

// ── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 0;
function idFactory(): string {
  return `seed-${++idCounter}`;
}

/** Find the next Sunday (day 0) on or after `today`. */
function nextSundayOrToday(ymd: string): string {
  const day = new Date(ymd + "T00:00:00Z").getUTCDay();
  if (day === 0) return ymd;
  return addDays(ymd, 7 - day);
}

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const today = formatUtcDate(new Date());
  const nowIso = new Date().toISOString();

  const equipment = {
    hasBar: true,
    bands: "both" as const,
    hasWeight: true,
    hasRings: false,
  };

  // 1. Insert / upsert the default profile
  const profile = upsertProfile({
    userId: TRAIN_CONFIG.DEFAULT_USER_ID,
    displayName: "Demo Athlete",
    equipment,
    bodyKg: 80,
    pullDays: [...TRAIN_CONFIG.DEFAULT_PULL_DAYS],
    crossDaysPerWeek: TRAIN_CONFIG.CROSS_DAYS_DEFAULT,
    nowIso,
  });

  console.log("Profile:", profile.user_id, profile.display_name);

  // 2. Pick a PR date 12 weeks out (Sunday if possible)
  const prDate = nextSundayOrToday(addDays(today, 84));

  // 3. Compute block dates
  const block = blockDates(today, prDate);

  // 4. Compute cross days and cross exercises
  const pullDays = profile.pull_days ? JSON.parse(profile.pull_days) : [...TRAIN_CONFIG.DEFAULT_PULL_DAYS];
  const crossDays = placeCrossDays(pullDays, Math.max(
    TRAIN_CONFIG.CROSS_DAYS_MIN,
    profile.cross_days_per_week,
  ));

  // 5. Generate the plan using generatePlan
  let plan: ReturnType<typeof generatePlan>;
  try {
    plan = generatePlan({
      today,
      prDate,
      maxReps: 5,
      equipment,
      pullDays,
      crossDaysPerWeek: profile.cross_days_per_week,
      bodyKg: 80,
      crossExercises: [],
    });
    console.log("Generated plan:", plan.weeks.length, "weeks,", plan.sessions.length, "sessions");
  } catch {
    // generatePlan is a stub in T08; fall back to manual construction.
    console.warn("generatePlan not yet implemented, using fallback");
    plan = {
      startDate: block.startDate,
      prDate,
      compressed: block.compressed,
      weeks: block.weeks,
      sessions: [
        {
          weekIndex: 1,
          date: block.startDate,
          type: "pull",
          slot: 0,
          plan: {
            type: "pull",
            warmup: [],
            sets: [],
            volumeScore: 0,
            taper: false,
          },
        },
        {
          weekIndex: 1,
          date: addDays(block.startDate, crossDays[0] ?? 2),
          type: "cross",
          slot: 0,
          plan: {
            type: "cross",
            warmup: [],
            sets: [],
            volumeScore: 0,
            taper: false,
          },
        },
      ],
    };
  }

  // 6. Insert the block
  const blockId = idFactory();
  const blockRow = insertBlock({
    id: blockId,
    userId: TRAIN_CONFIG.DEFAULT_USER_ID,
    plan,
    baselineMax: 0,
    currentMax: 0,
    configJson: JSON.stringify({ pullDays, crossDays }),
    nowIso,
  });

  // 7. Insert sessions
  insertSessions(blockRow, plan, idFactory);

  console.log("Block:", blockId, block.startDate, "→", prDate);
  console.log(`Seeded ${plan.sessions.length} session(s)`);
  console.log("Done. Visit http://localhost:3000/app to see the app.");
}

main();
