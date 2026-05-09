// Training slot CRUD + banner e2e — happy + unhappy paths the route
// enforces: zod schema (day enum, HH:MM regex), the timeFrom < timeTo
// invariant on both POST and PATCH (checked against the merged row),
// 404 on unknown id, banner length cap, and the public payload shape.

import { test, expect } from "./support/fixtures";
import {
  csrfHeaders,
  getAdminCreds,
  loginAndGetCsrf,
} from "./support/admin";

const creds = getAdminCreds();

const validSlot = {
  group: "E2E Test Group",
  day: "Mittwoch",
  timeFrom: "18:00",
  timeTo: "19:30",
  trainer: "Max Mustermann",
  phone: "0151 0000 0000",
  visibility: "offen für Gäste",
  status: "active",
} as const;

test.describe("Admin training slots + banner", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  let csrf = "";

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    csrf = await loginAndGetCsrf(page, context, creds!);
  });

  test("creates, edits, and deletes a slot", async ({ page }) => {
    const groupName = `${validSlot.group} ${Date.now()}`;
    const created = await page.request.post("/api/training", {
      headers: csrfHeaders(csrf),
      data: { ...validSlot, group: groupName },
    });
    expect(created.status()).toBe(201);
    const slot = (await created.json()) as { id: number; group: string };
    expect(slot.group).toBe(groupName);

    const edited = await page.request.patch(`/api/training/${slot.id}`, {
      headers: csrfHeaders(csrf),
      data: { trainer: "Anna Trainerin", timeTo: "20:00" },
    });
    expect(edited.status()).toBe(200);
    const editedJson = (await edited.json()) as {
      trainer: string;
      timeTo: string;
    };
    expect(editedJson.trainer).toBe("Anna Trainerin");
    expect(editedJson.timeTo).toBe("20:00");

    const removed = await page.request.delete(`/api/training/${slot.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(removed.status()).toBe(200);

    const gone = await page.request.delete(`/api/training/${slot.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(gone.status()).toBe(404);
  });

  test("rejects POST when timeFrom >= timeTo", async ({ page }) => {
    const res = await page.request.post("/api/training", {
      headers: csrfHeaders(csrf),
      data: { ...validSlot, timeFrom: "20:00", timeTo: "19:00" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("bad_request");
    // Message lives under fields.timeTo per the route's badTimeRange helper.
    expect(body.fields?.timeTo?.[0]).toMatch(/Endzeit/);
  });

  test("PATCH that would invert the time range is rejected after merge", async ({
    page,
  }) => {
    // Create a clean slot first, then attempt to PATCH only timeFrom such
    // that the *merged* row has timeFrom >= timeTo. The route validates the
    // merged result, not the partial payload.
    const create = await page.request.post("/api/training", {
      headers: csrfHeaders(csrf),
      data: { ...validSlot, group: `Range guard ${Date.now()}` },
    });
    const slot = (await create.json()) as { id: number };

    const bad = await page.request.patch(`/api/training/${slot.id}`, {
      headers: csrfHeaders(csrf),
      data: { timeFrom: "23:00" }, // existing timeTo is 19:30
    });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).fields?.timeTo?.[0]).toMatch(/Endzeit/);

    // Cleanup.
    const cleanup = await page.request.delete(`/api/training/${slot.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(cleanup.status()).toBe(200);
  });

  test("rejects schema-invalid payloads", async ({ page }) => {
    const cases = [
      { label: "unknown day", body: { ...validSlot, day: "Nichttag" } },
      {
        label: "non-HHMM time",
        body: { ...validSlot, timeFrom: "8:00", timeTo: "9:00" },
      },
      { label: "missing trainer", body: { ...validSlot, trainer: "" } },
      {
        label: "unknown visibility",
        body: { ...validSlot, visibility: "geheim" },
      },
    ];
    for (const c of cases) {
      const res = await page.request.post("/api/training", {
        headers: csrfHeaders(csrf),
        data: c.body,
      });
      expect.soft(res.status(), c.label).toBe(400);
    }
  });

  test("PATCH unknown id returns 404", async ({ page }) => {
    const res = await page.request.patch("/api/training/99999999", {
      headers: csrfHeaders(csrf),
      data: { trainer: "X" },
    });
    expect(res.status()).toBe(404);
  });

  test("banner: GET → PATCH → cleared via empty string → public payload reflects state", async ({
    page,
  }) => {
    const initial = await page.request.get("/api/training/banner");
    expect(initial.status()).toBe(200);

    const message = `E2E Banner ${Date.now()}`;
    const set = await page.request.patch("/api/training/banner", {
      headers: csrfHeaders(csrf),
      data: { message },
    });
    expect(set.status()).toBe(200);
    expect((await set.json()).message).toBe(message);

    // Public endpoint surfaces it.
    const pub = await page.request.get("/api/training/public");
    expect(pub.status()).toBe(200);
    expect((await pub.json()).banner.message).toBe(message);

    // Empty string clears it (route trims whitespace → null).
    const cleared = await page.request.patch("/api/training/banner", {
      headers: csrfHeaders(csrf),
      data: { message: "   " },
    });
    expect(cleared.status()).toBe(200);
    expect((await cleared.json()).message).toBeNull();
  });

  test("banner rejects messages > 280 chars", async ({ page }) => {
    const res = await page.request.patch("/api/training/banner", {
      headers: csrfHeaders(csrf),
      data: { message: "x".repeat(281) },
    });
    expect(res.status()).toBe(400);
  });

  test("renders the Training admin page", async ({ page }) => {
    await page.goto("/admin/training");
    await expect(page).toHaveURL(/\/admin\/training$/);
  });
});
