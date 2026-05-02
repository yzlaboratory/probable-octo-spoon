import { adminSession, getAdminCreds } from "../support/admin";

const creds = getAdminCreds();

describe("Admin news block editor", () => {
  if (!creds) {
    it.skip("requires CYPRESS_ADMIN_EMAIL / CYPRESS_ADMIN_PASSWORD", () => {});
    return;
  }

  beforeEach(() => {
    adminSession(creds);
  });

  it("creates, edits, reorders, and deletes a block-based article", () => {
    const slug = `e2e-blocks-${Date.now()}`;
    const title = `E2E Blocks ${Date.now()}`;

    cy.visit("/admin/news/new");

    // Editor header + three right-rail panels render.
    cy.get('[data-testid="editor-title"]').should("be.visible");
    cy.contains("Block-Inspektor").should("be.visible");
    cy.contains("Veröffentlichung").should("be.visible");
    cy.contains("Metadaten").should("be.visible");

    // Fill the top matter.
    cy.get('[data-testid="editor-title"]').type(title);
    cy.get('[data-testid="editor-teaser"]').type("Kurzfassung für E2E-Test.");

    // The seed paragraph is active; type into it.
    cy.get('[data-testid="block-paragraph"]').first().type("Erster Absatz.");

    // Insert a heading after the current block via hover affordance.
    cy.get('[data-testid="block-row"]').first().trigger("mouseover");
    cy.get('[data-testid="block-insert-toggle"]').first().click({ force: true });
    cy.get('[data-testid="block-insert-heading"]').click();
    cy.get('[data-testid="block-heading"]').type("Zwischenüberschrift");

    // Inspector should report heading kind and offer level buttons.
    cy.get('[data-testid="inspector-kind"]').should("have.text", "heading");
    cy.get('[data-testid="inspector-heading-level-3"]').click();

    // Pick a tag + override the slug.
    cy.get('[data-testid="tag-preset-Verein"]').click();
    cy.get('[data-testid="metadata-slug-input"]').clear().type(slug);

    // Explicit save as draft.
    cy.get('[data-testid="editor-save-draft"]').click();

    // Editor redirects to /admin/news/:id on first save.
    cy.location("pathname", { timeout: 10000 }).should(
      "match",
      /^\/admin\/news\/\d+$/,
    );

    // Reorder the heading above the paragraph.
    cy.get('[data-testid="block-row"]').eq(1).trigger("mouseover");
    cy.get('[data-testid="block-row"]').eq(1).find('[data-testid="block-move-up"]').click({ force: true });
    cy.get('[data-testid="block-row"]').first().should("have.attr", "data-kind", "heading");

    // Soft-delete via the news list so the spec is idempotent. The hard
    // delete lives behind the "Papierkorb" filter and needs a confirm prompt;
    // soft delete is enough to keep the active list clean for reruns. Row
    // lives in a grid of role=link divs; the trash button is hover-only,
    // so click with force rather than fake a mouseover.
    cy.visit("/admin/news");
    cy.contains(title)
      .parentsUntil("body", '[role="link"]')
      .find('[aria-label="In Papierkorb verschieben"]')
      .click({ force: true });
  });
});
