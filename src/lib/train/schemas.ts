import { z } from "zod";
import { TRAIN_CONFIG } from "@/lib/train/config";

/**
 * Zod contracts for API bodies (ticket T12, docs/DESIGN.md §5).
 * - profilePut: equipment + optional bodyKg, pullDays (2 weekdays), crossDaysPerWeek 1–3, displayName
 * - createBlock: { prDate: YYYY-MM-DD, maxReps: int ≥ 0 }
 * - patchBlock: { prDate: YYYY-MM-DD }
 * - logSet: { setId, actualReps ≥ 0, rir 0–4, quality 1–5, restTakenSec ≥ 0, verifiedFullReps? }
 * - moveSession: { date: YYYY-MM-DD }
 * - completeSession: { restExtensions?, warmupSkipped? }
 *
 * The 72-hour pull-day gap is an engine rule (validatePullDays), not zod.
 */

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Invalid calendar date");

export const ymdSchema = ymd;

export const bandsSchema = z.enum(["none", "light", "heavy", "both"]);

const weekday = z.number().int().min(0).max(6);

export function profilePutSchema() {
  return z.object({
    displayName: z.string().trim().min(1).max(60).optional(),
    hasBar: z.boolean(),
    bands: bandsSchema,
    hasWeight: z.boolean(),
    hasRings: z.boolean(),
    bodyKg: z.number().positive().max(400).nullable(),
    pullDays: z.tuple([weekday, weekday]),
    crossDaysPerWeek: z.number().int().min(TRAIN_CONFIG.CROSS_DAYS_MIN).max(TRAIN_CONFIG.CROSS_DAYS_MAX),
  });
}

export function createBlockSchema() {
  return z.object({
    prDate: ymd,
    maxReps: z.number().int().min(0).max(200),
  });
}

export function patchBlockSchema() {
  return z.object({ prDate: ymd });
}

export function logSetSchema() {
  return z.object({
    setId: z.string().min(1),
    actualReps: z.number().int().min(0).max(500),
    rir: z.number().int().min(0).max(4),
    quality: z.number().int().min(1).max(5),
    restTakenSec: z.number().min(0).max(86_400),
    verifiedFullReps: z.number().int().min(0).nullable().optional(),
  });
}

export function moveSessionSchema() {
  return z.object({ date: ymd });
}

export function completeSessionSchema() {
  return z.object({
    restExtensions: z.number().int().min(0).max(1000).optional(),
    warmupSkipped: z.array(z.string()).optional(),
  });
}

export type ProfilePutBody = z.infer<ReturnType<typeof profilePutSchema>>;
export type CreateBlockBody = z.infer<ReturnType<typeof createBlockSchema>>;
export type PatchBlockBody = z.infer<ReturnType<typeof patchBlockSchema>>;
export type LogSetBody = z.infer<ReturnType<typeof logSetSchema>>;
export type MoveSessionBody = z.infer<ReturnType<typeof moveSessionSchema>>;
export type CompleteSessionBody = z.infer<ReturnType<typeof completeSessionSchema>>;
