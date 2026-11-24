import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DEFAULT_PATH = path.join(process.cwd(), "data", "pullups.db");

type GlobalDb = typeof globalThis & { __pullupsDb?: Database.Database };

export function dbPath(): string {
  return process.env.DB_PATH || DEFAULT_PATH;
}

/**
 * Open (or reuse) the SQLite connection and run migrations.
 * `DB_PATH=:memory:` is used in tests — those connections are not cached
 * across resetDbForTests().
 */
export function getDb(): Database.Database {
  const file = dbPath();
  if (file === ":memory:") {
    const g = globalThis as GlobalDb;
    if (!g.__pullupsDb) {
      const db = new Database(":memory:");
      configure(db);
      migrate(db);
      g.__pullupsDb = db;
    }
    return g.__pullupsDb;
  }

  const g = globalThis as GlobalDb;
  if (!g.__pullupsDb) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new Database(file);
    configure(db);
    migrate(db);
    g.__pullupsDb = db;
  }
  return g.__pullupsDb;
}

export function resetDbForTests(): void {
  const g = globalThis as GlobalDb;
  if (g.__pullupsDb) {
    g.__pullupsDb.close();
    delete g.__pullupsDb;
  }
}

function configure(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
}

/**
 * Idempotent schema. CREATE TABLE IF NOT EXISTS only — safe to run twice.
 * Tickets must not drop or rename these columns without a migration.
 */
export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS train_profiles (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT 'Athlete',
      has_bar INTEGER NOT NULL DEFAULT 1,
      bands TEXT NOT NULL DEFAULT 'none',
      has_weight INTEGER NOT NULL DEFAULT 0,
      has_rings INTEGER NOT NULL DEFAULT 0,
      body_kg REAL,
      pull_days TEXT NOT NULL DEFAULT '[1,4]',
      cross_days_per_week INTEGER NOT NULL DEFAULT 2,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS train_blocks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      start_date TEXT NOT NULL,
      pr_date TEXT NOT NULL,
      baseline_max INTEGER NOT NULL,
      current_max INTEGER NOT NULL,
      compressed INTEGER NOT NULL DEFAULT 0,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_train_blocks_user ON train_blocks(user_id, status);

    CREATE TABLE IF NOT EXISTS train_sessions (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      week_index INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      slot INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'planned',
      plan_json TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      rest_extensions INTEGER NOT NULL DEFAULT 0,
      warmup_skipped TEXT NOT NULL DEFAULT '[]',
      decision_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_train_sessions_user_date ON train_sessions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_train_sessions_block ON train_sessions(block_id, date);

    CREATE TABLE IF NOT EXISTS train_sets (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      phase TEXT NOT NULL,
      variation TEXT NOT NULL,
      added_kg REAL NOT NULL DEFAULT 0,
      target_reps INTEGER NOT NULL,
      rest_sec INTEGER NOT NULL,
      actual_reps INTEGER,
      rir INTEGER,
      quality INTEGER,
      rest_taken_sec INTEGER,
      companion_submission_id TEXT,
      verified_full_reps INTEGER,
      logged_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_train_sets_session ON train_sets(session_id, idx);

    CREATE TABLE IF NOT EXISTS train_badges (
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at TEXT NOT NULL,
      PRIMARY KEY (user_id, badge_id)
    );
  `);
}
