describe("Datenschutzerklaerung page", () => {
  beforeEach(() => {
    cy.visit("/Datenschutzerklaerung");
  });

  it("loads successfully", () => {
    cy.get("body").should("be.visible");
  });

  it("renders the Rechtliches eyebrow + privacy heading", () => {
    cy.contains("Rechtliches").should("be.visible");
    cy.contains("Datenschutzerkl").should("exist");
  });

  it("contains GDPR / data-collection content", () => {
    cy.contains("DSGVO").should("exist");
    cy.contains("Daten").should("exist");
  });

  it("renders inside the warm public shell", () => {
    cy.get(".public-shell").should("exist");
    cy.get(".public-header").should("be.visible");
    cy.get(".public-footer").should("exist");
  });
});
