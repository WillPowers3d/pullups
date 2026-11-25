import {
  awardBadges,
  bodyKgOf,
  json,
  jsonError,
  ladderOf,
  loggedSetsOf,
  nowIso,
  parseBody,
  planOf,
  sessionDto,
  todayUtc,
  trackOf,
} from "@/lib/api";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { weekMultiplier } from "@/lib/train/engine/plan";
import { prescribePullSession } from "@/lib/train/engine/prescribe";
import { progress, retarget } from "@/lib/train/engine/progress";
import type { ProgressDecision } from "@/lib/train/engine/types";
import {
  completeSession,
  getBlock,
  getProfile,
  getSession,
  listSessions,
  updateBlock,
  updateSessionPlan,
} from "@/lib/train/repo";
import { completeSessionSchema } from "@/lib/train/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseBody(request, completeSessionSchema());
  if ("response" in parsed) return parsed.response;

  const session = getSession(id);
  if (!session) return jsonError("Session not found", 404);
  if (session.status === "done") return jsonError("Session already completed", 409);
  const block = getBlock(session.block_id);
  const profile = block ? getProfile(block.user_id) : null;
  if (!block || !profile) return jsonError("Block or profile missing", 404);

  const ladder = ladderOf(profile);
  const bodyKg = bodyKgOf(profile);
  const all = listSessions(block.id);
  const weeks = [...new Set(all.map((s) => s.week_index))].filter((w) => w > 0).sort((a, b) => a - b);
  const plan = planOf(session);
  const cur = loggedSetsOf(session);
  let decision: ProgressDecision;
  let maxReps = block.current_max;

  if (session.type === "pull") {
    const prevRow = all
      .filter((s) => s.type === "pull" && s.slot === session.slot && s.status === "done" && s.date < session.date)
      .at(-1);
    const prev = prevRow ? loggedSetsOf(prevRow) : null;
    decision = progress({
      prev: prev && prev.length > 0 ? prev : null,
      cur,
      track: trackOf(plan, maxReps, ladder),
      ladder,
      maxReps,
    });
    // Re-prescribe the next planned same-slot pull session from the new track.
    const next = all.find(
      (s) => s.type === "pull" && s.slot === session.slot && s.status === "planned" && s.date > session.date,
    );
    if (next) {
      updateSessionPlan(
        next.id,
        prescribePullSession({
          maxReps,
          ladder,
          weekIndex: next.week_index,
          volumeMultiplier: weekMultiplier(next.week_index, weeks),
          bodyKg,
          track: decision.track,
        }),
      );
    }
  } else if (session.type === "max_test" || session.type === "pr_attempt") {
    const tested = cur.find((s) => s.phase === "test")?.actualReps ?? null;
    const track = trackOf(plan, maxReps, ladder);
    if (tested === null) {
      decision = { action: "hold", reason: "No max logged — keeping your current max.", track };
    } else {
      const rt = retarget(block.current_max, tested);
      const delta = tested - block.baseline_max;
      if (rt.changed) {
        maxReps = rt.max;
        updateBlock(block.id, { currentMax: maxReps });
        // Regenerate remaining non-done pull sessions at the new max.
        const today = todayUtc();
        for (const s of all) {
          if (s.type !== "pull" || s.status !== "planned" || s.date < today) continue;
          updateSessionPlan(
            s.id,
            prescribePullSession({
              maxReps,
              ladder,
              weekIndex: s.week_index,
              volumeMultiplier: weekMultiplier(s.week_index, weeks),
              bodyKg,
            }),
          );
        }
      }
      const vsBaseline = `${delta >= 0 ? "+" : ""}${delta} vs baseline ${block.baseline_max}`;
      decision = {
        action: rt.changed ? "progress" : "hold",
        reason: rt.changed
          ? `Max ${tested} (${vsBaseline}). Training max updated ${block.current_max} → ${maxReps}; remaining sessions re-prescribed.`
          : `Max ${tested} (${vsBaseline}). Within ±${TRAIN_CONFIG.MDC_REPS - 1} of ${block.current_max}, so the plan stays as is.`,
        track,
      };
    }
  } else {
    decision = { action: "hold", reason: "Cross day done.", track: trackOf(plan, maxReps, ladder) };
  }

  const now = nowIso();
  const done = completeSession({
    sessionId: id,
    nowIso: now,
    decision,
    restExtensions: parsed.data.restExtensions ?? session.rest_extensions,
    warmupSkipped: parsed.data.warmupSkipped ?? [],
  });
  const badges = awardBadges(getBlock(block.id)!, now);
  return json({ session: sessionDto(done), decision, badges });
}
