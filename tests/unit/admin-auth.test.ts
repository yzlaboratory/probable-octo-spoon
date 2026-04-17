import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import { validatePassword, hashPassword, attemptLogin, loadSession, destroySession, TIMINGS } from "../../server/auth.mjs";

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

async function seedAdmin(db: any, email: string, password: string) {
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
  ).run(email, hash, now, now);
}

describe("validatePassword", () => {
  it("rejects short passwords", () => {
    expect(validatePassword("short")).toMatch(/12 Zeichen/);
  });
  it("rejects blocklisted substrings case-insensitively", () => {
    expect(validatePassword("Alemannia-ThisIsLongEnough")).toMatch(/offensichtlich/);
    expect(validatePassword("MY-Password-Is-Here")).toMatch(/offensichtlich/);
  });
  it("accepts a strong password", () => {
    expect(validatePassword("correct horse battery staple !!")).toBeNull();
  });
});

describe("attemptLogin", () => {
  let db: any;
  beforeEach(async () => {
    db = bootstrap();
    await seedAdmin(db, "geschaeftsfuehrer@example.org", "correct horse battery staple !!");
  });

  it("succeeds with correct credentials and issues a session", async () => {
    const r = await attemptLogin(
      db,
      "geschaeftsfuehrer@example.org",
      "correct horse battery staple !!",
    );
    expect(r.ok).toBe(true);
    expect(r.session.id).toHaveLength(64);
    expect(r.session.csrf).toHaveLength(64);
  });

  it("rejects unknown email", async () => {
    const r = await attemptLogin(db, "nobody@example.org", "whatever");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid");
  });

  it("locks after the threshold and rejects further attempts with 'locked'", async () => {
    for (let i = 0; i < TIMINGS.LOCKOUT_THRESHOLD; i++) {
      // eslint-disable-next-line no-await-in-loop
      await attemptLogin(db, "geschaeftsfuehrer@example.org", "wrong-guess-1234");
    }
    const r = await attemptLogin(db, "geschaeftsfuehrer@example.org", "correct horse battery staple !!");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("locked");
  });
});

describe("session lifecycle", () => {
  it("loadSession returns null and deletes the row when absolute expiry has passed", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const login = await attemptLogin(db, "a@example.org", "correct horse battery staple !!");
    // Force absolute expiry into the past.
    const past = new Date(Date.now() - TIMINGS.ABSOLUTE_MS - 1000).toISOString();
    db.prepare("UPDATE sessions SET created_at = ?, last_seen = ? WHERE id = ?").run(
      past,
      past,
      login.session.id,
    );
    expect(loadSession(db, login.session.id)).toBeNull();
    const row = db.prepare("SELECT id FROM sessions WHERE id = ?").get(login.session.id);
    expect(row).toBeUndefined();
  });

  it("destroySession removes the row", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const login = await attemptLogin(db, "a@example.org", "correct horse battery staple !!");
    destroySession(db, login.session.id);
    expect(db.prepare("SELECT id FROM sessions WHERE id = ?").get(login.session.id)).toBeUndefined();
  });
});
