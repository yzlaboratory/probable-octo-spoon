// Playwright port of the former cypress/e2e/admin-news-editor.cy.ts.
// Like-for-like assertion equivalence per ADR 0014 triage rule (admin flow
// that crosses route + server boundaries → Playwright).

import { test, expect } from "./support/fixtures";
import { getAdminCreds, loginViaForm } from "./support/admin";

const creds = getAdminCreds();

test.describe("Admin news block editor", () => {
  test.skip(
    !creds,
    "requires PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD",
  );

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await loginViaForm(page, creds!);
    await page.waitForURL((url) => new URL(url).pathname !== "/admin/login", {
      timeout: 10_000,
    });
  });

  test("creates, edits, reorders, and deletes a block-based article", async ({
    page,
  }) => {
    const slug = `e2e-blocks-${Date.now()}`;
    const title = `E2E Blocks ${Date.now()}`;

    await page.goto("/admin/news/new");

    // Editor header + three right-rail panels render.
    await expect(page.locator('[data-testid="editor-title"]')).toBeVisible();
    await expect(page.getByText("Block-Inspektor")).toBeVisible();
    await expect(page.getByText("Veröffentlichung")).toBeVisible();
    await expect(page.getByText("Metadaten")).toBeVisible();

    // Fill the top matter.
    await page.locator('[data-testid="editor-title"]').fill(title);
    await page
      .locator('[data-testid="editor-teaser"]')
      .fill("Kurzfassung für E2E-Test.");

    // The seed paragraph is active; type into it.
    await page
      .locator('[data-testid="block-paragraph"]')
      .first()
      .fill("Erster Absatz.");

    // Insert a heading after the current block via hover affordance.
    const firstRow = page.locator('[data-testid="block-row"]').first();
    await firstRow.hover();
    await page
      .locator('[data-testid="block-insert-toggle"]')
      .first()
      .click({ force: true });
    await page.locator('[data-testid="block-insert-heading"]').click();
    await page
      .locator('[data-testid="block-heading"]')
      .fill("Zwischenüberschrift");

    // Inspector should report heading kind and offer level buttons.
    await expect(page.locator('[data-testid="inspector-kind"]')).toHaveText(
      "heading",
    );
    await page.locator('[data-testid="inspector-heading-level-3"]').click();

    // Pick a tag + override the slug.
    await page.locator('[data-testid="tag-preset-Verein"]').click();
    await page.locator('[data-testid="metadata-slug-input"]').fill(slug);

    // Explicit save as draft.
    await page.locator('[data-testid="editor-save-draft"]').click();

    // Editor redirects to /admin/news/:id on first save.
    await page.waitForURL(/\/admin\/news\/\d+$/, { timeout: 10_000 });

    // Reorder the heading above the paragraph.
    const secondRow = page.locator('[data-testid="block-row"]').nth(1);
    await secondRow.hover();
    // Hover-only handle: dispatch a synthetic click so the React onClick fires
    // even though the parent BlockRow has its own onClick={onActivate}. Native
    // .click({force:true}) was inconsistent — the row's pointer-cursor wrapper
    // intercepted the actionability check and the move handler never ran.
    await secondRow
      .locator('[data-testid="block-move-up"]')
      .dispatchEvent("click");
    await expect(
      page.locator('[data-testid="block-row"]').first(),
    ).toHaveAttribute("data-kind", "heading");

    // Soft-delete via the news list so the spec is idempotent. The hard
    // delete lives behind the "Papierkorb" filter and needs a confirm prompt;
    // soft delete is enough to keep the active list clean for reruns. Row
    // lives in a grid of role=link divs; the trash button is hover-only,
    // so click with force rather than fake a mouseover. The list page also
    // pops a window.confirm() before issuing DELETE — auto-accept it.
    page.once("dialog", (dialog) => {
      void dialog.accept();
    });
    await page.goto("/admin/news");
    const row = page.locator('[role="link"]', { hasText: title }).first();
    await row.locator('[aria-label="In Papierkorb verschieben"]').click({
      force: true,
    });
  });
});
