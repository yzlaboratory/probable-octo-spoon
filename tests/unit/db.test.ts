import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import { openDb, dbPath, mediaRoot } from "../../server/db.mjs";

function tmpFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clubsoft-db-test-"));
  return { dir, file: path.join(dir, "app.db") };
}

describe("openDb", () => {
  let tmp: { dir: string; file: string };

  beforeEach(() => {
    tmp = tmpFile();
  });

  afterEach(() => {
    fs.rmSync(tmp.dir, { recursive: true, force: true });
  });

  it("creates the db file and applies the configured pragmas", () => {
    const db = openDb(tmp.file);
    try {
      expect(fs.existsSync(tmp.file)).toBe(true);
      expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(db.pragma("synchronous", { simple: true })).toBe(1); // NORMAL = 1
      expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    } finally {
      db.close();
    }
  });

  it("creates schema_migrations and records every shipped migration", () => {
    const db = openDb(tmp.file);
    try {
      const rows = db
        .prepare("SELECT name FROM schema_migrations ORDER BY name")
        .all()
        .map((r: { name: string }) => r.name);
      expect(rows.length).toBeGreaterThan(0);
      // Every migration we ship should have run.
      const schemaDir = path.resolve(__dirname, "../../server/schema");
      const expected = fs.readdirSync(schemaDir).filter((f) => f.endsWith(".sql")).sort();
      expect(rows).toEqual(expected);
    } finally {
      db.close();
    }
  });

  it("is idempotent — re-opening does not re-apply migrations or fail", () => {
    const a = openDb(tmp.file);
    const before = a
      .prepare("SELECT name, applied_at FROM schema_migrations ORDER BY name")
      .all() as Array<{ name: string; applied_at: string }>;
    a.close();

    const b = openDb(tmp.file);
    try {
      const after = b
        .prepare("SELECT name, applied_at FROM schema_migrations ORDER BY name")
        .all() as Array<{ name: string; applied_at: string }>;
      // Same rows — applied_at unchanged because the second open did not
      // re-run any migration.
      expect(after).toEqual(before);
    } finally {
      b.close();
    }
  });

  it("creates the core tables that downstream code expects", () => {
    const db = openDb(tmp.file);
    try {
      const names = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all()
        .map((r: { name: string }) => r.name);
      // Spot-check the tables shipped by 001/002/003/004; this guards
      // against an empty schema dir or skipped migration.
      for (const t of ["admins", "sessions", "media", "news", "sponsors", "vorstand", "training_slots"]) {
        expect(names).toContain(t);
      }
    } finally {
      db.close();
    }
  });
});

describe("dbPath", () => {
  const original = process.env.DB_PATH;
  afterEach(() => {
    if (original === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = original;
  });

  it("defaults to /var/lib/clubsoft/app.db when DB_PATH is unset", () => {
    delete process.env.DB_PATH;
    expect(dbPath()).toBe("/var/lib/clubsoft/app.db");
  });

  it("returns DB_PATH when set", () => {
    process.env.DB_PATH = "/tmp/custom.db";
    expect(dbPath()).toBe("/tmp/custom.db");
  });

  it("treats an empty DB_PATH as unset and falls back to the default", () => {
    process.env.DB_PATH = "";
    expect(dbPath()).toBe("/var/lib/clubsoft/app.db");
  });
});

describe("mediaRoot", () => {
  const original = process.env.MEDIA_ROOT;
  afterEach(() => {
    if (original === undefined) delete process.env.MEDIA_ROOT;
    else process.env.MEDIA_ROOT = original;
  });

  it("defaults to /var/lib/clubsoft/media when MEDIA_ROOT is unset", () => {
    delete process.env.MEDIA_ROOT;
    expect(mediaRoot()).toBe("/var/lib/clubsoft/media");
  });

  it("returns MEDIA_ROOT when set", () => {
    process.env.MEDIA_ROOT = "/tmp/custom-media";
    expect(mediaRoot()).toBe("/tmp/custom-media");
  });

  it("treats an empty MEDIA_ROOT as unset and falls back to the default", () => {
    process.env.MEDIA_ROOT = "";
    expect(mediaRoot()).toBe("/var/lib/clubsoft/media");
  });
});
