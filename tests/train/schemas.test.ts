import { describe, expect, it } from "vitest";
import {
  createBlockSchema,
  logSetSchema,
  moveSessionSchema,
  profilePutSchema,
} from "@/lib/train/schemas";

// T12: remove `.skip` when implementing this ticket.
describe("T12 zod schemas", () => {
  it("profilePut rejects a 72h-invalid pull-day pair at the type level (length or range)", () => {
    const schema = profilePutSchema();
    expect(schema.safeParse({ pullDays: [1] }).success).toBe(false);
    expect(schema.safeParse({ pullDays: [1, 8] }).success).toBe(false);
    expect(schema.safeParse({ crossDaysPerWeek: 0 }).success).toBe(false);
    expect(schema.safeParse({ crossDaysPerWeek: 4 }).success).toBe(false);
  });

  it("createBlock requires a YYYY-MM-DD prDate and a non-negative maxReps", () => {
    const schema = createBlockSchema();
    expect(schema.safeParse({ prDate: "soon", maxReps: 8 }).success).toBe(false);
    expect(schema.safeParse({ prDate: "2027-02-21", maxReps: -1 }).success).toBe(false);
    expect(schema.safeParse({ prDate: "2027-02-21", maxReps: 8 }).success).toBe(true);
  });

  it("logSet rejects out-of-range RIR and quality", () => {
    const schema = logSetSchema();
    const base = { setId: "s1", actualReps: 5, rir: 1, quality: 4, restTakenSec: 180 };
    expect(schema.safeParse(base).success).toBe(true);
    expect(schema.safeParse({ ...base, rir: 5 }).success).toBe(false);
    expect(schema.safeParse({ ...base, quality: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...base, actualReps: -1 }).success).toBe(false);
  });

  it("moveSession requires YYYY-MM-DD", () => {
    const schema = moveSessionSchema();
    expect(schema.safeParse({ date: "2026-12-01" }).success).toBe(true);
    expect(schema.safeParse({ date: "December 1" }).success).toBe(false);
  });
});
