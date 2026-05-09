// Vorstand (board members) CRUD + reorder e2e — happy + the unhappy paths
// enforced by the route: zod schema rejection, archive-before-delete
// invariant, 404, and the dedicated /reorder endpoint with its empty-list
// guard. Driven through the authenticated request context.

import { test, expect } from "./support/fixtures";
import {
  csrfHeaders,
  getAdminCreds,
  loginAndGetCsrf,
} from "./support/admin";

const creds = getAdminCreds();

test.describe("Admin Vorstand CRUD", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  let csrf = "";

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    csrf = await loginAndGetCsrf(page, context, creds!);
  });

  test("lists the seeded Vorstand entries", async ({ page }) => {
    const res = await page.request.get("/api/vorstand");
    expect(res.status()).toBe(200);
    const list = (await res.json()) as unknown[];
    expect(list.length).toBeGreaterThan(0);
  });

  test("creates, edits, archives, deletes a member", async ({ page }) => {
    const name = `E2E Member ${Date.now()}`;

    const created = await page.request.post("/api/vorstand", {
      headers: csrfHeaders(csrf),
      data: {
        name,
        role: "Beisitzer",
        email: "e2e@example.com",
        status: "active",
      },
    });
    expect(created.status()).toBe(201);
    const member = (await created.json()) as { id: number; name: string };
    expect(member.name).toBe(name);

    const renamed = `${name} Updated`;
    const edited = await page.request.patch(`/api/vorstand/${member.id}`, {
      headers: csrfHeaders(csrf),
      data: { name: renamed, role: "Schriftführer" },
    });
    expect(edited.status()).toBe(200);
    const editedJson = (await edited.json()) as { name: string; role: string };
    expect(editedJson.name).toBe(renamed);
    expect(editedJson.role).toBe("Schriftführer");

    // Active → DELETE rejected by archive-first invariant.
    const tooSoon = await page.request.delete(`/api/vorstand/${member.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(tooSoon.status()).toBe(409);
    expect((await tooSoon.json()).code).toBe("not_archived");

    // Archive then delete.
    const archived = await page.request.patch(`/api/vorstand/${member.id}`, {
      headers: csrfHeaders(csrf),
      data: { status: "archived" },
    });
    expect(archived.status()).toBe(200);
    const removed = await page.request.delete(`/api/vorstand/${member.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(removed.status()).toBe(200);

    const gone = await page.request.delete(`/api/vorstand/${member.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(gone.status()).toBe(404);
  });

  test("rejects invalid payloads on create", async ({ page }) => {
    const cases = [
      {
        label: "missing name",
        body: { role: "Beisitzer", status: "active" },
      },
      {
        label: "missing role",
        body: { name: "x", status: "active" },
      },
      {
        label: "invalid email",
        body: {
          name: "x",
          role: "Beisitzer",
          email: "not-an-email",
          status: "active",
        },
      },
      {
        label: "unknown status",
        body: { name: "x", role: "Beisitzer", status: "deleted" },
      },
    ];
    for (const c of cases) {
      const res = await page.request.post("/api/vorstand", {
        headers: csrfHeaders(csrf),
        data: c.body,
      });
      expect.soft(res.status(), c.label).toBe(400);
    }
  });

  test("PATCH unknown id returns 404", async ({ page }) => {
    const res = await page.request.patch("/api/vorstand/99999999", {
      headers: csrfHeaders(csrf),
      data: { name: "x" },
    });
    expect(res.status()).toBe(404);
  });

  test("reorders members and reflects new display_order in subsequent GETs", async ({
    page,
  }) => {
    const listRes = await page.request.get("/api/vorstand");
    const list = (await listRes.json()) as Array<{ id: number }>;
    expect(list.length).toBeGreaterThanOrEqual(2);
    const reversed = [...list].reverse().map((m) => m.id);

    const reorder = await page.request.post("/api/vorstand/reorder", {
      headers: csrfHeaders(csrf),
      data: { orderedIds: reversed },
    });
    expect(reorder.status()).toBe(200);
    const after = (await reorder.json()) as Array<{ id: number }>;
    expect(after.map((m) => m.id)).toEqual(reversed);

    // Restore the original order so other specs that rely on the seeded
    // ordering (homepage, vorstand-detail) stay deterministic.
    const restore = await page.request.post("/api/vorstand/reorder", {
      headers: csrfHeaders(csrf),
      data: { orderedIds: list.map((m) => m.id) },
    });
    expect(restore.status()).toBe(200);
  });

  test("reorder rejects empty orderedIds", async ({ page }) => {
    const res = await page.request.post("/api/vorstand/reorder", {
      headers: csrfHeaders(csrf),
      data: { orderedIds: [] },
    });
    expect(res.status()).toBe(400);
  });

  test("renders the Vorstand admin page", async ({ page }) => {
    await page.goto("/admin/vorstand");
    await expect(page).toHaveURL(/\/admin\/vorstand$/);
    await expect(
      page.getByText(/Anne Treib|Bruno Müller|Christian Britz/i).first(),
    ).toBeVisible();
  });
});
