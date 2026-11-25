/**
 * Server-only helpers shared by the /api/train route handlers (T12).
 * JSON responses, body parsing, and row ↔ engine-type mapping. No training math.
 */
import type { z } from "zod";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { trainBadges } from "@/lib/train/badges";
import { availableLadder } from "@/lib/train/engine/ladder";
import { initialTrack } from "@/lib/train/engine/prescribe";
import type {
  Equipment,
  LoggedSet,
  Phase,
  SessionPlan,
  Track,
  Variation,
} from "@/lib/train/engine/types";
import {
  insertBadge,
  listBadges,
  listSets,
  trainStats,
  type BlockRow,
  type ProfileRow,
  type SessionRow,
  type SetRow,
} from "@/lib/train/repo";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return Response.json({ error: message, ...extra }, { status });
}

/** Parse a JSON body with a zod schema. Returns data or a 400 Response. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: z.infer<S> } | { response: Response }> {
  let raw: unknown;
  try {
    const text = await request.text();
    raw = text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return { response: jsonError("Body must be JSON") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: jsonError("Invalid request body", 400, { issues: parsed.error.issues }) };
  }
  return { data: parsed.data };
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export const USER_ID = TRAIN_CONFIG.DEFAULT_USER_ID;

export function equipmentOf(profile: ProfileRow): Equipment {
  return {
    hasBar: profile.has_bar === 1,
    bands: profile.bands,
    hasWeight: profile.has_weight === 1,
    hasRings: profile.has_rings === 1,
  };
}

export function profileDto(profile: ProfileRow) {
  return {
    displayName: profile.display_name,
    ...equipmentOf(profile),
    bodyKg: profile.body_kg,
    pullDays: JSON.parse(profile.pull_days) as number[],
    crossDaysPerWeek: profile.cross_days_per_week,
    updatedAt: profile.updated_at,
  };
}

export function ladderOf(profile: ProfileRow): Variation[] {
  return availableLadder(equipmentOf(profile));
}

export function bodyKgOf(profile: ProfileRow): number {
  return profile.body_kg ?? TRAIN_CONFIG.DEFAULT_BODY_KG;
}

export function planOf(session: SessionRow): SessionPlan {
  return JSON.parse(session.plan_json) as SessionPlan;
}

export function sessionDto(session: SessionRow) {
  return {
    id: session.id,
    blockId: session.block_id,
    weekIndex: session.week_index,
    date: session.date,
    type: session.type,
    slot: session.slot,
    status: session.status,
    plan: planOf(session),
    startedAt: session.started_at,
    completedAt: session.completed_at,
    restExtensions: session.rest_extensions,
    warmupSkipped: JSON.parse(session.warmup_skipped || "[]") as string[],
    decision: session.decision_json ? JSON.parse(session.decision_json) : null,
  };
}

export function setDto(row: SetRow) {
  return {
    id: row.id,
    idx: row.idx,
    phase: row.phase as Phase,
    variation: row.variation,
    addedKg: row.added_kg,
    targetReps: row.target_reps,
    restSec: row.rest_sec,
    actualReps: row.actual_reps,
    rir: row.rir,
    quality: row.quality,
    restTakenSec: row.rest_taken_sec,
    verifiedFullReps: row.verified_full_reps,
    loggedAt: row.logged_at,
  };
}

export function blockDto(block: BlockRow) {
  return {
    id: block.id,
    status: block.status,
    startDate: block.start_date,
    prDate: block.pr_date,
    baselineMax: block.baseline_max,
    currentMax: block.current_max,
    compressed: block.compressed === 1,
    createdAt: block.created_at,
  };
}

/** Logged sets of a session as engine `LoggedSet`s (unlogged rows skipped). */
export function loggedSetsOf(session: SessionRow): LoggedSet[] {
  const plan = planOf(session);
  return listSets(session.id)
    .filter((r) => r.actual_reps !== null)
    .map((r) => ({
      phase: r.phase as Phase,
      variation: r.variation as LoggedSet["variation"],
      addedKg: r.added_kg,
      targetReps: r.target_reps,
      restSec: r.rest_sec,
      rirFloor: plan.sets[r.idx]?.rirFloor ?? TRAIN_CONFIG.DEFAULT_RIR_FLOOR,
      actualReps: r.actual_reps ?? 0,
      rir: r.rir ?? 0,
      quality: r.quality ?? 0,
      verifiedFullReps: r.verified_full_reps,
    }));
}

/** Track a pull session was prescribed from (first set of each phase). */
export function trackOf(plan: SessionPlan, maxReps: number, ladder: Variation[]): Track {
  const track = initialTrack(maxReps, ladder);
  for (const phase of ["p1", "p2", "p3"] as const) {
    const s = plan.sets.find((x) => x.phase === phase);
    if (s && ladder.includes(s.variation as Variation)) {
      track[phase] = { variation: s.variation as Variation, addedKg: s.addedKg, reps: s.targetReps };
    }
  }
  return track;
}

/** Award any newly eligible badges. Returns ids earned by this call. */
export function awardBadges(block: BlockRow, earnedAt: string): string[] {
  const before = new Set(listBadges(block.user_id).map((b) => b.badge_id));
  const eligible = trainBadges(trainStats(block));
  const fresh = eligible.filter((id) => !before.has(id));
  for (const id of fresh) insertBadge(block.user_id, id, earnedAt);
  return fresh;
}
