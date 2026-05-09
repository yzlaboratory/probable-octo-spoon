// Cross-cutting auth + CSRF guard coverage.
//
// Every mutation route should reject (a) unauthenticated requests with 401
// and (b) authenticated requests that omit or forge the X-CSRF-Token header
// with 403. These guards are wired in middleware.mjs and live in front of
// every CRUD endpoint — testing them once per route family is enough; we
// don't repeat the matrix per resource elsewhere.

import { test, expect } from "./support/fixtures";
import {
  csrfHeaders,
  getAdminCreds,
  loginAndGetCsrf,
} from "./support/admin";

const creds = getAdminCreds();

test.describe("Admin auth + CSRF guards", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("unauthenticated GET /api/auth/me returns 401", async ({ page }) => {
    const res = await page.request.get("/api/auth/me");
    expect(res.status()).toBe(401);
  });

  test("unauthenticated mutations on every admin resource return 401", async ({
    page,
  }) => {
    const calls = [
      { method: "POST", url: "/api/news", body: { title: "x" } },
      { method: "PATCH", url: "/api/news/1", body: { title: "x" } },
      { method: "DELETE", url: "/api/news/1" },
      { method: "POST", url: "/api/sponsors", body: { name: "x" } },
      { method: "PATCH", url: "/api/sponsors/1", body: { name: "x" } },
      { method: "DELETE", url: "/api/sponsors/1" },
      { method: "POST", url: "/api/vorstand", body: { name: "x" } },
      { method: "PATCH", url: "/api/vorstand/1", body: { name: "x" } },
      { method: "DELETE", url: "/api/vorstand/1" },
      { method: "POST", url: "/api/vorstand/reorder", body: { orderedIds: [1] } },
      { method: "POST", url: "/api/training", body: {} },
      { method: "PATCH", url: "/api/training/1", body: {} },
      { method: "DELETE", url: "/api/training/1" },
      { method: "PATCH", url: "/api/training/banner", body: { message: "x" } },
      { method: "POST", url: "/api/auth/admins", body: { email: "a@b.de" } },
      {
        method: "POST",
        url: "/api/auth/reset-link",
        body: { email: "a@b.de" },
      },
      { method: "POST", url: "/api/auth/logout" },
    ] as const;

    for (const c of calls) {
      const res = await page.request.fetch(c.url, {
        method: c.method,
        data: "body" in c ? c.body : undefined,
      });
      expect.soft(res.status(), `${c.method} ${c.url}`).toBe(401);
    }
  });

  test("authenticated mutations without CSRF header return 403", async ({
    page,
    context,
  }) => {
    await loginAndGetCsrf(page, context, creds!);

    const calls = [
      { method: "POST", url: "/api/news", body: { title: "x" } },
      { method: "POST", url: "/api/sponsors", body: { name: "x" } },
      { method: "POST", url: "/api/vorstand", body: { name: "x" } },
      { method: "POST", url: "/api/training", body: {} },
      { method: "PATCH", url: "/api/training/banner", body: { message: "x" } },
      { method: "POST", url: "/api/auth/admins", body: { email: "a@b.de" } },
      {
        method: "POST",
        url: "/api/auth/reset-link",
        body: { email: "a@b.de" },
      },
      { method: "POST", url: "/api/auth/logout" },
    ] as const;

    for (const c of calls) {
      const res = await page.request.fetch(c.url, {
        method: c.method,
        data: c.body,
      });
      expect.soft(res.status(), `${c.method} ${c.url}`).toBe(403);
      const json = await res.json();
      expect.soft(json.code, `${c.method} ${c.url} body`).toBe("csrf");
    }
  });

  test("authenticated mutations with a forged CSRF header return 403", async ({
    page,
    context,
  }) => {
    await loginAndGetCsrf(page, context, creds!);
    const res = await page.request.post("/api/news", {
      data: { title: "x", tag: "y", short: "z", status: "draft" },
      headers: csrfHeaders("not-the-real-token"),
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).code).toBe("csrf");
  });

  test("authenticated GET endpoints work without CSRF (read-only is unguarded)", async ({
    page,
    context,
  }) => {
    await loginAndGetCsrf(page, context, creds!);
    const reads = [
      "/api/news",
      "/api/sponsors",
      "/api/vorstand",
      "/api/training",
      "/api/training/banner",
      "/api/media",
      "/api/auth/admins",
      "/api/auth/me",
    ];
    for (const url of reads) {
      const res = await page.request.get(url);
      expect.soft(res.status(), `GET ${url}`).toBe(200);
    }
  });
});
