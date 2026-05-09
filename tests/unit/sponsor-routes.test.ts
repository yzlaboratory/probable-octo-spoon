import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
// @ts-expect-error — .mjs with no types
import sponsorRoutes from "../../server/routes/sponsors.mjs";
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
  return makeApp(db, { "/api/sponsors": sponsorRoutes });
}

function seedMedia(db: any) {
  return seedMediaShared(db, {
    kind: "sponsor",
    variants: { "400w": "/m/x.webp" },
  });
}

function validBody(mediaId: number, over: Record<string, unknown> = {}) {
  return {
    name: "Bäckerei Müller",
    tagline: "Frisches Brot",
    linkUrl: "https://example.org",
    logoMediaId: mediaId,
    logoHasOwnBackground: false,
    cardPalette: "purple",
    weight: 5,
    status: "active",
    ...over,
  };
}

describe("sponsors admin CRUD", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };
  let mediaId: number;

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db);
    auth = (await login(srv))!;
    mediaId = seedMedia(db);
  });

  it("POST / returns 401 without auth", async () => {
    const res = await request(srv).post("/api/sponsors").send(validBody(mediaId));
    expect(res.status).toBe(401);
  });

  it("POST / returns 400 for invalid input", async () => {
    const res = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ name: "" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("bad_request");
  });

  it("POST / returns 400 when logo media is missing", async () => {
    const res = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(99999));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Logo/);
  });

  it("POST / creates a sponsor and assigns the next display_order", async () => {
    const res1 = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { name: "First" }));
    expect(res1.status).toBe(201);
    expect(res1.body.displayOrder).toBe(1);
    expect(res1.body.logo).not.toBeNull();
    expect(res1.body.logo.variants["400w"]).toBe("/m/x.webp");

    const res2 = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { name: "Second" }));
    expect(res2.status).toBe(201);
    expect(res2.body.displayOrder).toBe(2);
  });

  it("GET / lists sponsors and supports status filter", async () => {
    await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { name: "Active", status: "active" }));
    await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { name: "Paused", status: "paused" }));

    const all = await request(srv).get("/api/sponsors").set("cookie", auth.cookie);
    expect(all.status).toBe(200);
    expect(all.body).toHaveLength(2);

    const filtered = await request(srv)
      .get("/api/sponsors?status=paused")
      .set("cookie", auth.cookie);
    expect(filtered.body.map((r: any) => r.name)).toEqual(["Paused"]);
  });

  it("GET /public only returns active sponsors within their active window", async () => {
    const past = new Date(Date.now() - 86400_000).toISOString();
    const future = new Date(Date.now() + 86400_000).toISOString();
    await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { name: "Live", activeFrom: past, activeUntil: future }));
    await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { name: "Paused", status: "paused" }));
    await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { name: "Expired", activeUntil: past }));

    const res = await request(srv).get("/api/sponsors/public");
    expect(res.status).toBe(200);
    expect(res.body.map((r: any) => r.name)).toEqual(["Live"]);
  });

  it("PATCH /:id 404s for unknown id", async () => {
    const res = await request(srv)
      .patch("/api/sponsors/9999")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ name: "x" });
    expect(res.status).toBe(404);
  });

  it("PATCH /:id 400s for invalid body", async () => {
    const created = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId));
    const res = await request(srv)
      .patch(`/api/sponsors/${created.body.id}`)
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ weight: 9999 });
    expect(res.status).toBe(400);
  });

  it("PATCH /:id updates only the supplied fields and preserves the rest", async () => {
    const created = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { name: "Original", weight: 5, tagline: "old" }));
    const res = await request(srv)
      .patch(`/api/sponsors/${created.body.id}`)
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ name: "Renamed", tagline: null });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed");
    expect(res.body.tagline).toBeNull();
    expect(res.body.weight).toBe(5);
  });

  it("POST persists logoHasOwnBackground=true (covers the truthy branch of the boolean serialization)", async () => {
    const res = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { logoHasOwnBackground: true }));
    expect(res.status).toBe(201);
    expect(res.body.logoHasOwnBackground).toBe(true);
  });

  it("PATCH lets the editor flip logoHasOwnBackground (covers the d.logoHasOwnBackground side of the ?? short-circuit)", async () => {
    const created = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { logoHasOwnBackground: false }));
    const res = await request(srv)
      .patch(`/api/sponsors/${created.body.id}`)
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ logoHasOwnBackground: true });
    expect(res.status).toBe(200);
    expect(res.body.logoHasOwnBackground).toBe(true);
  });

  it("PATCH lets the editor explicitly set activeFrom / activeUntil / notes (covers the `'X' in d` true branches)", async () => {
    const created = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { activeFrom: null, activeUntil: null, notes: null }));
    const res = await request(srv)
      .patch(`/api/sponsors/${created.body.id}`)
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({
        activeFrom: "2026-01-01T00:00:00.000Z",
        activeUntil: "2026-12-31T00:00:00.000Z",
        notes: "rebrand",
      });
    expect(res.status).toBe(200);
    expect(res.body.activeFrom).toBe("2026-01-01T00:00:00.000Z");
    expect(res.body.activeUntil).toBe("2026-12-31T00:00:00.000Z");
    expect(res.body.notes).toBe("rebrand");
  });

  it("DELETE /:id 404s for unknown id", async () => {
    const res = await request(srv)
      .delete("/api/sponsors/9999")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(404);
  });

  it("DELETE /:id refuses non-archived sponsors with 409", async () => {
    const created = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId));
    const res = await request(srv)
      .delete(`/api/sponsors/${created.body.id}`)
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("not_archived");
  });

  it("DELETE /:id removes an archived sponsor", async () => {
    const created = await request(srv)
      .post("/api/sponsors")
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(validBody(mediaId, { status: "archived" }));
    const res = await request(srv)
      .delete(`/api/sponsors/${created.body.id}`)
      .set("cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const remaining = db
      .prepare("SELECT COUNT(*) as n FROM sponsors WHERE id = ?")
      .get(created.body.id);
    expect(remaining.n).toBe(0);
  });
});
