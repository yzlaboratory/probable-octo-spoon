import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error — sibling .mjs ships no .d.ts.
import { runSeed } from "../../server/seed-admin.mjs";
// @ts-expect-error — sibling .mjs ships no .d.ts.
import { verifyPassword } from "../../server/auth.mjs";

function bootstrap() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const sql = fs.readFileSync(
    path.resolve(__dirname, "../../server/schema/001_init.sql"),
    "utf8",
  );
  db.exec(sql);
  return db;
}

class Buf {
  chunks: string[] = [];
  push(m: unknown) {
    this.chunks.push(String(m));
  }
  get text() {
    return this.chunks.join("\n");
  }
}

describe("seed-admin runSeed", () => {
  let db: any;
  let log: Buf;
  let err: Buf;
  beforeEach(() => {
    db = bootstrap();
    log = new Buf();
    err = new Buf();
  });

  function call(argv: string[]) {
    return runSeed({
      argv,
      log: (m: unknown) => log.push(m),
      error: (m: unknown) => err.push(m),
      openDbFn: () => db,
      dbPathFn: () => ":memory:",
    });
  }

  it("returns 1 with a usage hint when email or password is missing", async () => {
    expect(await call([])).toBe(1);
    expect(err.text).toContain("Usage: seed-admin");
    expect(await call(["only-email@example.org"])).toBe(1);
  });

  it("returns 2 when the password fails the policy check", async () => {
    const code = await call(["new@example.org", "short"]);
    expect(code).toBe(2);
    expect(err.text).toMatch(/12 Zeichen/);
  });

  it("creates a fresh admin (lowercased email) and stores a verifiable password hash", async () => {
    const code = await call(["NEW@Example.ORG", "correct horse battery staple !!"]);
    expect(code).toBe(0);
    expect(log.text).toContain("Created admin NEW@Example.ORG");

    const row = db
      .prepare("SELECT id, email, password_hash FROM admins WHERE email = ?")
      .get("new@example.org");
    expect(row).toBeTruthy();
    expect(await verifyPassword(row.password_hash, "correct horse battery staple !!")).toBe(true);
  });

  it("updates an existing admin in place and resets the lockout counters", async () => {
    // Pre-seed an existing admin with stale hash and a partial lockout state.
    const past = new Date().toISOString();
    db.prepare(
      "INSERT INTO admins (email, password_hash, failed_attempts, locked_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("existing@example.org", "stale-hash", 5, past, past, past);

    const code = await call([
      "Existing@Example.ORG",
      "fresh secret battery staple §§",
    ]);
    expect(code).toBe(0);
    expect(log.text).toContain("Updated admin Existing@Example.ORG");

    const row = db
      .prepare(
        "SELECT password_hash, failed_attempts, locked_until FROM admins WHERE email = ?",
      )
      .get("existing@example.org");
    expect(row.password_hash).not.toBe("stale-hash");
    expect(row.failed_attempts).toBe(0);
    expect(row.locked_until).toBeNull();
    expect(await verifyPassword(row.password_hash, "fresh secret battery staple §§")).toBe(true);
  });

  it("returns 3 and reports the underlying error when the DB layer throws", async () => {
    const broken = {
      prepare: () => {
        throw new Error("disk full");
      },
    };
    const code = await runSeed({
      argv: ["a@example.org", "correct horse battery staple !!"],
      log: (m: unknown) => log.push(m),
      error: (m: unknown) => err.push(m),
      openDbFn: () => broken,
      dbPathFn: () => ":memory:",
    });
    expect(code).toBe(3);
    expect(err.text).toContain("disk full");
  });
});
