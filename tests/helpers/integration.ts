// Shared integration-test helpers for server-route tests.
//
// Each route test under tests/unit/*-routes.test.ts used to re-implement
// these primitives (~50 LOC × 8 files). Consolidating them here means a
// schema migration or middleware tweak only needs to land in one place.
//
// All helpers operate against a real express + better-sqlite3 in-memory DB
// — the integration value is the behaviour, so nothing here should mock
// the DB or the route module under test.

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { fileURLToPath } from "node:url";
// @ts-expect-error — .mjs ships no .d.ts.
import authRoutes from "../../server/routes/auth.mjs";
// @ts-expect-error — .mjs ships no .d.ts.
import {
  sessionMiddleware,
  loginRateLimiter,
} from "../../server/middleware.mjs";
// @ts-expect-error — .mjs ships no .d.ts.
import { hashPassword, createSession } from "../../server/auth.mjs";

// We can't rely on __dirname under ESM; resolve relative to this file.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.resolve(HERE, "../../server/schema");

/** Apply every migration in lexical order so the test schema matches prod. */
export function bootstrap(): any {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const file of fs.readdirSync(SCHEMA_DIR).sort()) {
    if (!file.endsWith(".sql")) continue;
    db.exec(fs.readFileSync(path.join(SCHEMA_DIR, file), "utf8"));
  }
  return db;
}

/** Apply only 001_init.sql — for tests that don't touch later-added tables. */
export function bootstrapInitOnly(): any {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(
    fs.readFileSync(path.join(SCHEMA_DIR, "001_init.sql"), "utf8"),
  );
  return db;
}

/**
 * Reset the express-rate-limit module-level singleton so successive logins
 * across tests don't blow the 10/15min budget. Safe to call in beforeEach.
 */
export function resetLoginRateLimiter() {
  loginRateLimiter.resetKey?.("::ffff:127.0.0.1");
  loginRateLimiter.resetKey?.("127.0.0.1");
  loginRateLimiter.resetKey?.("::1");
}

/** Mount /api/auth plus any extra route module on a fresh express app. */
export function makeApp(
  db: any,
  mounts: Record<string, (db: any) => express.Router> = {},
): Express {
  const a = express();
  a.use(express.json());
  a.use(cookieParser());
  a.use(sessionMiddleware(db));
  a.use("/api/auth", authRoutes(db));
  for (const [prefix, factory] of Object.entries(mounts)) {
    a.use(prefix, factory(db));
  }
  return a;
}

export const STRONG_PW = "correct horse battery staple !!";
export const ADMIN_EMAIL = "admin@example.org";

/** Insert a fresh admin row and return its id. */
export async function seedAdmin(
  db: any,
  email: string = ADMIN_EMAIL,
  password: string = STRONG_PW,
): Promise<number> {
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  const info = db
    .prepare(
      "INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run(email, hash, now, now);
  return Number(info.lastInsertRowid);
}

export interface SeedMediaOpts {
  kind?: "news" | "sponsor" | "vorstand";
  variants?: Record<string, string>;
  originalPath?: string;
  filename?: string | null;
  uploadedBy?: number | null;
  uploadedAt?: string;
}

/** Insert a media row and return its id. Sensible defaults for variants etc. */
export function seedMedia(db: any, opts: SeedMediaOpts = {}): number {
  const kind = opts.kind ?? "news";
  const now = opts.uploadedAt ?? new Date().toISOString();
  const variants = opts.variants ?? { "400w": `/media/${kind}/x/400w.webp` };
  const info = db
    .prepare(
      `INSERT INTO media (kind, original_path, variants_json, mime_type, original_filename, uploaded_at, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      kind,
      opts.originalPath ?? "/tmp/x.webp",
      JSON.stringify(variants),
      "image/webp",
      opts.filename ?? null,
      now,
      opts.uploadedBy ?? null,
    );
  return Number(info.lastInsertRowid);
}

export interface AuthCookie {
  cookie: string;
  csrf: string;
}

/**
 * HTTP login flow. Returns the cookie+csrf pair you can pass to supertest
 * via .set('Cookie', auth.cookie) and .set('X-CSRF-Token', auth.csrf).
 *
 * Returns `null` on a non-200 response so tests can assert that bad
 * passwords / locked accounts cannot log in without crashing on the
 * missing Set-Cookie header.
 */
export async function login(
  srv: any,
  email: string = ADMIN_EMAIL,
  password: string = STRONG_PW,
): Promise<(AuthCookie & { body: any }) | null> {
  const res = await request(srv)
    .post("/api/auth/login")
    .send({ email, password });
  if (res.status !== 200) return null;
  const setCookie = res.headers["set-cookie"] as unknown as string[];
  const sid = setCookie
    .find((c) => c.startsWith("clubsoft_sid"))!
    .split(";")[0];
  const csrfCookie = setCookie
    .find((c) => c.startsWith("clubsoft_csrf"))!
    .split(";")[0];
  return {
    cookie: `${sid}; ${csrfCookie}`,
    csrf: res.body.csrfToken,
    body: res.body,
  };
}

/**
 * Forge a session row directly — bypasses the HTTP login + rate limiter.
 * Use this when a test would otherwise blow the 10/15min budget by logging
 * in many times in one file.
 */
export function sessionFor(db: any, adminId: number): AuthCookie {
  const { id, csrf } = createSession(db, adminId);
  return {
    cookie: `clubsoft_sid=${id}; clubsoft_csrf=${csrf}`,
    csrf,
  };
}
