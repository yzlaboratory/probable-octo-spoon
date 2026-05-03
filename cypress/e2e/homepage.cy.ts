describe("Public homepage (warm-editorial shell)", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("loads successfully", () => {
    cy.get("body").should("be.visible");
  });

  it("renders the editorial header wordmark", () => {
    cy.contains("SV Alemannia").should("be.visible");
    cy.contains(/Thalexweiler/).should("exist");
  });

  it("shows the desktop primary nav", () => {
    cy.viewport(1440, 900);
    cy.get(".public-nav")
      .should("be.visible")
      .within(() => {
        cy.contains("Start").should("be.visible");
        cy.contains("Meldungen").should("be.visible");
        cy.contains("Mannschaften").should("be.visible");
        cy.contains("Sponsoren").should("be.visible");
        cy.contains("Kontakt").should("be.visible");
      });
  });

  it("collapses the nav into a hamburger on mobile", () => {
    cy.viewport(375, 812);
    cy.get('button[aria-label="Menü öffnen"]').should("be.visible");
    cy.get(".public-nav").should("not.be.visible");
  });

  it("opens the mobile menu when the hamburger is clicked", () => {
    cy.viewport(375, 812);
    cy.get('button[aria-label="Menü öffnen"]').click();
    cy.contains("a", "Start").should("be.visible");
    cy.contains("a", "Meldungen").should("be.visible");
  });

  it("renders the deep-forest footer with club address", () => {
    cy.contains(".public-footer", "SV Alemannia Thalexweiler e.V.").should(
      "exist",
    );
    cy.contains("Alemaniastraße 21").should("exist");
    cy.contains("66822 Lebach").should("exist");
  });

  it("links to the new public routes from the footer", () => {
    cy.get(".public-footer a[href='/Impressum']").should("exist");
    cy.get(".public-footer a[href='/Datenschutzerklaerung']").should("exist");
    cy.get(".public-footer a[href='/sponsors']").should("exist");
    cy.get(".public-footer a[href='/team']").should("exist");
    cy.get(".public-footer a[href='/contact']").should("exist");
  });
});
