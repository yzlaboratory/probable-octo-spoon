describe("Public navigation", () => {
  it("navigates to Impressum via the footer", () => {
    cy.visit("/");
    cy.get(".public-footer a[href='/Impressum']").click({ force: true });
    cy.url().should("include", "/Impressum");
    cy.contains("Impressum.").should("be.visible");
  });

  it("navigates to Datenschutzerklärung via the footer", () => {
    cy.visit("/");
    cy.get(".public-footer a[href='/Datenschutzerklaerung']").click({
      force: true,
    });
    cy.url().should("include", "/Datenschutzerklaerung");
  });

  it("returns to the homepage via the wordmark link", () => {
    cy.visit("/Impressum");
    cy.get(".public-header a[aria-label='Startseite']").click({ force: true });
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("navigates to /team via the desktop nav", () => {
    cy.viewport(1440, 900);
    cy.visit("/");
    cy.get(".public-nav a[href='/team']").click();
    cy.url().should("include", "/team");
    cy.contains("Mannschaften.").should("be.visible");
  });

  it("navigates to /sponsors via the desktop nav", () => {
    cy.viewport(1440, 900);
    cy.visit("/");
    cy.get(".public-nav a[href='/sponsors']").click();
    cy.url().should("include", "/sponsors");
    cy.contains("Unsere Partner.").should("be.visible");
  });

  it("navigates to /contact via the desktop nav", () => {
    cy.viewport(1440, 900);
    cy.visit("/");
    cy.get(".public-nav a[href='/contact']").click();
    cy.url().should("include", "/contact");
    cy.contains("Kontakt.").should("be.visible");
  });
});
