import { describe, it, expect, beforeEach } from "vitest";
// @ts-expect-error — .mjs with no types
import newsRoutes, { runPublishTick } from "../../server/routes/news.mjs";
// @ts-expect-error — .mjs with no types
import sponsorRoutes from "../../server/routes/sponsors.mjs";
// @ts-expect-error — .mjs with no types
import vorstandRoutes from "../../server/routes/vorstand.mjs";
import {
  bootstrap,
  login,
  makeApp,
  resetLoginRateLimiter,
  seedAdmin,
  seedMedia as seedMediaShared,
} from "../helpers/integration";

beforeEach(resetLoginRateLimiter);

function app(db: any) {
  return makeApp(db, {
    "/api/news": newsRoutes,
    "/api/sponsors": sponsorRoutes,
    "/api/vorstand": vorstandRoutes,
  });
}

function seedMedia(
  db: any,
  kind: "news" | "sponsor" | "vorstand" = "news",
) {
  return seedMediaShared(db, {
    kind,
    variants: { "400w": "/media/x/400w.webp" },
  });
}

describe("news crud", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, "admin@example.org", "correct horse battery staple !!");
    auth = (await login(srv, "admin@example.org", "correct horse battery staple !!"))!;
  });

  it("creates, lists, patches, soft-deletes, hard-deletes", async () => {
    const request = (await import("supertest")).default;
    const heroId = seedMedia(db, "news");

    const created = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "Jugendturnier",
        tag: "Event",
        short: "Wir laden ein.",
        blocks: [{ kind: "paragraph", text: "Kommt vorbei!" }],
        heroMediaId: heroId,
        status: "published",
      });
    expect(created.status).toBe(201);
    expect(created.body.slug).toBe("jugendturnier");
    expect(created.body.blocks).toEqual([
      { kind: "paragraph", text: "Kommt vorbei!" },
    ]);
    expect(created.body.longHtml).toBe("<p>Kommt vorbei!</p>");

    const list = await request(srv).get("/api/news").set("Cookie", auth.cookie);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    const pub = await request(srv).get("/api/news/public");
    expect(pub.body).toHaveLength(1);

    const patched = await request(srv)
      .patch(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ title: "Jugendturnier (Update)", status: "withdrawn" });
    expect(patched.status).toBe(200);
    expect(patched.body.title).toMatch(/Update/);
    expect(patched.body.status).toBe("withdrawn");

    // Withdrawn should be hidden from public.
    const pub2 = await request(srv).get("/api/news/public");
    expect(pub2.body).toHaveLength(0);

    const softDel = await request(srv)
      .delete(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(softDel.body.hard).toBe(false);

    const hardDel = await request(srv)
      .delete(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(hardDel.body.hard).toBe(true);
  });

  it("rejects write without CSRF token", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .send({ title: "x", tag: "x", short: "x", status: "draft" });
    expect(res.status).toBe(403);
  });

  it("rejects write without session", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/news")
      .set("x-csrf-token", auth.csrf)
      .send({ title: "x", tag: "x", short: "x", status: "draft" });
    expect(res.status).toBe(401);
  });

  it("round-trips a mixed-block article and recompiles html on edit", async () => {
    const request = (await import("supertest")).default;
    const heroId = seedMedia(db, "news");
    const created = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "Kreisligaderby",
        tag: "Fußball",
        short: "Später Siegtreffer.",
        blocks: [
          { kind: "heading", level: 2, text: "Doppelschlag" },
          { kind: "paragraph", text: "Nach 0:1 dreht die Erste." },
          { kind: "quote", text: "Wir bleiben dran.", attr: "Trainer" },
          { kind: "image", mediaId: heroId, caption: "Jubel", credit: "" },
          { kind: "callout", tone: "accent", text: "Heimspiel Samstag." },
        ],
        status: "published",
      });
    expect(created.status).toBe(201);
    expect(created.body.blocks).toHaveLength(5);
    expect(created.body.longHtml).toMatch(/<h2>Doppelschlag<\/h2>/);
    expect(created.body.longHtml).toMatch(/<blockquote>.*<cite>Trainer<\/cite>/);
    expect(created.body.longHtml).toMatch(/<aside class="callout callout-accent"/);
    expect(created.body.longHtml).toMatch(/<figure><img/);

    const patched = await request(srv)
      .patch(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        blocks: [{ kind: "paragraph", text: "Kurzfassung." }],
      });
    expect(patched.status).toBe(200);
    expect(patched.body.blocks).toEqual([
      { kind: "paragraph", text: "Kurzfassung." },
    ]);
    expect(patched.body.longHtml).toBe("<p>Kurzfassung.</p>");
  });

  it("escapes script tags smuggled inside block text", async () => {
    const request = (await import("supertest")).default;
    const created = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "XSS test",
        tag: "x",
        short: "x",
        blocks: [
          { kind: "paragraph", text: "<script>alert(1)</script>" },
          { kind: "heading", level: 2, text: "<img src=x onerror=alert(1)>" },
        ],
        status: "draft",
      });
    expect(created.status).toBe(201);
    // No live script or img tags — just escaped text.
    expect(created.body.longHtml).not.toMatch(/<script/i);
    expect(created.body.longHtml).not.toMatch(/<img\b/i);
    expect(created.body.longHtml).toContain("&lt;script&gt;");
    expect(created.body.longHtml).toContain("&lt;img");
  });

  it("rejects invalid block payloads with 400", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "t",
        tag: "t",
        short: "s",
        blocks: [{ kind: "video", url: "nope" }],
        status: "draft",
      });
    expect(res.status).toBe(400);
  });

  it("preserves long_html when editing metadata without sending blocks", async () => {
    const request = (await import("supertest")).default;
    const created = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "Original",
        tag: "t",
        short: "s",
        blocks: [{ kind: "paragraph", text: "body" }],
        status: "draft",
      });
    const before = created.body.longHtml;
    const patched = await request(srv)
      .patch(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ title: "Neuer Titel" });
    expect(patched.body.longHtml).toBe(before);
    expect(patched.body.blocks).toEqual([
      { kind: "paragraph", text: "body" },
    ]);
  });
});

describe("sponsor crud", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, "admin@example.org", "correct horse battery staple !!");
    auth = (await login(srv, "admin@example.org", "correct horse battery staple !!"))!;
  });

  it("creates with palette + active flag, blocks unarchived hard delete", async () => {
    const request = (await import("supertest")).default;
    const logo = seedMedia(db, "sponsor");
    const created = await request(srv)
      .post("/api/sponsors")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        name: "Acme",
        linkUrl: "https://acme.test",
        logoMediaId: logo,
        cardPalette: "purple",
        weight: 50,
        status: "active",
      });
    expect(created.status).toBe(201);

    const refuseDel = await request(srv)
      .delete(`/api/sponsors/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(refuseDel.status).toBe(409);

    // Archive, then hard-delete.
    await request(srv)
      .patch(`/api/sponsors/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ status: "archived" });
    const okDel = await request(srv)
      .delete(`/api/sponsors/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(okDel.status).toBe(200);
  });
});

describe("news edge cases", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, "admin@example.org", "correct horse battery staple !!");
    auth = (await login(srv, "admin@example.org", "correct horse battery staple !!"))!;
  });

  it("GET / filters by status when ?status=draft is provided", async () => {
    const request = (await import("supertest")).default;
    await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ title: "DraftOne", tag: "t", short: "s", status: "draft" });
    await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ title: "PubOne", tag: "t", short: "s", status: "published" });
    const res = await request(srv)
      .get("/api/news?status=draft")
      .set("Cookie", auth.cookie);
    expect(res.status).toBe(200);
    expect(res.body.every((n: any) => n.status === "draft")).toBe(true);
    expect(res.body.find((n: any) => n.title === "DraftOne")).toBeTruthy();
    expect(res.body.find((n: any) => n.title === "PubOne")).toBeUndefined();
  });

  it("POST honours an explicit slug and dedupes on collision", async () => {
    const request = (await import("supertest")).default;
    const a = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "Erste",
        slug: "fixed-slug",
        tag: "t",
        short: "s",
        status: "draft",
      });
    expect(a.body.slug).toBe("fixed-slug");

    const b = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "Zweite",
        slug: "fixed-slug",
        tag: "t",
        short: "s",
        status: "draft",
      });
    expect(b.body.slug).toBe("fixed-slug-2");
  });

  it("POST with status=scheduled and an explicit publishAt persists publish_at", async () => {
    const request = (await import("supertest")).default;
    const at = "2099-12-31T10:00:00.000Z";
    const res = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "Geplant",
        tag: "t",
        short: "s",
        status: "scheduled",
        publishAt: at,
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("scheduled");
    expect(res.body.publishAt).toBe(at);
  });

  it("GET /public/:slug returns 404 when no published item matches the slug", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv).get("/api/news/public/ghost");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("not_found");
  });

  it("GET /public/:slug returns the post when published", async () => {
    const request = (await import("supertest")).default;
    await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "Sichtbar",
        tag: "t",
        short: "s",
        status: "published",
      });
    const res = await request(srv).get("/api/news/public/sichtbar");
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("sichtbar");
  });

  it("GET /public/:slug returns the post with hero media when set", async () => {
    const request = (await import("supertest")).default;
    const heroId = seedMedia(db, "news");
    await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "MitBild",
        tag: "t",
        short: "s",
        heroMediaId: heroId,
        status: "published",
      });
    const res = await request(srv).get("/api/news/public/mitbild");
    expect(res.status).toBe(200);
    expect(res.body.hero?.id).toBe(heroId);
  });

  it("PATCH 404s on an unknown id", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .patch("/api/news/999999")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ title: "Anything" });
    expect(res.status).toBe(404);
  });

  it("PATCH rejects malformed payloads with 400", async () => {
    const request = (await import("supertest")).default;
    const created = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ title: "Test", tag: "t", short: "s", status: "draft" });
    const res = await request(srv)
      .patch(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ status: "not-a-real-status" });
    expect(res.status).toBe(400);
  });

  it("PATCH rewrites the slug when a new one is provided, leaving id stable", async () => {
    const request = (await import("supertest")).default;
    const created = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ title: "Alt", tag: "t", short: "s", status: "draft" });
    const patched = await request(srv)
      .patch(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ slug: "neu" });
    expect(patched.status).toBe(200);
    expect(patched.body.slug).toBe("neu");
    expect(patched.body.id).toBe(created.body.id);
  });

  it("PATCH allows clearing publishAt by sending null", async () => {
    const request = (await import("supertest")).default;
    const created = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "T",
        tag: "t",
        short: "s",
        status: "scheduled",
        publishAt: "2099-12-31T10:00:00.000Z",
      });
    expect(created.body.publishAt).toBeTruthy();
    const patched = await request(srv)
      .patch(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ publishAt: null });
    expect(patched.status).toBe(200);
    expect(patched.body.publishAt).toBeNull();
  });

  it("PATCH allows updating heroMediaId to null", async () => {
    const request = (await import("supertest")).default;
    const heroId = seedMedia(db, "news");
    const created = await request(srv)
      .post("/api/news")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        title: "Hero",
        tag: "t",
        short: "s",
        heroMediaId: heroId,
        status: "draft",
      });
    expect(created.body.hero?.id).toBe(heroId);
    const patched = await request(srv)
      .patch(`/api/news/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ heroMediaId: null });
    expect(patched.status).toBe(200);
    expect(patched.body.hero).toBeNull();
  });

  it("DELETE 404s on an unknown id", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .delete("/api/news/999999")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(404);
  });

  it("toPublic surfaces malformed blocks_json as an empty array", async () => {
    const request = (await import("supertest")).default;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, blocks_json, status, created_at, updated_at)
       VALUES ('legacy', 'Legacy', 't', 's', '<p>x</p>', 'not-json', 'published', ?, ?)`,
    ).run(now, now);
    const res = await request(srv).get("/api/news/public/legacy");
    expect(res.status).toBe(200);
    expect(res.body.blocks).toEqual([]);
  });

  it("toPublic treats a NULL blocks_json as an empty array (covers `if (!raw)` branch)", async () => {
    const request = (await import("supertest")).default;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, blocks_json, status, created_at, updated_at)
       VALUES ('nullblocks', 'Null Blocks', 't', 's', '<p>x</p>', NULL, 'published', ?, ?)`,
    ).run(now, now);
    const res = await request(srv).get("/api/news/public/nullblocks");
    expect(res.status).toBe(200);
    expect(res.body.blocks).toEqual([]);
  });

  it("toPublic treats blocks_json='\"string\"' (valid JSON, not array) as an empty array", async () => {
    const request = (await import("supertest")).default;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, blocks_json, status, created_at, updated_at)
       VALUES ('quoted', 'Q', 't', 's', '<p>x</p>', '"hi"', 'published', ?, ?)`,
    ).run(now, now);
    const res = await request(srv).get("/api/news/public/quoted");
    expect(res.body.blocks).toEqual([]);
  });
});

describe("runPublishTick", () => {
  it("flips scheduled posts whose publish_at is in the past to published", () => {
    const db = bootstrap();
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, status, publish_at, created_at, updated_at)
       VALUES ('a', 'A', 't', 's', '', 'scheduled', ?, ?, ?)`,
    ).run(past, past, past);
    db.prepare(
      `INSERT INTO news (slug, title, tag, short, long_html, status, publish_at, created_at, updated_at)
       VALUES ('b', 'B', 't', 's', '', 'scheduled', ?, ?, ?)`,
    ).run(future, future, future);

    runPublishTick(db);

    const a = db.prepare("SELECT status FROM news WHERE slug = 'a'").get();
    const b = db.prepare("SELECT status FROM news WHERE slug = 'b'").get();
    expect(a.status).toBe("published");
    expect(b.status).toBe("scheduled");
  });
});

describe("vorstand reorder", () => {
  it("mass-updates display_order in a transaction", async () => {
    const db = bootstrap();
    const srv = app(db);
    await seedAdmin(db, "admin@example.org", "correct horse battery staple !!");
    const auth = (await login(srv, "admin@example.org", "correct horse battery staple !!"))!;
    const request = (await import("supertest")).default;

    const mk = async (name: string) => {
      const res = await request(srv)
        .post("/api/vorstand")
        .set("Cookie", auth.cookie)
        .set("x-csrf-token", auth.csrf)
        .send({ name, role: "Ausschuss", status: "active" });
      return res.body.id as number;
    };
    const a = await mk("A");
    const b = await mk("B");
    const c = await mk("C");

    const r = await request(srv)
      .post("/api/vorstand/reorder")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ orderedIds: [c, a, b] });
    expect(r.status).toBe(200);
    expect(r.body.map((m: any) => m.id)).toEqual([c, a, b]);
  });
});
