import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  nextMondayAfter,
  parseUtcDate,
  startOfWeekMonday,
  weekdayUtc,
} from "@/lib/dates";

describe("UTC date helpers (implemented in the scaffold)", () => {
  it("parses YYYY-MM-DD as UTC", () => {
    const d = parseUtcDate("2026-11-23");
    expect(d.toISOString()).toBe("2026-11-23T00:00:00.000Z");
    expect(weekdayUtc("2026-11-23")).toBe(1);
    expect(weekdayUtc("2027-02-21")).toBe(0);
  });

  it("rejects invalid strings", () => {
    expect(() => parseUtcDate("11/23/2026")).toThrow(/Invalid date/);
  });

  it("finds Monday of the week in UTC", () => {
    expect(startOfWeekMonday("2026-11-23")).toBe("2026-11-23");
    expect(startOfWeekMonday("2027-02-21")).toBe("2027-02-15");
    expect(startOfWeekMonday("2027-01-10")).toBe("2027-01-04");
  });

  it("adds and diffs whole days", () => {
    expect(addDays("2026-11-30", 77)).toBe("2027-02-15");
    expect(diffDays("2026-11-30", "2027-02-15")).toBe(77);
    expect(nextMondayAfter("2026-11-23")).toBe("2026-11-30");
  });
});
