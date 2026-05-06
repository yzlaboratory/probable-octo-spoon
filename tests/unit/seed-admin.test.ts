import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
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

  it("falls back to process.stdout/stderr writes when log/error are not provided", async () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    try {
      // Missing-arg path → goes through default `error` writer.
      const missCode = await runSeed({
        argv: [],
        openDbFn: () => db,
        dbPathFn: () => ":memory:",
      });
      expect(missCode).toBe(1);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining("Usage: seed-admin"),
      );

      // Happy-path → goes through default `log` writer.
      const okCode = await runSeed({
        argv: ["default-writer@example.org", "correct horse battery staple ::"],
        openDbFn: () => db,
        dbPathFn: () => ":memory:",
      });
      expect(okCode).toBe(0);
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining("Created admin default-writer@example.org"),
      );
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});

describe("seed-admin script entrypoint (auto-run when invoked directly)", () => {
  it("creates an admin row when run as `node server/seed-admin.mjs <email> <password>` and exits 0", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "seed-admin-test-"));
    const dbFile = path.join(tmp, "app.db");
    try {
      const result = spawnSync(
        process.execPath,
        [
          path.resolve(__dirname, "../../server/seed-admin.mjs"),
          "auto-run@example.org",
          "correct horse battery staple !!",
        ],
        {
          env: { ...process.env, DB_PATH: dbFile },
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Created admin auto-run@example.org");

      // Confirm the row landed in the spawned DB.
      const verify = new Database(dbFile);
      const row = verify
        .prepare("SELECT email FROM admins WHERE email = ?")
        .get("auto-run@example.org") as { email: string } | undefined;
      verify.close();
      expect(row?.email).toBe("auto-run@example.org");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
