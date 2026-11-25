import { getDb } from "@/lib/db";
import type {
  BlockStatus,
  Equipment,
  Plan,
  ProgressDecision,
  SessionPlan,
  SessionStatus,
  SessionType,
  TrainStats,
} from "@/lib/train/engine/types";
import { TRAIN_CONFIG } from "@/lib/train/config";

export type ProfileRow = {
  user_id: string;
  display_name: string;
  has_bar: number;
  bands: Equipment["bands"];
  has_weight: number;
  has_rings: number;
  body_kg: number | null;
  pull_days: string;
  cross_days_per_week: number;
  updated_at: string;
};

export type BlockRow = {
  id: string;
  user_id: string;
  status: BlockStatus;
  start_date: string;
  pr_date: string;
  baseline_max: number;
  current_max: number;
  compressed: number;
  config_json: string;
  created_at: string;
};

export type SessionRow = {
  id: string;
  block_id: string;
  user_id: string;
  week_index: number;
  date: string;
  type: SessionType;
  slot: number;
  status: SessionStatus;
  plan_json: string;
  started_at: string | null;
  completed_at: string | null;
  rest_extensions: number;
  warmup_skipped: string;
  decision_json: string | null;
};

export type SetRow = {
  id: string;
  session_id: string;
  idx: number;
  phase: string;
  variation: string;
  added_kg: number;
  target_reps: number;
  rest_sec: number;
  actual_reps: number | null;
  rir: number | null;
  quality: number | null;
  rest_taken_sec: number | null;
  companion_submission_id: string | null;
  verified_full_reps: number | null;
  logged_at: string | null;
};

export type UpsertProfileInput = {
  userId?: string;
  displayName?: string;
  equipment: Equipment;
  bodyKg: number | null;
  pullDays: number[];
  crossDaysPerWeek: number;
  nowIso: string;
};

export function getProfile(userId: string): ProfileRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM train_profiles WHERE user_id = ?")
    .get(userId) as ProfileRow | undefined;
  return row ?? null;
}

export function upsertProfile(input: UpsertProfileInput): ProfileRow {
  const db = getDb();
  const userId = input.userId ?? TRAIN_CONFIG.DEFAULT_USER_ID;
  const pullDays = JSON.stringify(input.pullDays);

  db.prepare(`
    INSERT INTO train_profiles (
      user_id, display_name, has_bar, bands, has_weight, has_rings,
      body_kg, pull_days, cross_days_per_week, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      display_name = excluded.display_name,
      has_bar = excluded.has_bar,
      bands = excluded.bands,
      has_weight = excluded.has_weight,
      has_rings = excluded.has_rings,
      body_kg = excluded.body_kg,
      pull_days = excluded.pull_days,
      cross_days_per_week = excluded.cross_days_per_week,
      updated_at = excluded.updated_at
  `).run(
    userId,
    input.displayName ?? "Athlete",
    input.equipment.hasBar ? 1 : 0,
    input.equipment.bands,
    input.equipment.hasWeight ? 1 : 0,
    input.equipment.hasRings ? 1 : 0,
    input.bodyKg,
    pullDays,
    input.crossDaysPerWeek,
    input.nowIso,
  );

  return getProfile(userId)!;
}

export function getActiveBlock(userId: string): BlockRow | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM train_blocks WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    )
    .get(userId) as BlockRow | undefined;
  return row ?? null;
}

export function insertBlock(input: {
  id: string;
  userId: string;
  plan: Plan;
  baselineMax: number;
  currentMax: number;
  configJson: string;
  nowIso: string;
}): BlockRow {
  const db = getDb();

  db.prepare(`
    INSERT INTO train_blocks (
      id, user_id, status, start_date, pr_date,
      baseline_max, current_max, compressed, config_json, created_at
    ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.userId,
    input.plan.startDate,
    input.plan.prDate,
    input.baselineMax,
    input.currentMax,
    input.plan.compressed ? 1 : 0,
    input.configJson,
    input.nowIso,
  );

  return getActiveBlock(input.userId)!;
}

export function abandonActiveBlocks(userId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE train_blocks SET status = 'abandoned' WHERE user_id = ? AND status = 'active'",
  ).run(userId);
}

export function listSessions(blockId: string): SessionRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM train_sessions WHERE block_id = ? ORDER BY date",
    )
    .all(blockId) as SessionRow[];
}

export function getSession(id: string): SessionRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM train_sessions WHERE id = ?")
    .get(id) as SessionRow | undefined;
  return row ?? null;
}

export function insertSessions(
  block: BlockRow,
  plan: Plan,
  idFactory: () => string,
): SessionRow[] {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO train_sessions (
      id, block_id, user_id, week_index, date, type, slot, status, plan_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', ?)
  `);

  const insert = db.transaction((sessions: typeof plan.sessions) => {
    for (const ps of sessions) {
      const id = idFactory();
      const planJson = JSON.stringify(ps.plan);
      stmt.run(
        id,
        block.id,
        block.user_id,
        ps.weekIndex,
        ps.date,
        ps.type,
        ps.slot,
        planJson,
      );
    }
  });

  insert(plan.sessions);
  return listSessions(block.id);
}

export function startSession(input: {
  sessionId: string;
  nowIso: string;
  idFactory: () => string;
}): { session: SessionRow; sets: SetRow[] } {
  const db = getDb();
  const { sessionId, nowIso, idFactory } = input;

  db.prepare(`
    UPDATE train_sessions
    SET status = 'in_progress', started_at = ?
    WHERE id = ?
  `).run(nowIso, sessionId);

  const session = getSession(sessionId)!;

  const { cnt } = db
    .prepare("SELECT COUNT(*) as cnt FROM train_sets WHERE session_id = ?")
    .get(sessionId) as { cnt: number };

  if (cnt === 0) {
    const plan = JSON.parse(session.plan_json) as SessionPlan;
    const stmt = db.prepare(`
      INSERT INTO train_sets (
        id, session_id, idx, phase, variation, added_kg, target_reps, rest_sec
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insert = db.transaction((sets: typeof plan.sets) => {
      for (let i = 0; i < sets.length; i++) {
        const s = sets[i]!;
        const setId = idFactory();
        stmt.run(
          setId,
          sessionId,
          i,
          s.phase,
          s.variation,
          s.addedKg,
          s.targetReps,
          s.restSec,
        );
      }
    });

    insert(plan.sets);
  }

  return { session, sets: listSets(sessionId) };
}

export function listSets(sessionId: string): SetRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM train_sets WHERE session_id = ? ORDER BY idx")
    .all(sessionId) as SetRow[];
}

export function logSet(input: {
  setId: string;
  actualReps: number;
  rir: number;
  quality: number;
  restTakenSec: number;
  nowIso: string;
  verifiedFullReps?: number | null;
}): SetRow {
  const db = getDb();
  db.prepare(`
    UPDATE train_sets
    SET actual_reps = ?, rir = ?, quality = ?, rest_taken_sec = ?,
        verified_full_reps = ?, logged_at = ?
    WHERE id = ?
  `).run(
    input.actualReps,
    input.rir,
    input.quality,
    input.restTakenSec,
    input.verifiedFullReps ?? null,
    input.nowIso,
    input.setId,
  );

  return (
    db
      .prepare("SELECT * FROM train_sets WHERE id = ?")
      .get(input.setId) as SetRow
  );
}

export function completeSession(input: {
  sessionId: string;
  nowIso: string;
  decision: ProgressDecision;
  restExtensions: number;
  warmupSkipped: string[];
}): SessionRow {
  const db = getDb();
  db.prepare(`
    UPDATE train_sessions
    SET status = 'done', completed_at = ?, decision_json = ?,
        rest_extensions = ?, warmup_skipped = ?
    WHERE id = ?
  `).run(
    input.nowIso,
    JSON.stringify(input.decision),
    input.restExtensions,
    JSON.stringify(input.warmupSkipped),
    input.sessionId,
  );

  return getSession(input.sessionId)!;
}

export function updateSessionPlan(
  sessionId: string,
  plan: SessionPlan,
): void {
  const db = getDb();
  db.prepare(
    "UPDATE train_sessions SET plan_json = ? WHERE id = ?",
  ).run(JSON.stringify(plan), sessionId);
}

export function moveSession(
  sessionId: string,
  date: string,
): SessionRow {
  const db = getDb();
  db.prepare("UPDATE train_sessions SET date = ? WHERE id = ?").run(
    date,
    sessionId,
  );
  return getSession(sessionId)!;
}

export function insertBadge(
  userId: string,
  badgeId: string,
  earnedAt: string,
): void {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO train_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)",
  ).run(userId, badgeId, earnedAt);
}

export function listBadges(
  userId: string,
): { badge_id: string; earned_at: string }[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT badge_id, earned_at FROM train_badges WHERE user_id = ? ORDER BY earned_at",
    )
    .all(userId) as { badge_id: string; earned_at: string }[];
}

// ── T12 additions (used by the API routes) ──────────────────────────────────

export function getBlock(id: string): BlockRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM train_blocks WHERE id = ?").get(id) as BlockRow | undefined;
  return row ?? null;
}

export function listBlocks(userId: string): BlockRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM train_blocks WHERE user_id = ? ORDER BY created_at")
    .all(userId) as BlockRow[];
}

export function updateBlock(
  id: string,
  patch: { prDate?: string; startDate?: string; currentMax?: number; status?: BlockStatus; compressed?: boolean },
): BlockRow {
  const db = getDb();
  const current = getBlock(id);
  if (!current) throw new Error(`Block not found: ${id}`);
  db.prepare(
    "UPDATE train_blocks SET pr_date = ?, start_date = ?, current_max = ?, status = ?, compressed = ? WHERE id = ?",
  ).run(
    patch.prDate ?? current.pr_date,
    patch.startDate ?? current.start_date,
    patch.currentMax ?? current.current_max,
    patch.status ?? current.status,
    patch.compressed === undefined ? current.compressed : patch.compressed ? 1 : 0,
    id,
  );
  return getBlock(id)!;
}

/** Delete `planned` sessions on or after `fromDate` (and their unlogged sets). */
export function deletePlannedSessionsFrom(blockId: string, fromDate: string): number {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM train_sets WHERE session_id IN (
         SELECT id FROM train_sessions WHERE block_id = ? AND status = 'planned' AND date >= ?)`,
    ).run(blockId, fromDate);
    return db
      .prepare("DELETE FROM train_sessions WHERE block_id = ? AND status = 'planned' AND date >= ?")
      .run(blockId, fromDate).changes;
  });
  return tx();
}

export function getSet(id: string): SetRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM train_sets WHERE id = ?").get(id) as SetRow | undefined;
  return row ?? null;
}

function isWeeklyPullRow(s: SessionRow): boolean {
  return s.type === "pull" || (s.type === "max_test" && s.week_index === 6);
}

/** Aggregate stats for badges and the dashboard (see TrainStats). */
export function trainStats(block: BlockRow): TrainStats {
  const sessions = listSessions(block.id);
  const done = sessions.filter((s) => s.status === "done");
  let restOverrunCount = 0;
  let zeroOverrunCount = 0;
  let warmupPerfectCount = 0;
  let week6Delta: number | null = null;
  let prDelta: number | null = null;

  for (const s of done) {
    const sets = listSets(s.id);
    const allowance = s.rest_extensions * TRAIN_CONFIG.REST_EXTENSION_SEC;
    const overruns = sets.filter(
      (x) => x.rest_taken_sec !== null && x.rest_taken_sec > x.rest_sec + allowance,
    ).length;
    restOverrunCount += overruns;
    if (overruns === 0 && sets.some((x) => x.logged_at !== null)) zeroOverrunCount += 1;
    if (s.warmup_skipped === "[]") warmupPerfectCount += 1;
    const testReps = sets.find((x) => x.phase === "test")?.actual_reps ?? null;
    if (testReps !== null && s.type === "max_test" && s.week_index === TRAIN_CONFIG.MAX_TEST_WEEKS[1]) {
      week6Delta = testReps - block.baseline_max;
    }
    if (testReps !== null && s.type === "pr_attempt") prDelta = testReps - block.baseline_max;
  }

  const weeklySlots = sessions.filter(isWeeklyPullRow);
  const pullSessionsCompleted = weeklySlots.filter((s) => s.status === "done").length;
  return {
    sessionsCompleted: done.length,
    pullSessionsCompleted,
    warmupPerfectCount,
    restOverrunCount,
    zeroOverrunCount,
    week6Delta,
    prDelta,
    blockComplete: weeklySlots.length > 0 && pullSessionsCompleted === weeklySlots.length,
    blockStarted: true,
  };
}
