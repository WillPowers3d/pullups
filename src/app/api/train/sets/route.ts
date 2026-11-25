import { json, jsonError, nowIso, parseBody, setDto } from "@/lib/api";
import { getSession, getSet, logSet } from "@/lib/train/repo";
import { logSetSchema } from "@/lib/train/schemas";

export async function POST(request: Request) {
  const parsed = await parseBody(request, logSetSchema());
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;
  const row = getSet(body.setId);
  if (!row) return jsonError("Set not found", 404);
  const session = getSession(row.session_id);
  if (!session || session.status === "done") return jsonError("Session is not in progress", 409);
  const saved = logSet({
    setId: body.setId,
    actualReps: body.actualReps,
    rir: body.rir,
    quality: body.quality,
    restTakenSec: body.restTakenSec,
    verifiedFullReps: body.verifiedFullReps ?? null,
    nowIso: nowIso(),
  });
  return json({ set: setDto(saved) });
}
