describe("Impressum Page", () => {
  beforeEach(() => {
    cy.visit("/Impressum");
  });

  it("loads successfully", () => {
    cy.get("body").should("be.visible");
  });

  it("displays the IMPRESSUM heading", () => {
    cy.get("h1").should("contain.text", "IMPRESSUM");
  });

  it("shows the responsible person", () => {
    cy.contains("Yannik Zeyer").should("be.visible");
  });

  it("shows the address", () => {
    cy.contains("Zum Eisresch 36a").should("be.visible");
    cy.contains("66822 Lebach").should("be.visible");
  });

  it("displays the KONTAKT section", () => {
    cy.contains("KONTAKT").should("be.visible");
    cy.contains("0151 2222 8048").should("be.visible");
    cy.contains("throwaway.relock977@passinbox.com").should("be.visible");
  });

  it("displays the REDAKTIONELL VERANTWORTLICH section", () => {
    cy.contains("REDAKTIONELL VERANTWORTLICH").should("be.visible");
  });

  it("includes the header", () => {
    cy.contains("SVALEMANNIA").should("be.visible");
  });

  it("includes the footer", () => {
    cy.contains("SV Alemannia Thalexweiler").should("exist");
  });
});
