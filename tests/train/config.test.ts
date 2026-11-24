import { describe, expect, it } from "vitest";
import { TRAIN_CONFIG } from "@/lib/train/config";

describe("T01 config", () => {
  it("locks taper fractions used by weekMultiplier", () => {
    expect(TRAIN_CONFIG.TAPER_VOLUME).toEqual([0.7, 0.45]);
  });

  it("locks Phase 1 rest at 3 minutes", () => {
    expect(TRAIN_CONFIG.REST_SEC.p1).toBe(180);
  });

  it("keeps the 2-for-2 / 72h / 12-week book rules as named constants", () => {
    expect(TRAIN_CONFIG.PULL_DAYS_PER_WEEK).toBe(2);
    expect(TRAIN_CONFIG.MIN_DAYS_BETWEEN_PULL_DAYS).toBe(3);
    expect(TRAIN_CONFIG.MIN_HOURS_BETWEEN_PULL_DAYS).toBe(72);
    expect(TRAIN_CONFIG.BLOCK_WEEKS).toBe(12);
    expect(TRAIN_CONFIG.TAPER_WEEKS).toBe(2);
    expect(TRAIN_CONFIG.MDC_REPS).toBe(2);
    expect(TRAIN_CONFIG.BUILD_WEEKLY_INCREASE).toBe(0.075);
    expect(TRAIN_CONFIG.WEEKLY_INCREASE_CAP).toBe(0.1);
    expect(TRAIN_CONFIG.START_VOLUME_X_MAX).toBe(5);
    expect(TRAIN_CONFIG.INITIAL_WEIGHT_KG).toBe(2.5);
    expect(TRAIN_CONFIG.REST_EXTENSIONS_MAX).toBe(2);
    expect(TRAIN_CONFIG.FULL_FORCE_CUES).toHaveLength(6);
    expect(TRAIN_CONFIG.LADDER_ORDER).toEqual([
      "negative",
      "band-heavy",
      "australian",
      "band-light",
      "strict",
      "chest-to-bar",
      "weighted",
    ]);
  });

  it("locks William's rest cap (not a book number)", () => {
    expect(TRAIN_CONFIG.CROSS_DAYS_MIN).toBe(2);
    expect(TRAIN_CONFIG.MAX_REST_DAYS_PER_WEEK).toBe(3);
    expect(TRAIN_CONFIG.maxRestDaysPerWeek).toBe(3);
    expect(TRAIN_CONFIG.MAX_CONSECUTIVE_REST_DAYS).toBe(3);
    expect(TRAIN_CONFIG.maxConsecutiveRestDays).toBe(3);
  });
});
