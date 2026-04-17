import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import authRoutes from "../../server/routes/auth.mjs";
// @ts-expect-error — .mjs with no types
import newsRoutes from "../../server/routes/news.mjs";
// @ts-expect-error — .mjs with no types
import sponsorRoutes from "../../server/routes/sponsors.mjs";
// @ts-expect-error — .mjs with no types
import vorstandRoutes from "../../server/routes/vorstand.mjs";
// @ts-expect-error — .mjs with no types
import { sessionMiddleware } from "../../server/middleware.mjs";
// @ts-expect-error — .mjs with no types
import { hashPassword } from "../../server/auth.mjs";

function app(db: any) {
  const a = express();
  a.use(express.json());
  a.use(cookieParser());
  a.use(sessionMiddleware(db));
  a.use("/api/auth", authRoutes(db));
  a.use("/api/news", newsRoutes(db));
  a.use("/api/sponsors", sponsorRoutes(db));
  a.use("/api/vorstand", vorstandRoutes(db));
  return a;
}

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

function seedMedia(db: any, kind: "news" | "sponsor" | "vorstand" = "news") {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO media (kind, original_path, variants_json, mime_type, uploaded_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(kind, "/tmp/x.webp", JSON.stringify({ "400w": "/media/x/400w.webp" }), "image/webp", now);
  return Number(info.lastInsertRowid);
}

async function login(app: any, email: string, password: string) {
  const request = (await import("supertest")).default;
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const setCookie = res.headers["set-cookie"] as unknown as string[];
  const sid = setCookie.find((c) => c.startsWith("clubsoft_sid"))!.split(";")[0];
  const csrfCookie = setCookie.find((c) => c.startsWith("clubsoft_csrf"))!.split(";")[0];
  const cookie = `${sid}; ${csrfCookie}`;
  return { cookie, csrf: res.body.csrfToken };
}

describe("news crud", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, "admin@example.org", "correct horse battery staple !!");
    auth = await login(srv, "admin@example.org", "correct horse battery staple !!");
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
        longHtml: "<p>Kommt vorbei!</p><script>alert(1)</script>",
        heroMediaId: heroId,
        status: "published",
      });
    expect(created.status).toBe(201);
    expect(created.body.slug).toBe("jugendturnier");
    expect(created.body.longHtml).not.toMatch(/<script/i);

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
});

describe("sponsor crud", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, "admin@example.org", "correct horse battery staple !!");
    auth = await login(srv, "admin@example.org", "correct horse battery staple !!");
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

describe("vorstand reorder", () => {
  it("mass-updates display_order in a transaction", async () => {
    const db = bootstrap();
    const srv = app(db);
    await seedAdmin(db, "admin@example.org", "correct horse battery staple !!");
    const auth = await login(srv, "admin@example.org", "correct horse battery staple !!");
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
