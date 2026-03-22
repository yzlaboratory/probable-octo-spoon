describe("Navigation", () => {
  it("navigates from homepage to Impressum via footer link", () => {
    cy.visit("/");
    cy.get("a[href='/Impressum']").first().click({ force: true });
    cy.url().should("include", "/Impressum");
    cy.contains("IMPRESSUM").should("be.visible");
  });

  it("navigates from homepage to Datenschutzerklaerung via footer link", () => {
    cy.visit("/");
    cy.get("a[href='/Datenschutzerklaerung']").first().click({ force: true });
    cy.url().should("include", "/Datenschutzerklaerung");
  });

  it("navigates back to homepage from Impressum via Startseite link", () => {
    cy.visit("/Impressum");
    cy.get("a[href='/']").first().click({ force: true });
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  });

  it("navigates to a news detail page by clicking a news card", () => {
    cy.visit("/");
    cy.get(".newscardcontainer a").first().click();
    cy.url().should("include", "/news/");
  });
});
