// Admin auth helpers for Playwright.
//
// Credentials come from PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD
// (forwarded from ~/.credentials by the `npm run test:admin` script). Specs
// skip cleanly when those vars are missing so CI without secrets stays green.

import type { Page } from "@playwright/test";

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
