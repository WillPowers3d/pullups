import { describe, expect, it } from "vitest";
import {
  availableLadder,
  difficultyRank,
  stepDown,
  stepUp,
  variationFactor,
} from "@/lib/train/engine/ladder";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { FULL_EQUIPMENT, FULL_LADDER, NO_BANDS_NO_WEIGHT, NO_BAR } from "./helpers";

// T02: remove `.skip` when implementing this ticket.
describe("T02 ladder", () => {
  it("ranks weighted > chest-to-bar > strict > band-light", () => {
    expect(difficultyRank("weighted")).toBeGreaterThan(difficultyRank("chest-to-bar"));
    expect(difficultyRank("chest-to-bar")).toBeGreaterThan(difficultyRank("strict"));
    expect(difficultyRank("strict")).toBeGreaterThan(difficultyRank("band-light"));
  });

  it("lists the no-bands no-weight ladder easiest to hardest", () => {
    expect(availableLadder(NO_BANDS_NO_WEIGHT)).toEqual([
      "negative",
      "australian",
      "strict",
      "chest-to-bar",
    ]);
  });

  it("returns an empty ladder when there is no bar", () => {
    expect(availableLadder(NO_BAR)).toEqual([]);
  });

  it("keeps only the light band rung when bands is light", () => {
    expect(
      availableLadder({ hasBar: true, bands: "light", hasWeight: false, hasRings: false }),
    ).toEqual(["negative", "australian", "band-light", "strict", "chest-to-bar"]);
  });

  it("steps up onto weighted at INITIAL_WEIGHT_KG when weight is available", () => {
    const ladder = availableLadder(FULL_EQUIPMENT);
    expect(stepUp("chest-to-bar", 0, ladder)).toEqual({
      variation: "weighted",
      addedKg: TRAIN_CONFIG.INITIAL_WEIGHT_KG,
    });
  });

  it("caps stepUp when weighted is not on the ladder", () => {
    const ladder = availableLadder(NO_BANDS_NO_WEIGHT);
    expect(stepUp("chest-to-bar", 0, ladder)).toEqual({
      variation: "chest-to-bar",
      addedKg: 0,
      capped: true,
    });
  });

  it("steps down from the first weighted plate onto chest-to-bar", () => {
    expect(stepDown("weighted", 2.5, FULL_LADDER)).toEqual({
      variation: "chest-to-bar",
      addedKg: 0,
    });
  });

  it("adds a plate when already weighted", () => {
    expect(stepUp("weighted", 2.5, FULL_LADDER)).toEqual({
      variation: "weighted",
      addedKg: 5,
    });
  });

  it("computes weighted factor as 1 + addedKg/bodyKg", () => {
    expect(variationFactor("weighted", 8, 80)).toBe(1.1);
    expect(variationFactor("weighted", 2.5, 80)).toBe(1 + 2.5 / 80);
    expect(variationFactor("strict", 0, 80)).toBe(1);
    expect(variationFactor("band-light")).toBe(0.6);
  });
});
