import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import authRoutes from "../../server/routes/auth.mjs";
// @ts-expect-error — .mjs with no types
import mediaRoutes from "../../server/routes/media.mjs";
// @ts-expect-error — .mjs with no types
import { sessionMiddleware } from "../../server/middleware.mjs";
// @ts-expect-error — .mjs with no types
import { hashPassword, createSession } from "../../server/auth.mjs";

// Redirect mediaRoot to a per-process temp dir so POST/DELETE don't touch the
// host filesystem. Must be set before importing media.mjs, which captures the
// mediaRoot function at module load.
const mediaTmp = fs.mkdtempSync(path.join(os.tmpdir(), "clubsoft-media-test-"));
process.env.MEDIA_ROOT = mediaTmp;

function app(db: any) {
  const a = express();
  a.use(express.json());
  a.use(cookieParser());
  a.use(sessionMiddleware(db));
  a.use("/api/auth", authRoutes(db));
  a.use("/api/media", mediaRoutes(db));
  return a;
}

function bootstrap() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  // Apply both the init schema and the Phase 3 filename migration, since the
  // list endpoint SELECTs original_filename.
  const schemaDir = path.resolve(__dirname, "../../server/schema");
  for (const file of fs.readdirSync(schemaDir).sort()) {
    if (!file.endsWith(".sql")) continue;
    db.exec(fs.readFileSync(path.join(schemaDir, file), "utf8"));
  }
  return db;
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

function seedMedia(
  db: any,
  opts: {
    kind?: "news" | "sponsor" | "vorstand";
    filename?: string | null;
    uploadedBy?: number | null;
    uploadedAt?: string;
    originalPath?: string;
  } = {},
) {
  const kind = opts.kind ?? "news";
  const now = opts.uploadedAt ?? new Date().toISOString();
  const original =
    opts.originalPath ??
    path.join(mediaTmp, kind, `seed-${now}`, "original.webp");
  const info = db
    .prepare(
      `INSERT INTO media (kind, original_path, variants_json, mime_type, original_filename, uploaded_at, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      kind,
      original,
      JSON.stringify({ "400w": `/media/${kind}/seed/400w.webp` }),
      "image/webp",
      opts.filename ?? null,
      now,
      opts.uploadedBy ?? null,
    );
  return Number(info.lastInsertRowid);
}

// Skip the HTTP login flow — express-rate-limit is a module-level singleton
// (10/15min) and would start rejecting around the 11th test. Directly forge a
// session row and craft matching cookies.
function sessionFor(db: any, adminId: number) {
  const { id, csrf } = createSession(db, adminId);
  const cookie = `clubsoft_sid=${id}; clubsoft_csrf=${csrf}`;
  return { cookie, csrf };
}

describe("media list + get", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    const adminId = await seedAdmin(
      db,
      "admin@example.org",
      "correct horse battery staple !!",
    );
    auth = sessionFor(db, adminId);
  });

  it("requires auth for GET /", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv).get("/api/media");
    expect(res.status).toBe(401);
  });

  it("returns empty list on empty DB", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv).get("/api/media").set("Cookie", auth.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns all media newest-first with filename and uploader email", async () => {
    const request = (await import("supertest")).default;
    const adminId = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get("admin@example.org").id;
    // Earlier timestamp first so we can assert ordering.
    seedMedia(db, {
      kind: "news",
      filename: "old.webp",
      uploadedBy: adminId,
      uploadedAt: "2024-01-01T00:00:00.000Z",
    });
    seedMedia(db, {
      kind: "sponsor",
      filename: "logo.svg",
      uploadedBy: adminId,
      uploadedAt: "2025-02-02T00:00:00.000Z",
    });

    const res = await request(srv).get("/api/media").set("Cookie", auth.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].filename).toBe("logo.svg");
    expect(res.body[0].kind).toBe("sponsor");
    expect(res.body[0].uploadedBy).toBe("admin@example.org");
    expect(res.body[1].filename).toBe("old.webp");
  });

  it("filters by kind when ?kind=sponsor", async () => {
    const request = (await import("supertest")).default;
    seedMedia(db, { kind: "news", filename: "a.webp" });
    seedMedia(db, { kind: "sponsor", filename: "b.svg" });
    seedMedia(db, { kind: "vorstand", filename: "c.webp" });

    const res = await request(srv)
      .get("/api/media?kind=sponsor")
      .set("Cookie", auth.cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].kind).toBe("sponsor");
  });

  it("rejects invalid kind filter", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .get("/api/media?kind=nope")
      .set("Cookie", auth.cookie);
    expect(res.status).toBe(400);
  });

  it("GET /:id returns filename + uploadedBy; 404 when missing", async () => {
    const request = (await import("supertest")).default;
    const adminId = db
      .prepare("SELECT id FROM admins WHERE email = ?")
      .get("admin@example.org").id;
    const id = seedMedia(db, {
      kind: "news",
      filename: "hero.webp",
      uploadedBy: adminId,
    });
    const found = await request(srv)
      .get(`/api/media/${id}`)
      .set("Cookie", auth.cookie);
    expect(found.status).toBe(200);
    expect(found.body.filename).toBe("hero.webp");
    expect(found.body.uploadedBy).toBe("admin@example.org");

    const missing = await request(srv)
      .get("/api/media/99999")
      .set("Cookie", auth.cookie);
    expect(missing.status).toBe(404);
  });

  it("rows predating the filename migration come back with filename: null", async () => {
    const request = (await import("supertest")).default;
    // Simulate a legacy row by inserting with original_filename NULL.
    const id = seedMedia(db, { kind: "news", filename: null });
    const res = await request(srv)
      .get(`/api/media/${id}`)
      .set("Cookie", auth.cookie);
    expect(res.status).toBe(200);
    expect(res.body.filename).toBeNull();
  });
});

describe("media delete", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };
  let dirsToCleanup: string[] = [];

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    const adminId = await seedAdmin(
      db,
      "admin@example.org",
      "correct horse battery staple !!",
    );
    auth = sessionFor(db, adminId);
    dirsToCleanup = [];
  });

  afterEach(() => {
    for (const d of dirsToCleanup) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  function seedWithDir(kind: "news" | "sponsor" | "vorstand" = "news") {
    const dir = fs.mkdtempSync(path.join(mediaTmp, `seed-${kind}-`));
    dirsToCleanup.push(dir);
    fs.writeFileSync(path.join(dir, "original.webp"), "xx");
    fs.writeFileSync(path.join(dir, "400w.webp"), "yy");
    const id = seedMedia(db, {
      kind,
      filename: "photo.webp",
      originalPath: path.join(dir, "original.webp"),
    });
    return { id, dir };
  }

  it("requires CSRF", async () => {
    const request = (await import("supertest")).default;
    const { id } = seedWithDir();
    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie);
    expect(res.status).toBe(403);
  });

  it("requires auth", async () => {
    const request = (await import("supertest")).default;
    const { id } = seedWithDir();
    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(401);
  });

  it("404 when id missing", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .delete("/api/media/99999")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(404);
  });

  it("400 when id is not numeric", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .delete("/api/media/not-a-number")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(400);
  });

  it("removes row + on-disk directory when unreferenced", async () => {
    const request = (await import("supertest")).default;
    const { id, dir } = seedWithDir();
    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(204);
    expect(
      db.prepare("SELECT id FROM media WHERE id = ?").get(id),
    ).toBeUndefined();
    expect(fs.existsSync(dir)).toBe(false);
  });

  it("409 when referenced by news.hero_media_id", async () => {
    const request = (await import("supertest")).default;
    const { id } = seedWithDir("news");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, hero_media_id, status, created_at, updated_at)
       VALUES ('n', 'Titel', 'Tag', 'short', '', ?, 'draft', ?, ?)`,
    ).run(id, now, now);

    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("in_use");
    expect(res.body.references).toHaveLength(1);
    expect(res.body.references[0].kind).toBe("news");
    expect(res.body.references[0].label).toBe("Titel");
    // Row stays put.
    expect(
      db.prepare("SELECT id FROM media WHERE id = ?").get(id),
    ).toBeDefined();
  });

  it("409 when referenced by sponsors.logo_media_id", async () => {
    const request = (await import("supertest")).default;
    const { id } = seedWithDir("sponsor");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO sponsors (name, link_url, logo_media_id, card_palette, weight, status, display_order, created_at, updated_at)
       VALUES ('Acme', 'https://acme.test', ?, 'transparent', 50, 'active', 1, ?, ?)`,
    ).run(id, now, now);

    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(409);
    expect(res.body.references[0].kind).toBe("sponsor");
    expect(res.body.references[0].label).toBe("Acme");
  });

  it("409 when referenced by vorstand.portrait_media_id", async () => {
    const request = (await import("supertest")).default;
    const { id } = seedWithDir("vorstand");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO vorstand (name, role, portrait_media_id, status, display_order, created_at, updated_at)
       VALUES ('Marta', 'Vorsitzende', ?, 'active', 1, ?, ?)`,
    ).run(id, now, now);

    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(409);
    expect(res.body.references[0].kind).toBe("vorstand");
  });

  it("collects references across all three tables", async () => {
    const request = (await import("supertest")).default;
    const { id } = seedWithDir("sponsor");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, hero_media_id, status, created_at, updated_at)
       VALUES ('a', 'A', 't', 's', '', ?, 'draft', ?, ?)`,
    ).run(id, now, now);
    db.prepare(
      `INSERT INTO sponsors (name, link_url, logo_media_id, card_palette, weight, status, display_order, created_at, updated_at)
       VALUES ('B', 'https://b.test', ?, 'transparent', 50, 'active', 1, ?, ?)`,
    ).run(id, now, now);

    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(409);
    expect(res.body.references).toHaveLength(2);
  });

  it("still returns 204 when the on-disk directory is already gone", async () => {
    const request = (await import("supertest")).default;
    const { id, dir } = seedWithDir();
    fs.rmSync(dir, { recursive: true, force: true });
    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(204);
    expect(
      db.prepare("SELECT id FROM media WHERE id = ?").get(id),
    ).toBeUndefined();
  });
});
