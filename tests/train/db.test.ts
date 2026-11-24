import { afterEach, describe, expect, it } from "vitest";
import { getDb, migrate, resetDbForTests } from "@/lib/db";

describe("SQLite migrations (implemented in the scaffold)", () => {
  afterEach(() => {
    resetDbForTests();
    delete process.env.DB_PATH;
  });

  it("migrate() is idempotent on an in-memory database", () => {
    process.env.DB_PATH = ":memory:";
    resetDbForTests();
    const db = getDb();
    migrate(db);
    migrate(db);
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "train_profiles",
        "train_blocks",
        "train_sessions",
        "train_sets",
        "train_badges",
      ]),
    );
  });
});
