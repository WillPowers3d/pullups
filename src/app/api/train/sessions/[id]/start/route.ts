import { json, jsonError, newId, nowIso, sessionDto, setDto } from "@/lib/api";
import { getSession, startSession } from "@/lib/train/repo";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = getSession(id);
  if (!existing) return jsonError("Session not found", 404);
  if (existing.status === "done") return jsonError("Session already completed", 409);
  const { session, sets } = startSession({ sessionId: id, nowIso: existing.started_at ?? nowIso(), idFactory: newId });
  return json({ session: sessionDto(session), sets: sets.map(setDto) });
}
