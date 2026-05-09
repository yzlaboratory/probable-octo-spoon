import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import mediaRoutes from "../../server/routes/media.mjs";
import {
  bootstrap,
  makeApp,
  seedAdmin,
  seedMedia as seedMediaShared,
  sessionFor,
  type SeedMediaOpts,
} from "../helpers/integration";

// Redirect mediaRoot to a per-process temp dir so POST/DELETE don't touch the
// host filesystem. Must be set before importing media.mjs, which captures the
// mediaRoot function at module load.
const mediaTmp = fs.mkdtempSync(path.join(os.tmpdir(), "clubsoft-media-test-"));
process.env.MEDIA_ROOT = mediaTmp;

function app(db: any) {
  return makeApp(db, { "/api/media": mediaRoutes });
}

function seedMedia(db: any, opts: SeedMediaOpts = {}) {
  const kind = opts.kind ?? "news";
  const now = opts.uploadedAt ?? new Date().toISOString();
  return seedMediaShared(db, {
    ...opts,
    kind,
    uploadedAt: now,
    originalPath:
      opts.originalPath ?? path.join(mediaTmp, kind, `seed-${now}`, "original.webp"),
    variants: { "400w": `/media/${kind}/seed/400w.webp` },
  });
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

  it("collects references across all three tables (news + sponsor + vorstand)", async () => {
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
    db.prepare(
      `INSERT INTO vorstand (name, role, portrait_media_id, status, display_order, created_at, updated_at)
       VALUES ('C', 'Rolle', ?, 'active', 1, ?, ?)`,
    ).run(id, now, now);

    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(409);
    expect(res.body.references).toHaveLength(3);
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

  it("logs a console.error and still returns 204 when fs.rm rejects", async () => {
    const request = (await import("supertest")).default;
    const { id } = seedWithDir();
    const rmSpy = vi
      .spyOn(fs.promises, "rm")
      .mockRejectedValueOnce(new Error("EACCES: simulated"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(srv)
      .delete(`/api/media/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(204);
    expect(errSpy).toHaveBeenCalledWith(
      "media file cleanup failed:",
      expect.any(Error),
    );
    rmSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe("media upload (POST /)", () => {
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

  // Build a tiny in-memory PNG that sharp can resize. 1x1 red pixel.
  async function tinyPng(): Promise<Buffer> {
    const sharp = (await import("sharp")).default;
    return sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  }

  it("requires auth", async () => {
    const request = (await import("supertest")).default;
    const png = await tinyPng();
    const res = await request(srv)
      .post("/api/media")
      .field("kind", "news")
      .attach("file", png, { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(401);
  });

  it("requires CSRF", async () => {
    const request = (await import("supertest")).default;
    const png = await tinyPng();
    const res = await request(srv)
      .post("/api/media")
      .set("Cookie", auth.cookie)
      .field("kind", "news")
      .attach("file", png, { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(403);
  });

  it("rejects unknown kind values with 400", async () => {
    const request = (await import("supertest")).default;
    const png = await tinyPng();
    const res = await request(srv)
      .post("/api/media")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .field("kind", "bogus")
      .attach("file", png, { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("bad_request");
  });

  it("rejects when no file is attached", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/media")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .field("kind", "news");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Datei/);
  });

  it("rejects oversize uploads with 413", async () => {
    const request = (await import("supertest")).default;
    // Sponsor max is 2 MiB — feed a 3 MiB blob disguised as a png.
    const big = Buffer.alloc(3 * 1024 * 1024, 0xff);
    const res = await request(srv)
      .post("/api/media")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .field("kind", "sponsor")
      .attach("file", big, { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe("too_large");
  });

  it("rejects unsupported mime types with 415", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/media")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .field("kind", "news")
      .attach("file", Buffer.from("PDF stuff"), {
        filename: "x.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(415);
    expect(res.body.code).toBe("unsupported_type");
  });

  it("uploads a news PNG and emits 400/800/1600 webp variants + fallback JPG", async () => {
    const request = (await import("supertest")).default;
    const png = await tinyPng();
    const res = await request(srv)
      .post("/api/media")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .field("kind", "news")
      .attach("file", png, { filename: "hero.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("news");
    expect(res.body.filename).toBe("hero.png");
    expect(res.body.uploadedBy).toBe("admin@example.org");
    expect(Object.keys(res.body.variants).sort()).toEqual([
      "1600w",
      "400w",
      "800w",
      "fallbackJpg",
    ]);
    // Files actually exist under the redirected mediaRoot.
    const variantUrl = res.body.variants["400w"] as string;
    const onDisk = path.join(mediaTmp, variantUrl.replace(/^\/media\//, ""));
    expect(fs.existsSync(onDisk)).toBe(true);
  });

  it("uploads a sponsor SVG and stores the sanitised file under variants.svg", async () => {
    const request = (await import("supertest")).default;
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>',
    );
    const res = await request(srv)
      .post("/api/media")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .field("kind", "sponsor")
      .attach("file", svg, { filename: "logo.svg", contentType: "image/svg+xml" });
    expect(res.status).toBe(201);
    expect(res.body.variants).toEqual({
      svg: expect.stringMatching(/\/media\/sponsors\/.+\/original\.svg$/),
    });
    const onDisk = path.join(
      mediaTmp,
      (res.body.variants.svg as string).replace(/^\/media\//, ""),
    );
    expect(fs.existsSync(onDisk)).toBe(true);
  });

  it("uploads a vorstand PNG and emits 160/320/640 webp variants (no fallbackJpg)", async () => {
    const request = (await import("supertest")).default;
    const png = await tinyPng();
    const res = await request(srv)
      .post("/api/media")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .field("kind", "vorstand")
      .attach("file", png, { filename: "anna.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(Object.keys(res.body.variants).sort()).toEqual(["160w", "320w", "640w"]);
    expect(res.body.variants).not.toHaveProperty("fallbackJpg");
  });

});
