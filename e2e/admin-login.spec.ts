// Playwright port of cypress/e2e/admin-login.cy.ts. Like-for-like assertion
// equivalence per ADR 0014 triage rule. The Cypress version stays in place
// until issue 08 deletes Cypress wholesale.

import { test, expect } from "./support/fixtures";
import { getAdminCreds, loginViaForm } from "./support/admin";

const creds = getAdminCreds();

test.describe("Admin login", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders the login form with the redesigned shell", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(
      page.locator("h1", { hasText: "Admin-Bereich" }),
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeEnabled();
  });

  test("redirects unauthenticated /admin visits to /admin/login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("logs in with valid credentials and lands inside the admin area", async ({
    page,
  }) => {
    await loginViaForm(page, creds!);
    await page.waitForURL(/^.*\/admin(\/|$)(?!login).*/i, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).not.toBe("/admin/login");
    await expect(page.locator("text=Admin-Bereich")).toHaveCount(0);
  });

  test("rejects wrong passwords and keeps the user on the login page", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.locator('input[type="email"]').fill(creds!.email);
    await page
      .locator('input[type="password"]')
      .fill("definitely-not-the-password-xyz");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page.locator('[role="alert"]')).toBeVisible({
      timeout: 5_000,
    });
    expect(new URL(page.url()).pathname).toBe("/admin/login");
  });

  test("normalizes the email (trims + lowercases) before submitting", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page
      .locator('input[type="email"]')
      .fill(`  ${creds!.email.toUpperCase()}  `);
    await page.locator('input[type="password"]').fill(creds!.password);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.waitForURL((url) => new URL(url).pathname !== "/admin/login", {
      timeout: 10_000,
    });
  });

  test("blocks submission when the password is empty (native validation)", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.locator('input[type="email"]').fill(creds!.email);
    await page.getByRole("button", { name: "Anmelden" }).click();
    expect(new URL(page.url()).pathname).toBe("/admin/login");
    const invalid = page.locator('input[type="password"]:invalid');
    await expect(invalid).toHaveCount(1);
  });

  test("persists the session across a page reload", async ({ page }) => {
    await loginViaForm(page, creds!);
    await page.waitForURL((url) => new URL(url).pathname !== "/admin/login", {
      timeout: 10_000,
    });
    await page.reload();
    expect(new URL(page.url()).pathname).not.toBe("/admin/login");
    const me = await page.request.get("/api/auth/me");
    expect(me.status()).toBe(200);
  });

  test("logs out and returns the user to the login page on next admin visit", async ({
    page,
    context,
  }) => {
    await loginViaForm(page, creds!);
    await page.waitForURL((url) => new URL(url).pathname !== "/admin/login", {
      timeout: 10_000,
    });
    const cookies = await context.cookies();
    const csrf = cookies.find((c) => c.name === "clubsoft_csrf");
    await page.request.post("/api/auth/logout", {
      headers: csrf ? { "X-CSRF-Token": csrf.value } : {},
    });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
