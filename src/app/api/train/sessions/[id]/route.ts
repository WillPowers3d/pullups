import { json, jsonError, parseBody, planOf, sessionDto, setDto } from "@/lib/api";
import { legalMoveDays } from "@/lib/train/engine/schedule";
import type { Plan, PlannedSession } from "@/lib/train/engine/types";
import { getBlock, getSession, listSessions, listSets, moveSession } from "@/lib/train/repo";
import { moveSessionSchema } from "@/lib/train/schemas";

type Ctx = { params: Promise<{ id: string }> };

function planForBlock(blockId: string): { plan: Plan; byId: Map<string, PlannedSession> } | null {
  const block = getBlock(blockId);
  if (!block) return null;
  const rows = listSessions(blockId);
  const byId = new Map<string, PlannedSession>();
  const sessions = rows.map((r) => {
    const ps: PlannedSession = {
      weekIndex: r.week_index,
      date: r.date,
      type: r.type,
      slot: r.slot === 1 ? 1 : 0,
      plan: planOf(r),
    };
    byId.set(r.id, ps);
    return ps;
  });
  const weeks = [...new Set(rows.map((r) => r.week_index))].sort((a, b) => a - b);
  return {
    plan: { startDate: block.start_date, prDate: block.pr_date, compressed: block.compressed === 1, weeks, sessions },
    byId,
  };
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) return jsonError("Session not found", 404);
  let legalDates: string[] = [];
  if (session.status === "planned") {
    const built = planForBlock(session.block_id);
    const ps = built?.byId.get(id);
    if (built && ps) legalDates = legalMoveDays(ps, built.plan);
  }
  return json({ session: sessionDto(session), sets: listSets(id).map(setDto), legalDates });
}

/** Move a planned session to another date in its week (legalMoveDays only). */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = await parseBody(request, moveSessionSchema());
  if ("response" in parsed) return parsed.response;
  const session = getSession(id);
  if (!session) return jsonError("Session not found", 404);
  if (session.status !== "planned") return jsonError("Only planned sessions can move", 409);
  const built = planForBlock(session.block_id);
  const ps = built?.byId.get(id);
  if (!built || !ps) return jsonError("Block not found", 404);
  const legal = legalMoveDays(ps, built.plan);
  if (!legal.includes(parsed.data.date)) {
    return jsonError("That date breaks a scheduling rule", 400, { legalDates: legal });
  }
  return json({ session: sessionDto(moveSession(id, parsed.data.date)) });
}
