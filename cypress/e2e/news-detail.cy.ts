describe("News detail page (editorial)", () => {
  it("returns the SPA shell for any news slug (200)", () => {
    const paths = [
      "any-slug",
      "another-one",
      "dreikampf2026-02-14",
    ];
    for (const path of paths) {
      cy.request(`/news/${path}`).its("status").should("eq", 200);
    }
  });

  describe("rendered shell", () => {
    beforeEach(() => {
      cy.visit("/news/does-not-exist", { failOnStatusCode: false });
    });

    it("renders inside the warm public shell", () => {
      cy.get(".public-shell").should("exist");
      cy.get(".public-header").should("be.visible");
      cy.get(".public-footer").should("exist");
    });

    it("shows a friendly fallback when the slug is unknown", () => {
      cy.contains(/Artikel nicht gefunden|Lädt/).should("exist");
    });
  });
});
