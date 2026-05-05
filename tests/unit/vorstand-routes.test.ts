import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import authRoutes from "../../server/routes/auth.mjs";
// @ts-expect-error — .mjs with no types
import vorstandRoutes from "../../server/routes/vorstand.mjs";
// @ts-expect-error — .mjs with no types
import { sessionMiddleware, loginRateLimiter } from "../../server/middleware.mjs";
// @ts-expect-error — .mjs with no types
import { hashPassword, createSession } from "../../server/auth.mjs";

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
  a.use("/api/vorstand", vorstandRoutes(db));
  return a;
}

async function seedAdmin(db: any) {
  const hash = await hashPassword("correct horse battery staple !!");
  const now = new Date().toISOString();
  const info = db
    .prepare(
      "INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
    )
    .run("admin@example.org", hash, now, now);
  return Number(info.lastInsertRowid);
}

function sessionFor(db: any, adminId: number) {
  const { id, csrf } = createSession(db, adminId);
  const cookie = `clubsoft_sid=${id}; clubsoft_csrf=${csrf}`;
  return { cookie, csrf };
}

function seedMedia(
  db: any,
  variants: Record<string, string> = { "320w": "/m/x/320w.webp" },
) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO media (kind, original_path, variants_json, mime_type, original_filename, uploaded_at)
       VALUES ('vorstand', '/tmp/x.webp', ?, 'image/webp', 'p.webp', ?)`,
    )
    .run(JSON.stringify(variants), now);
  return Number(info.lastInsertRowid);
}

const VALID = {
  name: "Anna Vorsitz",
  role: "1. Vorsitzende",
  email: "anna@example.org",
  phone: "0151",
  notes: "Erstkontakt",
  status: "active",
};

describe("vorstand list / get", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    const adminId = await seedAdmin(db);
    auth = sessionFor(db, adminId);
  });

  it("GET / requires auth", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv).get("/api/vorstand");
    expect(res.status).toBe(401);
  });

  it("GET / returns all members regardless of status by default", async () => {
    const request = (await import("supertest")).default;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO vorstand (name, role, status, display_order, created_at, updated_at)
       VALUES (?, ?, 'active', 1, ?, ?), (?, ?, 'archived', 2, ?, ?)`,
    ).run("A", "Rolle", now, now, "Z", "Rolle", now, now);

    const res = await request(srv).get("/api/vorstand").set("Cookie", auth.cookie);
    expect(res.status).toBe(200);
    expect(res.body.map((r: any) => r.name)).toEqual(["A", "Z"]);
  });

  it("GET /?status=archived filters by status", async () => {
    const request = (await import("supertest")).default;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO vorstand (name, role, status, display_order, created_at, updated_at)
       VALUES (?, ?, 'active', 1, ?, ?), (?, ?, 'archived', 2, ?, ?)`,
    ).run("A", "Rolle", now, now, "Z", "Rolle", now, now);
    const res = await request(srv)
      .get("/api/vorstand?status=archived")
      .set("Cookie", auth.cookie);
    expect(res.body.map((r: any) => r.name)).toEqual(["Z"]);
  });

  it("GET /?status=garbage falls back to all (status not in allow-list)", async () => {
    const request = (await import("supertest")).default;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO vorstand (name, role, status, display_order, created_at, updated_at)
       VALUES (?, ?, 'active', 1, ?, ?)`,
    ).run("A", "Rolle", now, now);
    const res = await request(srv)
      .get("/api/vorstand?status=nope")
      .set("Cookie", auth.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /public only exposes active members and inlines portrait media", async () => {
    const request = (await import("supertest")).default;
    const mediaId = seedMedia(db, { "320w": "/m/anna/320w.webp" });
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO vorstand (name, role, portrait_media_id, status, display_order, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 1, ?, ?), (?, ?, NULL, 'archived', 2, ?, ?)`,
    ).run("Anna", "Rolle", mediaId, now, now, "Bert", "Rolle", now, now);

    const res = await request(srv).get("/api/vorstand/public");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Anna");
    expect(res.body[0].portrait?.id).toBe(mediaId);
    expect(res.body[0].portrait?.variants).toEqual({ "320w": "/m/anna/320w.webp" });
  });

  it("GET /public returns null portrait when the media row was deleted", async () => {
    const request = (await import("supertest")).default;
    // Reference a non-existent media id by skipping FK insert.
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO vorstand (name, role, portrait_media_id, status, display_order, created_at, updated_at)
       VALUES (?, ?, NULL, 'active', 1, ?, ?)`,
    ).run("NoPic", "Rolle", now, now);
    const res = await request(srv).get("/api/vorstand/public");
    expect(res.body[0].portrait).toBeNull();
  });
});

describe("vorstand create", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    const adminId = await seedAdmin(db);
    auth = sessionFor(db, adminId);
  });

  it("requires auth", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv).post("/api/vorstand").send(VALID);
    expect(res.status).toBe(401);
  });

  it("requires CSRF", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/vorstand")
      .set("Cookie", auth.cookie)
      .send(VALID);
    expect(res.status).toBe(403);
  });

  it("rejects malformed bodies with 400 and field errors", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/vorstand")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ name: "", role: "", status: "active" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("bad_request");
    expect(res.body.fields).toBeDefined();
  });

  it("creates a row with defaults applied (display_order = max + 1, optional fields nullable)", async () => {
    const request = (await import("supertest")).default;
    const a = await request(srv)
      .post("/api/vorstand")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ name: "Erste", role: "Rolle", status: "active" });
    expect(a.status).toBe(201);
    expect(a.body.email).toBeNull();
    expect(a.body.phone).toBeNull();
    expect(a.body.notes).toBeNull();
    expect(a.body.displayOrder).toBe(1);

    const b = await request(srv)
      .post("/api/vorstand")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ ...VALID, name: "Zweite" });
    expect(b.body.displayOrder).toBe(2);
  });
});

describe("vorstand patch", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };
  let id: number;

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    const adminId = await seedAdmin(db);
    auth = sessionFor(db, adminId);
    const request = (await import("supertest")).default;
    const r = await request(srv)
      .post("/api/vorstand")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(VALID);
    id = r.body.id;
  });

  it("404s on unknown id", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .patch("/api/vorstand/999999")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ role: "Neu" });
    expect(res.status).toBe(404);
  });

  it("rejects malformed payloads with 400", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .patch(`/api/vorstand/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ status: "not-a-status" });
    expect(res.status).toBe(400);
  });

  it("updates the row, preserving fields not present in the body", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .patch(`/api/vorstand/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ role: "Geändert" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("Geändert");
    expect(res.body.name).toBe(VALID.name); // preserved
  });

  it("explicit null fields are persisted (email, phone, portrait, notes)", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .patch(`/api/vorstand/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ email: null, phone: null, portraitMediaId: null, notes: null });
    expect(res.status).toBe(200);
    expect(res.body.email).toBeNull();
    expect(res.body.phone).toBeNull();
    expect(res.body.notes).toBeNull();
    expect(res.body.portrait).toBeNull();
  });

  it("setting a portraitMediaId surfaces the media payload on the response", async () => {
    const request = (await import("supertest")).default;
    const m = seedMedia(db, { "320w": "/m/anna/320w.webp" });
    const res = await request(srv)
      .patch(`/api/vorstand/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ portraitMediaId: m });
    expect(res.body.portrait?.id).toBe(m);
  });
});

describe("vorstand delete", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };
  let id: number;

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    const adminId = await seedAdmin(db);
    auth = sessionFor(db, adminId);
    const request = (await import("supertest")).default;
    const r = await request(srv)
      .post("/api/vorstand")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(VALID);
    id = r.body.id;
  });

  it("404s on unknown id", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .delete("/api/vorstand/9999999")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(404);
  });

  it("409s when the member is not archived", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .delete(`/api/vorstand/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("not_archived");
  });

  it("hard-deletes once the member is archived", async () => {
    const request = (await import("supertest")).default;
    await request(srv)
      .patch(`/api/vorstand/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ status: "archived" });
    const res = await request(srv)
      .delete(`/api/vorstand/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(
      db.prepare("SELECT id FROM vorstand WHERE id = ?").get(id),
    ).toBeUndefined();
  });
});

describe("vorstand reorder edge cases", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    const adminId = await seedAdmin(db);
    auth = sessionFor(db, adminId);
  });

  it("rejects malformed payloads (empty orderedIds, wrong types)", async () => {
    const request = (await import("supertest")).default;
    const empty = await request(srv)
      .post("/api/vorstand/reorder")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ orderedIds: [] });
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe("bad_request");

    const wrongType = await request(srv)
      .post("/api/vorstand/reorder")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ orderedIds: ["not", "numbers"] });
    expect(wrongType.status).toBe(400);
  });
});
