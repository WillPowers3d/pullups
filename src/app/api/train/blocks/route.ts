import {
  awardBadges,
  blockDto,
  bodyKgOf,
  equipmentOf,
  json,
  jsonError,
  newId,
  nowIso,
  parseBody,
  sessionDto,
  todayUtc,
  USER_ID,
} from "@/lib/api";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { generatePlan } from "@/lib/train/engine/plan";
import { filterCrossExercises } from "@/lib/train/engine/prescribe";
import { abandonActiveBlocks, getProfile, insertBlock, insertSessions } from "@/lib/train/repo";
import { createBlockSchema } from "@/lib/train/schemas";

export async function POST(request: Request) {
  const parsed = await parseBody(request, createBlockSchema());
  if ("response" in parsed) return parsed.response;
  const { prDate, maxReps } = parsed.data;

  const profile = getProfile(USER_ID);
  if (!profile) return jsonError("Set up your profile first", 400);
  const equipment = equipmentOf(profile);

  let plan;
  try {
    plan = generatePlan({
      today: todayUtc(),
      prDate,
      maxReps,
      equipment,
      pullDays: JSON.parse(profile.pull_days) as number[],
      crossDaysPerWeek: profile.cross_days_per_week,
      bodyKg: bodyKgOf(profile),
      crossExercises: filterCrossExercises(equipment),
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not build a plan", 400);
  }

  const now = nowIso();
  abandonActiveBlocks(USER_ID);
  const block = insertBlock({
    id: newId(),
    userId: USER_ID,
    plan,
    baselineMax: maxReps,
    currentMax: maxReps,
    configJson: JSON.stringify(TRAIN_CONFIG),
    nowIso: now,
  });
  const sessions = insertSessions(block, plan, newId);
  const badges = awardBadges(block, now);
  return json({ block: blockDto(block), sessions: sessions.map(sessionDto), badges }, 201);
}
