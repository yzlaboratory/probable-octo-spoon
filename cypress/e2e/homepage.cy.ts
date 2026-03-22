describe("Homepage", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("loads successfully", () => {
    cy.get("body").should("be.visible");
  });

  it("displays the header with club name", () => {
    cy.contains("SVALEMANNIA").should("be.visible");
    cy.contains("THALEXWEILER").should("be.visible");
  });

  it("displays the club logo in the header", () => {
    cy.get("header img, div img")
      .first()
      .should("be.visible")
      .and("have.attr", "alt", "Club Logo.");
  });

  it("displays the ALEMANNIA NEWS section", () => {
    cy.contains("ALEMANNIA NEWS").should("be.visible");
  });

  it("displays news cards", () => {
    cy.get(".newscardcontainer").should("have.length.at.least", 1);
  });

  it("displays the SOCIALS section", () => {
    cy.contains("SOCIALS").scrollIntoView().should("be.visible");
  });

  it("displays the VORSTAND section", () => {
    cy.contains("VORSTAND").scrollIntoView().should("be.visible");
  });

  it("displays board member cards", () => {
    cy.get(".vorstandcard").should("have.length.at.least", 1);
  });

  it("displays the footer", () => {
    cy.contains("SV Alemannia Thalexweiler").should("exist");
    cy.contains("Alemaniastraße 21").should("exist");
    cy.contains("66822 Lebach").should("exist");
  });

  it("footer contains navigation links", () => {
    cy.get("a[href='/']").should("exist");
    cy.get("a[href='/Impressum']").should("exist");
    cy.get("a[href='/Datenschutzerklaerung']").should("exist");
  });

  it("footer displays sponsor logos", () => {
    cy.get(".allsponsors img").should("have.length.at.least", 5);
  });

  it("has Instagram link in header", () => {
    cy.get("a[href='https://www.instagram.com/sgthalexweileraschbach/']")
      .should("exist");
  });
});
