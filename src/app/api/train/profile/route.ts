import { equipmentOf, json, jsonError, nowIso, parseBody, profileDto, USER_ID } from "@/lib/api";
import { availableLadder } from "@/lib/train/engine/ladder";
import { validatePullDays } from "@/lib/train/engine/schedule";
import { getProfile, upsertProfile } from "@/lib/train/repo";
import { profilePutSchema } from "@/lib/train/schemas";

export async function GET() {
  const profile = getProfile(USER_ID);
  if (!profile) return jsonError("No profile yet", 404);
  return json({ profile: profileDto(profile), ladder: availableLadder(equipmentOf(profile)) });
}

export async function PUT(request: Request) {
  const parsed = await parseBody(request, profilePutSchema());
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;
  const days = validatePullDays(body.pullDays);
  if (!days.ok) return jsonError(days.error, 400);
  const profile = upsertProfile({
    userId: USER_ID,
    displayName: body.displayName,
    equipment: { hasBar: body.hasBar, bands: body.bands, hasWeight: body.hasWeight, hasRings: body.hasRings },
    bodyKg: body.bodyKg,
    pullDays: body.pullDays,
    crossDaysPerWeek: body.crossDaysPerWeek,
    nowIso: nowIso(),
  });
  return json({ profile: profileDto(profile), ladder: availableLadder(equipmentOf(profile)) });
}
