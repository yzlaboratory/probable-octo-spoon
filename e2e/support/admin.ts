// Admin auth helpers for Playwright.
//
// Credentials come from PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD
// (forwarded from ~/.credentials by the `npm run test:admin` script). Specs
// skip cleanly when those vars are missing so CI without secrets stays green.

import type { BrowserContext, Page } from "@playwright/test";

export interface AdminCreds {
  email: string;
  password: string;
}

export function getAdminCreds(): AdminCreds | null {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return null;
  }
  return { email, password };
}

export async function loginViaForm(
  page: Page,
  { email, password }: AdminCreds,
) {
  await page.goto("/admin/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

// Drives login + waits until the SPA leaves /admin/login, then returns the
// CSRF token from the cookie jar. CSRF-protected mutations need both the
// cookie (set automatically) and a matching X-CSRF-Token header — these
// helpers keep specs from re-deriving that boilerplate per test.
export async function loginAndGetCsrf(
  page: Page,
  context: BrowserContext,
  creds: AdminCreds,
): Promise<string> {
  await loginViaForm(page, creds);
  await page.waitForURL((url) => new URL(url).pathname !== "/admin/login", {
    timeout: 10_000,
  });
  return await getCsrfFromCookies(context);
}

export async function getCsrfFromCookies(
  context: BrowserContext,
): Promise<string> {
  const cookies = await context.cookies();
  const csrf = cookies.find((c) => c.name === "clubsoft_csrf");
  if (!csrf) throw new Error("CSRF cookie missing — login probably failed");
  return csrf.value;
}

export function csrfHeaders(token: string): Record<string, string> {
  return { "X-CSRF-Token": token };
}
