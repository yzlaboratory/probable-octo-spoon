// Password reset + admin user management e2e — happy + every unhappy
// path the routes enforce: duplicate email (409), weak password on
// create/reset (422), unknown email on reset-link (404), invalid token on
// consume (400). Tests against a *throwaway* admin we create per run so
// the seeded admin's credentials remain usable for downstream specs.

import { test, expect } from "./support/fixtures";
import {
  csrfHeaders,
  getAdminCreds,
  loginAndGetCsrf,
} from "./support/admin";

const creds = getAdminCreds();

// Strong, policy-compliant password used for the throwaway admin.
const STRONG_OLD = "OldStrongP4ss-XYZ!!";
const STRONG_NEW = "BrandNewP4ssword-2026!";
// 12+ chars and contains a blocklisted word (case-insensitive substring
// match in validatePassword) — passes zod but fails policy → 422.
const WEAK_BUT_LONG = "Alemannia2026!";

test.describe("Admin auth flows: reset + admin mgmt", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  let csrf = "";

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    csrf = await loginAndGetCsrf(page, context, creds!);
  });

  test("GET /api/auth/admins lists at least the seeded admin", async ({
    page,
  }) => {
    const res = await page.request.get("/api/auth/admins");
    expect(res.status()).toBe(200);
    const list = (await res.json()) as Array<{ email: string }>;
    expect(list.find((a) => a.email === creds!.email.toLowerCase())).toBeTruthy();
  });

  test("POST /api/auth/admins creates a new admin", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const res = await page.request.post("/api/auth/admins", {
      headers: csrfHeaders(csrf),
      data: { email, password: STRONG_OLD },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { id: number; email: string };
    expect(body.email).toBe(email.toLowerCase());
  });

  test("rejects duplicate email on create with 409", async ({ page }) => {
    const email = `e2e-dup-${Date.now()}@example.com`;
    const first = await page.request.post("/api/auth/admins", {
      headers: csrfHeaders(csrf),
      data: { email, password: STRONG_OLD },
    });
    expect(first.status()).toBe(201);

    const dup = await page.request.post("/api/auth/admins", {
      headers: csrfHeaders(csrf),
      data: { email, password: STRONG_OLD },
    });
    expect(dup.status()).toBe(409);
    expect((await dup.json()).code).toBe("already_exists");
  });

  test("rejects weak password on admin create with 422", async ({ page }) => {
    const res = await page.request.post("/api/auth/admins", {
      headers: csrfHeaders(csrf),
      data: {
        email: `e2e-weak-${Date.now()}@example.com`,
        password: WEAK_BUT_LONG,
      },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).code).toBe("password_policy");
  });

  test("rejects too-short password on create at zod level (400)", async ({
    page,
  }) => {
    const res = await page.request.post("/api/auth/admins", {
      headers: csrfHeaders(csrf),
      data: { email: `e2e-short-${Date.now()}@example.com`, password: "short" },
    });
    expect(res.status()).toBe(400);
  });

  test("happy path: issue reset link → consume → can log in with the new password", async ({
    page,
    context,
  }) => {
    // 1. Create a throwaway admin we'll reset.
    const email = `e2e-reset-${Date.now()}@example.com`;
    const create = await page.request.post("/api/auth/admins", {
      headers: csrfHeaders(csrf),
      data: { email, password: STRONG_OLD },
    });
    expect(create.status()).toBe(201);

    // 2. Issue a reset link as the seeded (currently authenticated) admin.
    const issue = await page.request.post("/api/auth/reset-link", {
      headers: csrfHeaders(csrf),
      data: { email },
    });
    expect(issue.status()).toBe(200);
    const { token } = (await issue.json()) as { token: string };
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    // 3. Consume the token to set a new password (no auth required for this).
    const consume = await page.request.post("/api/auth/reset-consume", {
      data: { token, newPassword: STRONG_NEW },
    });
    expect(consume.status()).toBe(200);

    // 4. Re-using the same token a second time should fail.
    const replay = await page.request.post("/api/auth/reset-consume", {
      data: { token, newPassword: STRONG_NEW },
    });
    expect(replay.status()).toBe(400);

    // 5. New password lets the throwaway admin log in. Use a clean context
    // so we're not stepping on the seeded session.
    await context.clearCookies();
    const login = await page.request.post("/api/auth/login", {
      data: { email, password: STRONG_NEW },
    });
    expect(login.status()).toBe(200);
  });

  test("rejects reset-link for unknown email with 404", async ({ page }) => {
    const res = await page.request.post("/api/auth/reset-link", {
      headers: csrfHeaders(csrf),
      data: { email: `nobody-${Date.now()}@example.com` },
    });
    expect(res.status()).toBe(404);
  });

  test("rejects reset-link with malformed email at zod (400)", async ({
    page,
  }) => {
    const res = await page.request.post("/api/auth/reset-link", {
      headers: csrfHeaders(csrf),
      data: { email: "not-an-email" },
    });
    expect(res.status()).toBe(400);
  });

  test("reset-consume rejects bogus token with 400", async ({ page }) => {
    const res = await page.request.post("/api/auth/reset-consume", {
      // Long enough to pass zod min(32) but never minted.
      data: { token: "0".repeat(64), newPassword: STRONG_NEW },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("invalid_token");
  });

  test("reset-consume rejects too-short token at zod (400)", async ({
    page,
  }) => {
    const res = await page.request.post("/api/auth/reset-consume", {
      data: { token: "short", newPassword: STRONG_NEW },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe("bad_request");
  });

  test("reset-consume with a valid token but weak password returns 422", async ({
    page,
  }) => {
    // Mint a token first.
    const email = `e2e-resetweak-${Date.now()}@example.com`;
    await page.request.post("/api/auth/admins", {
      headers: csrfHeaders(csrf),
      data: { email, password: STRONG_OLD },
    });
    const issue = await page.request.post("/api/auth/reset-link", {
      headers: csrfHeaders(csrf),
      data: { email },
    });
    const { token } = (await issue.json()) as { token: string };

    const res = await page.request.post("/api/auth/reset-consume", {
      data: { token, newPassword: WEAK_BUT_LONG },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).code).toBe("password_policy");
  });

  test("renders the Admins admin page", async ({ page }) => {
    await page.goto("/admin/admins");
    await expect(page).toHaveURL(/\/admin\/admins$/);
  });

  test("renders the public reset page", async ({ page, context }) => {
    // Reset page is a logged-out flow; clear the session first so the
    // RequireAuth wrapper doesn't bounce us anywhere.
    await context.clearCookies();
    await page.goto("/admin/reset");
    await expect(page).toHaveURL(/\/admin\/reset/);
  });
});
