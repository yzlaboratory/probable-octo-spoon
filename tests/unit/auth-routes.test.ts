import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import request from "supertest";
// @ts-expect-error — .mjs with no types
import authRoutes from "../../server/routes/auth.mjs";
// @ts-expect-error — .mjs with no types
import { sessionMiddleware, loginRateLimiter } from "../../server/middleware.mjs";
// @ts-expect-error — .mjs with no types
import {
  hashPassword,
  createPasswordResetToken,
  consumePasswordResetToken,
} from "../../server/auth.mjs";

// The login rate limiter is a module-level singleton — its counter persists
// between `beforeEach` runs, so we must reset its store per test or later
// logins start coming back as 429.
beforeEach(() => {
  loginRateLimiter.resetKey?.("::ffff:127.0.0.1");
  loginRateLimiter.resetKey?.("127.0.0.1");
  loginRateLimiter.resetKey?.("::1");
});

function bootstrap() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const schemaDir = path.resolve(__dirname, "../../server/schema");
  for (const file of fs.readdirSync(schemaDir).sort()) {
    if (!file.endsWith(".sql")) continue;
    db.exec(fs.readFileSync(path.join(schemaDir, file), "utf8"));
  }
  return db;
}

function app(db: any) {
  const a = express();
  a.use(express.json());
  a.use(cookieParser());
  a.use(sessionMiddleware(db));
  a.use("/api/auth", authRoutes(db));
  return a;
}

async function seedAdmin(db: any, email: string, password: string) {
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  const info = db
    .prepare(
      "INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run(email, hash, now, now);
  return Number(info.lastInsertRowid);
}

async function login(srv: any, email: string, password: string) {
  const res = await request(srv).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) return null;
  const setCookie = res.headers["set-cookie"] as unknown as string[];
  const sid = setCookie.find((c) => c.startsWith("clubsoft_sid"))!.split(";")[0];
  const csrfCookie = setCookie.find((c) => c.startsWith("clubsoft_csrf"))!.split(";")[0];
  const cookie = `${sid}; ${csrfCookie}`;
  return { cookie, csrf: res.body.csrfToken, body: res.body };
}

const STRONG_PW = "correct horse battery staple !!";
const ADMIN_EMAIL = "geschaeftsfuehrer@example.org";

describe("POST /api/auth/login", () => {
  let db: any;
  let srv: any;

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, ADMIN_EMAIL, STRONG_PW);
  });

  it("returns 400 for malformed body", async () => {
    const res = await request(srv).post("/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("bad_request");
  });

  it("issues session + csrf cookies and returns the admin shape", async () => {
    const r = await login(srv, ADMIN_EMAIL, STRONG_PW);
    expect(r).not.toBeNull();
    expect(r!.body.admin.email).toBe(ADMIN_EMAIL);
    expect(r!.body.csrfToken).toHaveLength(64);
    expect(r!.body.mustChangePassword).toBe(false);
  });

  it("returns 401 invalid_credentials on wrong password", async () => {
    const res = await request(srv)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "wrong-but-twelvechars" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("invalid_credentials");
  });

  it("returns 423 locked once threshold is exceeded", async () => {
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await request(srv)
        .post("/api/auth/login")
        .send({ email: ADMIN_EMAIL, password: "wrong-but-twelvechars" });
    }
    const res = await request(srv)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: STRONG_PW });
    expect(res.status).toBe(423);
    expect(res.body.code).toBe("locked");
  });

  it("surfaces mustChangePassword=true when set on the admin row", async () => {
    db.prepare("UPDATE admins SET must_change_password = 1 WHERE email = ?").run(ADMIN_EMAIL);
    const r = await login(srv, ADMIN_EMAIL, STRONG_PW);
    expect(r!.body.mustChangePassword).toBe(true);
  });
});

describe("POST /api/auth/logout", () => {
  let db: any;
  let srv: any;

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, ADMIN_EMAIL, STRONG_PW);
  });

  it("returns 401 without a session", async () => {
    const res = await request(srv).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });

  it("returns 403 when CSRF header is missing", async () => {
    const auth = await login(srv, ADMIN_EMAIL, STRONG_PW);
    const res = await request(srv)
      .post("/api/auth/logout")
      .set("cookie", auth!.cookie);
    expect(res.status).toBe(403);
  });

  it("returns 403 when the CSRF header has a different length than the cookie (covers timingSafeEq length-mismatch branch)", async () => {
    const auth = await login(srv, ADMIN_EMAIL, STRONG_PW);
    const res = await request(srv)
      .post("/api/auth/logout")
      .set("cookie", auth!.cookie)
      .set("x-csrf-token", "shorty"); // different length than the 64-char cookie
    expect(res.status).toBe(403);
  });

  it("clears cookies and deletes the session row on success", async () => {
    const auth = await login(srv, ADMIN_EMAIL, STRONG_PW);
    const before = db.prepare("SELECT COUNT(*) as n FROM sessions").get();
    expect(before.n).toBe(1);
    const res = await request(srv)
      .post("/api/auth/logout")
      .set("cookie", auth!.cookie)
      .set("x-csrf-token", auth!.csrf);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const after = db.prepare("SELECT COUNT(*) as n FROM sessions").get();
    expect(after.n).toBe(0);
  });
});

describe("GET /api/auth/me", () => {
  let db: any;
  let srv: any;

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, ADMIN_EMAIL, STRONG_PW);
  });

  it("returns 401 unauthenticated when there is no session", async () => {
    const res = await request(srv).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("unauthenticated");
  });

  it("returns the admin and csrf token when logged in", async () => {
    const auth = await login(srv, ADMIN_EMAIL, STRONG_PW);
    const res = await request(srv).get("/api/auth/me").set("cookie", auth!.cookie);
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe(ADMIN_EMAIL);
    expect(res.body.csrfToken).toHaveLength(64);
  });
});

describe("POST /api/auth/reset-link", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string; body: any };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, ADMIN_EMAIL, STRONG_PW);
    await seedAdmin(db, "kassier@example.org", STRONG_PW);
    auth = (await login(srv, ADMIN_EMAIL, STRONG_PW))!;
  });

  it("requires authentication", async () => {
    const res = await request(srv)
      .post("/api/auth/reset-link")
      .send({ email: "kassier@example.org" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed input", async () => {
    const res = await request(srv)
      .post("/api/auth/reset-link")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("bad_request");
  });

  it("returns 404 when target admin does not exist", async () => {
    const res = await request(srv)
      .post("/api/auth/reset-link")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ email: "ghost@example.org" });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("not_found");
  });

  it("returns a token on success and persists it", async () => {
    const res = await request(srv)
      .post("/api/auth/reset-link")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ email: "kassier@example.org" });
    expect(res.status).toBe(200);
    expect(res.body.token).toHaveLength(64);
    const row = db
      .prepare("SELECT admin_id FROM password_resets WHERE token = ?")
      .get(res.body.token);
    expect(row).toBeTruthy();
  });
});

describe("POST /api/auth/reset-consume", () => {
  let db: any;
  let srv: any;
  let targetId: number;

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    targetId = await seedAdmin(db, "kassier@example.org", STRONG_PW);
  });

  it("returns 400 for malformed input", async () => {
    const res = await request(srv)
      .post("/api/auth/reset-consume")
      .send({ token: "tooshort", newPassword: "alsotooshort" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("bad_request");
  });

  it("returns 400 invalid_token when the token does not exist", async () => {
    const res = await request(srv)
      .post("/api/auth/reset-consume")
      .send({ token: "x".repeat(64), newPassword: STRONG_PW });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid_token");
  });

  it("returns 422 password_policy when the new password is too obvious", async () => {
    const token = createPasswordResetToken(db, targetId);
    const res = await request(srv)
      .post("/api/auth/reset-consume")
      .send({ token, newPassword: "alemannia-thalexweiler-1" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("password_policy");
    expect(res.body.message).toMatch(/offensichtlich/);
  });

  it("rotates the password, marks the token used, and kills existing sessions", async () => {
    // Pre-existing session for the target admin.
    db.prepare(
      `INSERT INTO sessions (id, admin_id, csrf_token, created_at, last_seen, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      "stale-session-id",
      targetId,
      "csrf",
      new Date().toISOString(),
      new Date().toISOString(),
      new Date(Date.now() + 60_000).toISOString(),
    );

    const token = createPasswordResetToken(db, targetId);
    const newPw = "fresh secret battery staple §§";
    const res = await request(srv)
      .post("/api/auth/reset-consume")
      .send({ token, newPassword: newPw });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // Token marked used.
    const tokenRow = db
      .prepare("SELECT used_at FROM password_resets WHERE token = ?")
      .get(token);
    expect(tokenRow.used_at).toBeTruthy();

    // Existing sessions wiped.
    const sessions = db.prepare("SELECT COUNT(*) as n FROM sessions").get();
    expect(sessions.n).toBe(0);

    // Login with new password works; old does not.
    const ok = await login(srv, "kassier@example.org", newPw);
    expect(ok).not.toBeNull();
    const stale = await login(srv, "kassier@example.org", STRONG_PW);
    expect(stale).toBeNull();

    // Sanity: re-consuming the same token now fails.
    const used = consumePasswordResetToken(db, token, STRONG_PW);
    expect(used.ok).toBe(false);
  });
});

describe("POST /api/auth/admins (create admin)", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string; body: any };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, ADMIN_EMAIL, STRONG_PW);
    auth = (await login(srv, ADMIN_EMAIL, STRONG_PW))!;
  });

  it("requires authentication", async () => {
    const res = await request(srv)
      .post("/api/auth/admins")
      .send({ email: "new@example.org", password: STRONG_PW });
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed body", async () => {
    const res = await request(srv)
      .post("/api/auth/admins")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ email: "no-at-sign", password: STRONG_PW });
    expect(res.status).toBe(400);
  });

  it("returns 422 when password fails policy", async () => {
    const res = await request(srv)
      .post("/api/auth/admins")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ email: "new@example.org", password: "alemannia12345" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("password_policy");
  });

  it("returns 409 when the email is already taken", async () => {
    const res = await request(srv)
      .post("/api/auth/admins")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ email: ADMIN_EMAIL, password: STRONG_PW });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("already_exists");
  });

  it("creates the admin and returns 201 with id and lowercased email", async () => {
    const res = await request(srv)
      .post("/api/auth/admins")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ email: "Newcomer@Example.ORG", password: STRONG_PW, mustChangePassword: true });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("newcomer@example.org");
    expect(typeof res.body.id).toBe("number");

    const row = db
      .prepare("SELECT must_change_password FROM admins WHERE email = ?")
      .get("newcomer@example.org");
    expect(row.must_change_password).toBe(1);
  });
});

describe("GET /api/auth/admins", () => {
  let db: any;
  let srv: any;

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, "z@example.org", STRONG_PW);
    await seedAdmin(db, "a@example.org", STRONG_PW);
  });

  it("requires authentication", async () => {
    const res = await request(srv).get("/api/auth/admins");
    expect(res.status).toBe(401);
  });

  it("returns admins ordered by email", async () => {
    const auth = (await login(srv, "a@example.org", STRONG_PW))!;
    const res = await request(srv)
      .get("/api/auth/admins")
      .set("cookie", auth.cookie);
    expect(res.status).toBe(200);
    expect(res.body.map((r: any) => r.email)).toEqual(["a@example.org", "z@example.org"]);
    // Sensitive fields not leaked.
    for (const r of res.body) {
      expect(r.password_hash).toBeUndefined();
      expect(r.failed_attempts).toBeUndefined();
    }
  });
});
