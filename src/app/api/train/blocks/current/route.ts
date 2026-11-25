import {
  blockDto,
  bodyKgOf,
  equipmentOf,
  json,
  jsonError,
  newId,
  parseBody,
  sessionDto,
  todayUtc,
  USER_ID,
} from "@/lib/api";
import { generatePlan } from "@/lib/train/engine/plan";
import { filterCrossExercises } from "@/lib/train/engine/prescribe";
import {
  deletePlannedSessionsFrom,
  getActiveBlock,
  getProfile,
  insertSessions,
  listBadges,
  listBlocks,
  listSessions,
  trainStats,
  updateBlock,
} from "@/lib/train/repo";
import { patchBlockSchema } from "@/lib/train/schemas";

export async function GET() {
  const block = getActiveBlock(USER_ID);
  if (!block) return jsonError("No active block", 404);
  const sessions = listSessions(block.id);
  const today = todayUtc();
  const due = sessions.filter((s) => s.date < today || s.status === "done");
  const done = due.filter((s) => s.status === "done").length;
  const stats = trainStats(block);
  return json({
    block: blockDto(block),
    sessions: sessions.map(sessionDto),
    stats: {
      ...stats,
      adherencePct: due.length > 0 ? Math.round((done / due.length) * 100) : null,
    },
    badges: listBadges(USER_ID),
    maxHistory: listBlocks(USER_ID).map((b) => ({
      blockId: b.id,
      createdAt: b.created_at,
      baselineMax: b.baseline_max,
      currentMax: b.current_max,
    })),
    today,
  });
}

/** Change PR date: regenerate future, non-done sessions; keep completed ones. */
export async function PATCH(request: Request) {
  const parsed = await parseBody(request, patchBlockSchema());
  if ("response" in parsed) return parsed.response;
  const { prDate } = parsed.data;

  const block = getActiveBlock(USER_ID);
  if (!block) return jsonError("No active block", 404);
  const profile = getProfile(USER_ID);
  if (!profile) return jsonError("No profile", 400);
  const equipment = equipmentOf(profile);
  const today = todayUtc();

  let plan;
  try {
    plan = generatePlan({
      today,
      prDate,
      maxReps: block.current_max,
      equipment,
      pullDays: JSON.parse(profile.pull_days) as number[],
      crossDaysPerWeek: profile.cross_days_per_week,
      bodyKg: bodyKgOf(profile),
      crossExercises: filterCrossExercises(equipment),
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not build a plan", 400);
  }

  deletePlannedSessionsFrom(block.id, today);
  const keptDates = new Set(listSessions(block.id).map((s) => s.date));
  const future = { ...plan, sessions: plan.sessions.filter((s) => s.date >= today && !keptDates.has(s.date)) };
  const earliestKept = [...keptDates].sort()[0];
  const startDate = earliestKept && earliestKept < plan.startDate ? earliestKept : plan.startDate;
  const updated = updateBlock(block.id, { prDate, startDate, compressed: plan.compressed });
  const sessions = insertSessions(updated, future, newId);
  return json({ block: blockDto(updated), sessions: sessions.map(sessionDto) });
}
