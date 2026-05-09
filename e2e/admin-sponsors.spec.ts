// Sponsor CRUD e2e — happy path + the unhappy paths the route enforces:
// schema validation, missing-logo guard, archive-before-delete invariant,
// 404 for unknown ids. Driven through the authenticated request context so
// we exercise the real Express stack (auth + CSRF + zod + sqlite) without
// scraping the UI; the SponsorListPage UI smoke test sits at the bottom.

import { test, expect } from "./support/fixtures";
import {
  csrfHeaders,
  getAdminCreds,
  loginAndGetCsrf,
} from "./support/admin";

const creds = getAdminCreds();

async function pickSeededSponsorLogoId(
  request: import("@playwright/test").APIRequestContext,
): Promise<number> {
  const res = await request.get("/api/media?kind=sponsor");
  expect(res.status()).toBe(200);
  const list = (await res.json()) as Array<{ id: number }>;
  expect(list.length).toBeGreaterThan(0);
  return list[0]!.id;
}

test.describe("Admin sponsors CRUD", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  let csrf = "";

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    csrf = await loginAndGetCsrf(page, context, creds!);
  });

  test("lists the seeded sponsors", async ({ page }) => {
    const res = await page.request.get("/api/sponsors");
    expect(res.status()).toBe(200);
    const list = (await res.json()) as unknown[];
    expect(list.length).toBeGreaterThan(0);
  });

  test("creates, edits, archives, and deletes a sponsor", async ({ page }) => {
    const logoMediaId = await pickSeededSponsorLogoId(page.request);
    const name = `E2E Sponsor ${Date.now()}`;

    // Create — defaults to active.
    const created = await page.request.post("/api/sponsors", {
      headers: csrfHeaders(csrf),
      data: {
        name,
        linkUrl: "https://example.com",
        logoMediaId,
        cardPalette: "transparent",
        weight: 50,
        status: "active",
      },
    });
    expect(created.status()).toBe(201);
    const sponsor = (await created.json()) as { id: number; name: string };
    expect(sponsor.name).toBe(name);

    // Edit — rename + bump weight.
    const renamed = `${name} Updated`;
    const edited = await page.request.patch(`/api/sponsors/${sponsor.id}`, {
      headers: csrfHeaders(csrf),
      data: { name: renamed, weight: 90 },
    });
    expect(edited.status()).toBe(200);
    const editedJson = (await edited.json()) as { name: string; weight: number };
    expect(editedJson.name).toBe(renamed);
    expect(editedJson.weight).toBe(90);

    // Delete-while-active → 409 (archive-first invariant).
    const tooSoon = await page.request.delete(`/api/sponsors/${sponsor.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(tooSoon.status()).toBe(409);
    expect((await tooSoon.json()).code).toBe("not_archived");

    // Archive, then delete.
    const archived = await page.request.patch(`/api/sponsors/${sponsor.id}`, {
      headers: csrfHeaders(csrf),
      data: { status: "archived" },
    });
    expect(archived.status()).toBe(200);

    const removed = await page.request.delete(`/api/sponsors/${sponsor.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(removed.status()).toBe(200);

    // 404 once gone.
    const gone = await page.request.delete(`/api/sponsors/${sponsor.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(gone.status()).toBe(404);
  });

  test("rejects invalid create payloads (zod schema)", async ({ page }) => {
    const cases = [
      {
        label: "missing logoMediaId",
        body: {
          name: "Bad",
          linkUrl: "https://example.com",
          cardPalette: "transparent",
          weight: 50,
          status: "active",
        },
      },
      {
        label: "non-url linkUrl",
        body: {
          name: "Bad",
          linkUrl: "not-a-url",
          logoMediaId: 1,
          cardPalette: "transparent",
          weight: 50,
          status: "active",
        },
      },
      {
        label: "empty name",
        body: {
          name: "",
          linkUrl: "https://example.com",
          logoMediaId: 1,
          cardPalette: "transparent",
          weight: 50,
          status: "active",
        },
      },
      {
        label: "weight out of range",
        body: {
          name: "Bad",
          linkUrl: "https://example.com",
          logoMediaId: 1,
          cardPalette: "transparent",
          weight: 999,
          status: "active",
        },
      },
      {
        label: "unknown palette",
        body: {
          name: "Bad",
          linkUrl: "https://example.com",
          logoMediaId: 1,
          cardPalette: "rainbow",
          weight: 50,
          status: "active",
        },
      },
    ];
    for (const c of cases) {
      const res = await page.request.post("/api/sponsors", {
        headers: csrfHeaders(csrf),
        data: c.body,
      });
      expect.soft(res.status(), c.label).toBe(400);
      expect.soft((await res.json()).code, c.label).toBe("bad_request");
    }
  });

  test("rejects creates that point at a missing logo media id", async ({
    page,
  }) => {
    const res = await page.request.post("/api/sponsors", {
      headers: csrfHeaders(csrf),
      data: {
        name: "Ghost",
        linkUrl: "https://example.com",
        logoMediaId: 99999999,
        cardPalette: "transparent",
        weight: 50,
        status: "active",
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/Logo-Medium nicht gefunden/);
  });

  test("PATCH on unknown id returns 404", async ({ page }) => {
    const res = await page.request.patch("/api/sponsors/99999999", {
      headers: csrfHeaders(csrf),
      data: { name: "x" },
    });
    expect(res.status()).toBe(404);
  });

  test("renders the sponsor list page in the admin shell", async ({ page }) => {
    await page.goto("/admin/sponsors");
    await expect(page).toHaveURL(/\/admin\/sponsors$/);
    // Wait for at least one sponsor card (seeded) to be present.
    await expect(page.getByText(/Allianz|Bestattungen|Bikesport/i).first()).toBeVisible();
  });
});
