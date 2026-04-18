import argon2 from "argon2";
import crypto from "node:crypto";

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const PASSWORD_BLOCKLIST = new Set([
  "password",
  "passwort",
  "alemannia",
  "thalexweiler",
  "svthalexweiler",
  "svalemannia",
  "admin",
  "12345678",
  "123456789012",
]);

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const ABSOLUTE_MS = 24 * 60 * 60 * 1000;

export function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < 12) {
    return "Passwort muss mindestens 12 Zeichen lang sein.";
  }
  const lower = pw.toLowerCase();
  for (const banned of PASSWORD_BLOCKLIST) {
    if (lower.includes(banned)) {
      return "Dieses Passwort ist zu offensichtlich. Bitte wähle etwas anderes.";
    }
  }
  return null;
}

export async function hashPassword(pw) {
  return argon2.hash(pw, ARGON2_OPTIONS);
}

export async function verifyPassword(hash, pw) {
  try {
    return await argon2.verify(hash, pw);
  } catch {
    return false;
  }
}

function isLocked(row, now) {
  return row.locked_until && new Date(row.locked_until).getTime() > now;
}

export function registerFailedLogin(db, adminId) {
  const row = db.prepare("SELECT failed_attempts FROM admins WHERE id = ?").get(adminId);
  const attempts = (row?.failed_attempts ?? 0) + 1;
  const shouldLock = attempts >= LOCKOUT_THRESHOLD;
  const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_WINDOW_MS).toISOString() : null;
  db.prepare(
    "UPDATE admins SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?",
  ).run(attempts, lockedUntil, new Date().toISOString(), adminId);
  return { attempts, lockedUntil };
}

export function resetFailedLogin(db, adminId) {
  db.prepare(
    "UPDATE admins SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
  ).run(new Date().toISOString(), adminId);
}

export function lookupAdmin(db, email) {
  return db.prepare("SELECT * FROM admins WHERE email = ?").get(email);
}

export function createSession(db, adminId) {
  const id = crypto.randomBytes(32).toString("hex");
  const csrf = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  db.prepare(
    `INSERT INTO sessions (id, admin_id, csrf_token, created_at, last_seen, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    adminId,
    csrf,
    now.toISOString(),
    now.toISOString(),
    new Date(now.getTime() + ABSOLUTE_MS).toISOString(),
  );
  return { id, csrf };
}

export function loadSession(db, sessionId) {
  if (!sessionId) return null;
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!row) return null;
  const now = Date.now();
  const lastSeen = new Date(row.last_seen).getTime();
  const createdAt = new Date(row.created_at).getTime();
  if (now - lastSeen > IDLE_MS || now - createdAt > ABSOLUTE_MS) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }
  db.prepare("UPDATE sessions SET last_seen = ? WHERE id = ?").run(
    new Date(now).toISOString(),
    sessionId,
  );
  return row;
}

export function destroySession(db, sessionId) {
  if (!sessionId) return;
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function sweepExpiredSessions(db) {
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - IDLE_MS).toISOString();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ? OR last_seen <= ?").run(
    now.toISOString(),
    idleCutoff,
  );
}

export async function attemptLogin(db, email, password) {
  const admin = lookupAdmin(db, email);
  if (!admin) return { ok: false, reason: "invalid" };
  if (isLocked(admin, Date.now())) return { ok: false, reason: "locked" };
  const ok = await verifyPassword(admin.password_hash, password);
  if (!ok) {
    const { lockedUntil } = registerFailedLogin(db, admin.id);
    return { ok: false, reason: lockedUntil ? "locked" : "invalid" };
  }
  resetFailedLogin(db, admin.id);
  const session = createSession(db, admin.id);
  return { ok: true, admin, session };
}

export function createPasswordResetToken(db, adminId, ttlMs = 24 * 60 * 60 * 1000) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  db.prepare(
    `INSERT INTO password_resets (token, admin_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(token, adminId, new Date(now.getTime() + ttlMs).toISOString(), now.toISOString());
  return token;
}

export function consumePasswordResetToken(db, token, newPassword) {
  const row = db.prepare("SELECT * FROM password_resets WHERE token = ?").get(token);
  if (!row) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
  const policy = validatePassword(newPassword);
  if (policy) return { ok: false, reason: "policy", message: policy };
  return { ok: true, adminId: row.admin_id, row };
}

export function markResetUsed(db, token) {
  db.prepare("UPDATE password_resets SET used_at = ? WHERE token = ?").run(
    new Date().toISOString(),
    token,
  );
}

export const TIMINGS = { IDLE_MS, ABSOLUTE_MS, LOCKOUT_THRESHOLD, LOCKOUT_WINDOW_MS };
