import { afterEach, describe, expect, it } from "vitest";
import { getDb, resetDbForTests } from "@/lib/db";
import {
  getActiveBlock,
  getProfile,
  insertBlock,
  insertSessions,
  listSessions,
  listSets,
  startSession,
  upsertProfile,
} from "@/lib/train/repo";
import { TRAIN_CONFIG } from "@/lib/train/config";
import { FULL_EQUIPMENT } from "./helpers";
import type { Plan } from "@/lib/train/engine/types";

function memoryDb() {
  process.env.DB_PATH = ":memory:";
  resetDbForTests();
  return getDb();
}

const PLAN: Plan = {
  startDate: "2026-11-30",
  prDate: "2027-02-21",
  compressed: false,
  weeks: [1],
  sessions: [
    {
      weekIndex: 1,
      date: "2026-11-30",
      type: "pull",
      slot: 0,
      plan: {
        type: "pull",
        warmup: [],
        sets: [
          {
            phase: "p1",
            variation: "strict",
            addedKg: 0,
            targetReps: 5,
            restSec: 180,
            rirFloor: 1,
          },
        ],
        volumeScore: 5,
        taper: false,
      },
    },
  ],
};

// T11: remove `.skip` when implementing this ticket.
describe("T11 repository", () => {
  afterEach(() => {
    resetDbForTests();
    delete process.env.DB_PATH;
  });

  it("round-trips a profile, block, sessions, and materialized sets", () => {
    memoryDb();
    let n = 0;
    const ids = () => `id-${++n}`;
    const profile = upsertProfile({
      userId: TRAIN_CONFIG.DEFAULT_USER_ID,
      equipment: FULL_EQUIPMENT,
      bodyKg: 80,
      pullDays: [1, 4],
      crossDaysPerWeek: 2,
      nowIso: "2026-11-23T00:00:00.000Z",
    });
    expect(getProfile(profile.user_id)?.body_kg).toBe(80);

    const block = insertBlock({
      id: ids(),
      userId: profile.user_id,
      plan: PLAN,
      baselineMax: 8,
      currentMax: 8,
      configJson: JSON.stringify(TRAIN_CONFIG),
      nowIso: "2026-11-23T00:00:00.000Z",
    });
    expect(getActiveBlock(profile.user_id)?.id).toBe(block.id);

    insertSessions(block, PLAN, ids);
    const sessions = listSessions(block.id);
    expect(sessions).toHaveLength(1);

    const started = startSession({
      sessionId: sessions[0]!.id,
      nowIso: "2026-11-30T12:00:00.000Z",
      idFactory: ids,
    });
    expect(started.session.status).toBe("in_progress");
    expect(listSets(sessions[0]!.id)).toHaveLength(1);
    expect(started.sets[0]?.target_reps).toBe(5);
  });
});
