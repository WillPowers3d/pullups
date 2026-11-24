import { z } from "zod";
import { notImplemented } from "@/lib/train/engine/not-implemented";

/**
 * Zod contracts for API bodies. Implement in ticket T12.
 * Until then these factories throw so unused-route stubs cannot silently accept junk.
 *
 * Expected shapes (see docs/DESIGN.md §5):
 * - profilePut: equipment + optional bodyKg, pullDays (2 weekdays), crossDaysPerWeek 1–3, displayName
 * - createBlock: { prDate: YYYY-MM-DD, maxReps: int ≥ 0 }
 * - patchBlock: { prDate: YYYY-MM-DD }
 * - logSet: { setId, actualReps ≥ 0, rir 0–4, quality 1–5, restTakenSec ≥ 0, verifiedFullReps? }
 * - moveSession: { date: YYYY-MM-DD }
 * - linkSet: { companionSubmissionId: string } (optional ticket T14)
 */

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ymdSchema = ymd;

export function profilePutSchema(): z.ZodType {
  return notImplemented("profilePutSchema");
}

export function createBlockSchema(): z.ZodType {
  return notImplemented("createBlockSchema");
}

export function patchBlockSchema(): z.ZodType {
  return notImplemented("patchBlockSchema");
}

export function logSetSchema(): z.ZodType {
  return notImplemented("logSetSchema");
}

export function moveSessionSchema(): z.ZodType {
  return notImplemented("moveSessionSchema");
}

export const bandsSchema = z.enum(["none", "light", "heavy", "both"]);
