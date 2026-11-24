import { notImplemented } from "@/lib/train/engine/not-implemented";
import type {
  BlockStatus,
  Equipment,
  Plan,
  ProgressDecision,
  SessionPlan,
  SessionStatus,
  SessionType,
} from "@/lib/train/engine/types";

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

export function getProfile(_userId: string): ProfileRow | null {
  return notImplemented("getProfile");
}

export function upsertProfile(_input: UpsertProfileInput): ProfileRow {
  return notImplemented("upsertProfile");
}

export function getActiveBlock(_userId: string): BlockRow | null {
  return notImplemented("getActiveBlock");
}

export function insertBlock(_input: {
  id: string;
  userId: string;
  plan: Plan;
  baselineMax: number;
  currentMax: number;
  configJson: string;
  nowIso: string;
}): BlockRow {
  return notImplemented("insertBlock");
}

export function abandonActiveBlocks(_userId: string): void {
  return notImplemented("abandonActiveBlocks");
}

export function listSessions(_blockId: string): SessionRow[] {
  return notImplemented("listSessions");
}

export function getSession(_id: string): SessionRow | null {
  return notImplemented("getSession");
}

export function insertSessions(
  _block: BlockRow,
  _plan: Plan,
  _idFactory: () => string,
): SessionRow[] {
  return notImplemented("insertSessions");
}

export function startSession(_input: {
  sessionId: string;
  nowIso: string;
  idFactory: () => string;
}): { session: SessionRow; sets: SetRow[] } {
  return notImplemented("startSession");
}

export function listSets(_sessionId: string): SetRow[] {
  return notImplemented("listSets");
}

export function logSet(_input: {
  setId: string;
  actualReps: number;
  rir: number;
  quality: number;
  restTakenSec: number;
  nowIso: string;
  verifiedFullReps?: number | null;
}): SetRow {
  return notImplemented("logSet");
}

export function completeSession(_input: {
  sessionId: string;
  nowIso: string;
  decision: ProgressDecision;
  restExtensions: number;
  warmupSkipped: string[];
}): SessionRow {
  return notImplemented("completeSession");
}

export function updateSessionPlan(_sessionId: string, _plan: SessionPlan): void {
  return notImplemented("updateSessionPlan");
}

export function moveSession(_sessionId: string, _date: string): SessionRow {
  return notImplemented("moveSession");
}

export function insertBadge(_userId: string, _badgeId: string, _earnedAt: string): void {
  return notImplemented("insertBadge");
}

export function listBadges(_userId: string): { badge_id: string; earned_at: string }[] {
  return notImplemented("listBadges");
}
