// News editor lifecycle e2e — covers the validation + status-transition
// matrix that the existing admin-news-editor.spec.ts skips. Slug auto-
// dedup, scheduled-vs-public visibility rules, soft-then-hard delete,
// 404 on unknown id. Driven through page.request so the assertions touch
// the route + zod + sqlite without UI flake.

import { test, expect } from "./support/fixtures";
import {
  csrfHeaders,
  getAdminCreds,
  loginAndGetCsrf,
} from "./support/admin";

const creds = getAdminCreds();

const baseDraft = {
  title: "Lifecycle test",
  tag: "VEREIN",
  short: "Kurz.",
  status: "draft",
} as const;

test.describe("Admin news lifecycle", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  let csrf = "";

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    csrf = await loginAndGetCsrf(page, context, creds!);
  });

  test("transitions draft → published → withdrawn → soft-deleted → hard-deleted", async ({
    page,
  }) => {
    const stamp = Date.now();
    const create = await page.request.post("/api/news", {
      headers: csrfHeaders(csrf),
      data: { ...baseDraft, title: `Lifecycle ${stamp}`, slug: `lc-${stamp}` },
    });
    expect(create.status()).toBe(201);
    const item = (await create.json()) as {
      id: number;
      slug: string;
      status: string;
      publishAt: string | null;
    };
    expect(item.status).toBe("draft");
    expect(item.publishAt).toBeNull();

    // → published. Route stamps publish_at = now if missing.
    const pub = await page.request.patch(`/api/news/${item.id}`, {
      headers: csrfHeaders(csrf),
      data: { status: "published", publishAt: new Date().toISOString() },
    });
    expect(pub.status()).toBe(200);
    expect((await pub.json()).status).toBe("published");

    // Public endpoint surfaces it.
    const pubList = (await (
      await page.request.get("/api/news/public")
    ).json()) as Array<{ slug: string }>;
    expect(pubList.find((n) => n.slug === item.slug)).toBeTruthy();

    // → withdrawn. Public list drops it.
    const wd = await page.request.patch(`/api/news/${item.id}`, {
      headers: csrfHeaders(csrf),
      data: { status: "withdrawn" },
    });
    expect(wd.status()).toBe(200);
    const afterWd = (await (
      await page.request.get("/api/news/public")
    ).json()) as Array<{ slug: string }>;
    expect(afterWd.find((n) => n.slug === item.slug)).toBeFalsy();

    // Soft delete first (status='deleted').
    const soft = await page.request.delete(`/api/news/${item.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(soft.status()).toBe(200);
    expect((await soft.json()).hard).toBe(false);

    // Hard delete from the deleted state.
    const hard = await page.request.delete(`/api/news/${item.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(hard.status()).toBe(200);
    expect((await hard.json()).hard).toBe(true);

    // Now actually gone.
    const gone = await page.request.delete(`/api/news/${item.id}`, {
      headers: csrfHeaders(csrf),
    });
    expect(gone.status()).toBe(404);
  });

  test("scheduled news with a future publishAt does not appear in /api/news/public", async ({
    page,
  }) => {
    const stamp = Date.now();
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const create = await page.request.post("/api/news", {
      headers: csrfHeaders(csrf),
      data: {
        ...baseDraft,
        status: "scheduled",
        publishAt: future,
        title: `Scheduled ${stamp}`,
        slug: `sched-${stamp}`,
      },
    });
    expect(create.status()).toBe(201);
    const item = (await create.json()) as { id: number; slug: string };

    const pubList = (await (
      await page.request.get("/api/news/public")
    ).json()) as Array<{ slug: string }>;
    expect(pubList.find((n) => n.slug === item.slug)).toBeFalsy();

    // Single-slug public lookup also 404s.
    const single = await page.request.get(`/api/news/public/${item.slug}`);
    expect(single.status()).toBe(404);

    // Cleanup: soft + hard delete.
    await page.request.delete(`/api/news/${item.id}`, {
      headers: csrfHeaders(csrf),
    });
    await page.request.delete(`/api/news/${item.id}`, {
      headers: csrfHeaders(csrf),
    });
  });

  test("slug collisions auto-dedup with -2 / -3 suffixes (no 409)", async ({
    page,
  }) => {
    const slugBase = `collision-${Date.now()}`;
    const a = await page.request.post("/api/news", {
      headers: csrfHeaders(csrf),
      data: { ...baseDraft, title: "First", slug: slugBase },
    });
    expect(a.status()).toBe(201);
    const aJson = (await a.json()) as { id: number; slug: string };
    expect(aJson.slug).toBe(slugBase);

    const b = await page.request.post("/api/news", {
      headers: csrfHeaders(csrf),
      data: { ...baseDraft, title: "Second", slug: slugBase },
    });
    expect(b.status()).toBe(201);
    const bJson = (await b.json()) as { id: number; slug: string };
    expect(bJson.slug).toBe(`${slugBase}-2`);

    const c = await page.request.post("/api/news", {
      headers: csrfHeaders(csrf),
      data: { ...baseDraft, title: "Third", slug: slugBase },
    });
    expect(c.status()).toBe(201);
    const cJson = (await c.json()) as { id: number; slug: string };
    expect(cJson.slug).toBe(`${slugBase}-3`);

    // Cleanup all three so the admin list stays clean for reruns.
    for (const id of [aJson.id, bJson.id, cJson.id]) {
      await page.request.delete(`/api/news/${id}`, { headers: csrfHeaders(csrf) });
      await page.request.delete(`/api/news/${id}`, { headers: csrfHeaders(csrf) });
    }
  });

  test("rejects invalid create payloads", async ({ page }) => {
    const cases = [
      { label: "empty title", body: { ...baseDraft, title: "" } },
      {
        label: "title too long",
        body: { ...baseDraft, title: "x".repeat(241) },
      },
      { label: "empty short", body: { ...baseDraft, short: "" } },
      {
        label: "short too long",
        body: { ...baseDraft, short: "x".repeat(601) },
      },
      { label: "empty tag", body: { ...baseDraft, tag: "" } },
      { label: "unknown status", body: { ...baseDraft, status: "deleted" } },
      {
        label: "non-iso publishAt",
        body: { ...baseDraft, status: "scheduled", publishAt: "tomorrow" },
      },
    ];
    for (const c of cases) {
      const res = await page.request.post("/api/news", {
        headers: csrfHeaders(csrf),
        data: c.body,
      });
      expect.soft(res.status(), c.label).toBe(400);
      expect.soft((await res.json()).code, c.label).toBe("bad_request");
    }
  });

  test("PATCH unknown id returns 404", async ({ page }) => {
    const res = await page.request.patch("/api/news/99999999", {
      headers: csrfHeaders(csrf),
      data: { title: "x" },
    });
    expect(res.status()).toBe(404);
  });

  test("renders the news list page in the admin shell", async ({ page }) => {
    await page.goto("/admin/news");
    await expect(page).toHaveURL(/\/admin\/news$/);
  });
});
