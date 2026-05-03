import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error — .mjs with no types
import authRoutes from "../../server/routes/auth.mjs";
// @ts-expect-error — .mjs with no types
import trainingRoutes from "../../server/routes/training.mjs";
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
  a.use("/api/training", trainingRoutes(db));
  return a;
}

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

async function seedAdmin(db: any, email: string, password: string) {
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
  ).run(email, hash, now, now);
}

async function login(srv: any, email: string, password: string) {
  const request = (await import("supertest")).default;
  const res = await request(srv).post("/api/auth/login").send({ email, password });
  const setCookie = res.headers["set-cookie"] as unknown as string[];
  const sid = setCookie.find((c) => c.startsWith("clubsoft_sid"))!.split(";")[0];
  const csrfCookie = setCookie
    .find((c) => c.startsWith("clubsoft_csrf"))!
    .split(";")[0];
  return { cookie: `${sid}; ${csrfCookie}`, csrf: res.body.csrfToken };
}

const VALID_SLOT = {
  group: "G-Jugend (U11)",
  day: "Donnerstag",
  timeFrom: "16:30",
  timeTo: "18:00",
  trainer: "Max Muster",
  phone: "0151 1111 1111",
  visibility: "Anmeldung erforderlich",
  status: "active",
};

describe("training routes", () => {
  let db: any;
  let srv: any;
  let auth: { cookie: string; csrf: string };

  beforeEach(async () => {
    db = bootstrap();
    srv = app(db);
    await seedAdmin(db, "admin@example.org", "correct horse battery staple !!");
    auth = await login(srv, "admin@example.org", "correct horse battery staple !!");
  });

  it("GET /public returns seeded slots and a banner shape", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv).get("/api/training/public");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);
    // Per migration seed, AH must be visible to guests.
    const ah = res.body.slots.find((s: any) => /alte herren/i.test(s.group));
    expect(ah?.visibility).toBe("offen für Gäste");
    expect(res.body).toHaveProperty("banner");
    expect(res.body.banner).toHaveProperty("message");
    expect(res.body.banner.message).toBeNull();
  });

  it("GET / requires auth", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv).get("/api/training");
    expect(res.status).toBe(401);
  });

  it("creates, lists, patches, archives, hard-deletes a slot", async () => {
    const request = (await import("supertest")).default;

    const created = await request(srv)
      .post("/api/training")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(VALID_SLOT);
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body.group).toBe(VALID_SLOT.group);

    const listed = await request(srv)
      .get("/api/training")
      .set("Cookie", auth.cookie);
    expect(listed.status).toBe(200);
    expect(listed.body.find((s: any) => s.id === id)).toBeTruthy();

    const patched = await request(srv)
      .patch(`/api/training/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ trainer: "Erika Beispiel" });
    expect(patched.status).toBe(200);
    expect(patched.body.trainer).toBe("Erika Beispiel");

    // Cannot hard-delete unless archived.
    const blocked = await request(srv)
      .delete(`/api/training/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(blocked.status).toBe(409);

    await request(srv)
      .patch(`/api/training/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ status: "archived" });

    const removed = await request(srv)
      .delete(`/api/training/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf);
    expect(removed.status).toBe(200);
  });

  it("rejects timeTo earlier than timeFrom on POST", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/training")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ ...VALID_SLOT, timeFrom: "20:00", timeTo: "19:00" });
    expect(res.status).toBe(400);
    expect(res.body.fields?.timeTo?.length ?? 0).toBeGreaterThan(0);
  });

  it("rejects unknown day / visibility / status enums", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .post("/api/training")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ ...VALID_SLOT, day: "Funday" });
    expect(res.status).toBe(400);
  });

  it("PATCH that would invert times via partial update is rejected", async () => {
    const request = (await import("supertest")).default;
    const created = await request(srv)
      .post("/api/training")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(VALID_SLOT);
    const id = created.body.id;
    // Existing slot has timeFrom=16:30, timeTo=18:00. Patching only timeFrom
    // to 19:00 must fail because the resulting (19:00, 18:00) is invalid.
    const res = await request(srv)
      .patch(`/api/training/${id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ timeFrom: "19:00" });
    expect(res.status).toBe(400);
  });

  it("hidden slots are excluded from /public", async () => {
    const request = (await import("supertest")).default;
    const created = await request(srv)
      .post("/api/training")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send(VALID_SLOT);
    await request(srv)
      .patch(`/api/training/${created.body.id}`)
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ status: "hidden" });
    const pub = await request(srv).get("/api/training/public");
    expect(pub.body.slots.find((s: any) => s.id === created.body.id)).toBeUndefined();
  });

  it("banner: empty/whitespace string clears the message", async () => {
    const request = (await import("supertest")).default;
    await request(srv)
      .patch("/api/training/banner")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ message: "Sommerpause bis 9. August" });

    let pub = await request(srv).get("/api/training/public");
    expect(pub.body.banner.message).toBe("Sommerpause bis 9. August");

    await request(srv)
      .patch("/api/training/banner")
      .set("Cookie", auth.cookie)
      .set("x-csrf-token", auth.csrf)
      .send({ message: "   " });
    pub = await request(srv).get("/api/training/public");
    expect(pub.body.banner.message).toBeNull();
  });

  it("banner update requires CSRF", async () => {
    const request = (await import("supertest")).default;
    const res = await request(srv)
      .patch("/api/training/banner")
      .set("Cookie", auth.cookie)
      .send({ message: "x" });
    expect(res.status).toBe(403);
  });
});
