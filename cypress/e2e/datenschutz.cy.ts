describe("Datenschutzerklaerung Page", () => {
  beforeEach(() => {
    cy.visit("/Datenschutzerklaerung");
  });

  it("loads successfully", () => {
    cy.get("body").should("be.visible");
  });

  it("displays a privacy policy heading", () => {
    cy.get("h1, h2").first().should("be.visible");
  });

  it("contains privacy-related content", () => {
    cy.contains("Datenschutz").should("exist");
  });

  it("mentions data collection", () => {
    cy.contains("Daten").should("exist");
  });

  it("includes the header", () => {
    cy.contains("SVALEMANNIA").should("be.visible");
  });

  it("includes the footer", () => {
    cy.contains("SV Alemannia Thalexweiler").should("exist");
  });
});
