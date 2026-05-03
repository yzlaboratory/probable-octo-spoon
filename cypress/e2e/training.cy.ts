describe("Training times (/training)", () => {
  beforeEach(() => cy.visit("/training"));

  it("has a Training page heading", () => {
    cy.contains("h1", "Training.").should("be.visible");
  });

  it("renders weekday headers for all seven days", () => {
    [
      "Montag",
      "Dienstag",
      "Mittwoch",
      "Donnerstag",
      "Freitag",
      "Samstag",
      "Sonntag",
    ].forEach((day) => cy.contains(day).should("exist"));
  });

  it("renders slot cards with time, trainer and visibility chip", () => {
    cy.get('[data-visibility]').should("have.length.greaterThan", 0);
    cy.get('[data-visibility]')
      .first()
      .within(() => {
        cy.contains(/^\d{2}:\d{2}/);
        cy.contains("Trainer:");
        cy.get("a[href^='tel:']").should("exist");
        cy.contains(/offen für Gäste|Anmeldung erforderlich|nur Mitglieder/);
      });
  });

  it("phone numbers are tappable via tel:", () => {
    cy.get("[data-visibility] a[href^='tel:']")
      .first()
      .should("have.attr", "href")
      .and("match", /^tel:\+?\d+$/);
  });

  describe("mobile /training page (375x812)", () => {
    beforeEach(() => {
      cy.viewport(375, 812);
      cy.visit("/training");
    });

    it("page renders without document-level horizontal overflow", () => {
      cy.get("html").then(($html) => {
        expect($html[0].scrollWidth).to.be.at.most(
          $html[0].clientWidth + 1,
        );
      });
    });
  });
});
