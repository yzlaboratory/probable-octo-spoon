import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import {
  validatePassword,
  hashPassword,
  verifyPassword,
  attemptLogin,
  loadSession,
  destroySession,
  sweepExpiredSessions,
  createSession,
  createPasswordResetToken,
  consumePasswordResetToken,
  markResetUsed,
  TIMINGS,
} from "../../server/auth.mjs";

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

  it("destroySession is a no-op when sessionId is missing", () => {
    const db = bootstrap();
    expect(() => destroySession(db, undefined)).not.toThrow();
    expect(() => destroySession(db, null)).not.toThrow();
    expect(() => destroySession(db, "")).not.toThrow();
  });

  it("loadSession returns null when sessionId is falsy without touching the DB", () => {
    const db = bootstrap();
    expect(loadSession(db, null)).toBeNull();
    expect(loadSession(db, "")).toBeNull();
    expect(loadSession(db, undefined)).toBeNull();
  });

  it("loadSession returns null when the session id does not exist", () => {
    const db = bootstrap();
    expect(loadSession(db, "ghost")).toBeNull();
  });

  it("loadSession deletes idle sessions and returns null", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const login = await attemptLogin(db, "a@example.org", "correct horse battery staple !!");
    const idlePast = new Date(Date.now() - TIMINGS.IDLE_MS - 1000).toISOString();
    db.prepare("UPDATE sessions SET last_seen = ? WHERE id = ?").run(idlePast, login.session.id);
    expect(loadSession(db, login.session.id)).toBeNull();
    expect(
      db.prepare("SELECT id FROM sessions WHERE id = ?").get(login.session.id),
    ).toBeUndefined();
  });

  it("loadSession returns the row and bumps last_seen on a healthy session", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const login = await attemptLogin(db, "a@example.org", "correct horse battery staple !!");
    // Force last_seen back so the bump is observable regardless of clock granularity.
    const earlier = new Date(Date.now() - 5_000).toISOString();
    db.prepare("UPDATE sessions SET last_seen = ? WHERE id = ?").run(
      earlier,
      login.session.id,
    );
    const row = loadSession(db, login.session.id);
    expect(row).toBeTruthy();
    const after = db
      .prepare("SELECT last_seen FROM sessions WHERE id = ?")
      .get(login.session.id).last_seen;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(earlier).getTime());
  });
});

describe("sweepExpiredSessions", () => {
  it("removes sessions past their absolute expiry and idle ones, keeps fresh", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const fresh = createSession(db, 1);
    const idle = createSession(db, 1);
    const expired = createSession(db, 1);
    const idlePast = new Date(Date.now() - TIMINGS.IDLE_MS - 1000).toISOString();
    db.prepare("UPDATE sessions SET last_seen = ? WHERE id = ?").run(idlePast, idle.id);
    db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(idlePast, expired.id);

    sweepExpiredSessions(db);

    const remaining = db.prepare("SELECT id FROM sessions").all().map((r: any) => r.id);
    expect(remaining).toContain(fresh.id);
    expect(remaining).not.toContain(idle.id);
    expect(remaining).not.toContain(expired.id);
  });
});

describe("verifyPassword", () => {
  it("returns true for the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple !!");
    expect(await verifyPassword(hash, "correct horse battery staple !!")).toBe(true);
  });

  it("returns false for a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple !!");
    expect(await verifyPassword(hash, "definitely wrong password §§")).toBe(false);
  });

  it("returns false when the hash is malformed (argon2 throws)", async () => {
    expect(await verifyPassword("not-an-argon2-hash", "anything")).toBe(false);
  });
});

describe("password reset token lifecycle", () => {
  it("createPasswordResetToken stores a 64-hex token tied to the admin", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const adminId = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get("a@example.org").id;
    const token = createPasswordResetToken(db, adminId);
    expect(token).toHaveLength(64);
    const row = db
      .prepare("SELECT admin_id, used_at FROM password_resets WHERE token = ?")
      .get(token);
    expect(row.admin_id).toBe(adminId);
    expect(row.used_at).toBeNull();
  });

  it("consumePasswordResetToken: returns invalid for unknown tokens", () => {
    const db = bootstrap();
    const r = consumePasswordResetToken(db, "x".repeat(64), "fresh secret battery staple §§");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid");
  });

  it("consumePasswordResetToken: returns 'used' once the token has been consumed", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const adminId = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get("a@example.org").id;
    const token = createPasswordResetToken(db, adminId);
    markResetUsed(db, token);
    const r = consumePasswordResetToken(db, token, "fresh secret battery staple §§");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("used");
  });

  it("consumePasswordResetToken: returns 'expired' when the ttl has passed", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const adminId = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get("a@example.org").id;
    // Negative ttl pushes expires_at into the past on insert.
    const token = createPasswordResetToken(db, adminId, -1000);
    const r = consumePasswordResetToken(db, token, "fresh secret battery staple §§");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("expired");
  });

  it("consumePasswordResetToken: returns 'policy' when the new password is too obvious", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const adminId = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get("a@example.org").id;
    const token = createPasswordResetToken(db, adminId);
    const r = consumePasswordResetToken(db, token, "alemannia-thalexweiler-1");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("policy");
    expect(r.message).toMatch(/offensichtlich/);
  });

  it("consumePasswordResetToken: ok=true with adminId on the happy path", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const adminId = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get("a@example.org").id;
    const token = createPasswordResetToken(db, adminId);
    const r = consumePasswordResetToken(db, token, "fresh secret battery staple §§");
    expect(r.ok).toBe(true);
    expect(r.adminId).toBe(adminId);
  });

  it("markResetUsed stamps used_at on the token", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const adminId = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get("a@example.org").id;
    const token = createPasswordResetToken(db, adminId);
    markResetUsed(db, token);
    const row = db
      .prepare("SELECT used_at FROM password_resets WHERE token = ?")
      .get(token);
    expect(row.used_at).toBeTruthy();
  });
});

describe("attemptLogin lockout edge cases", () => {
  it("returns reason='locked' when the admin is already inside the lock window", async () => {
    const db = bootstrap();
    await seedAdmin(db, "a@example.org", "correct horse battery staple !!");
    const future = new Date(Date.now() + 60_000).toISOString();
    db.prepare("UPDATE admins SET locked_until = ?, failed_attempts = ? WHERE email = ?").run(
      future,
      TIMINGS.LOCKOUT_THRESHOLD,
      "a@example.org",
    );
    const r = await attemptLogin(db, "a@example.org", "correct horse battery staple !!");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("locked");
  });
});
