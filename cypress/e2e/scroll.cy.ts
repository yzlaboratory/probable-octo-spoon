describe("Page Scrolling", () => {
  it("homepage scroll container is scrollable with mouse wheel", () => {
    cy.visit("/");
    // The overflow-auto container must have a constrained height
    // and scrollHeight > clientHeight to be user-scrollable
    cy.get("[class*='overflow-auto']").first().then(($el) => {
      expect($el[0].scrollHeight).to.be.greaterThan($el[0].clientHeight);
    });
  });

  it("homepage footer is reachable by scrolling", () => {
    cy.visit("/");
    cy.get(".allsponsors").scrollIntoView({ duration: 0 });
    cy.get(".allsponsors").should("be.visible");
  });

  it("Impressum page is scrollable to reach the footer", () => {
    cy.visit("/Impressum");
    cy.get(".allsponsors").scrollIntoView({ duration: 0 });
    cy.get(".allsponsors").should("be.visible");
  });

  it("Datenschutzerklaerung page is scrollable to reach the footer", () => {
    cy.visit("/Datenschutzerklaerung");
    cy.get(".allsponsors").scrollIntoView({ duration: 0 });
    cy.get(".allsponsors").should("be.visible");
  });

  it("news detail page is scrollable to reach the footer", () => {
    cy.visit("/news/dreikampf2026-02-14");
    cy.get(".allsponsors").scrollIntoView({ duration: 0 });
    cy.get(".allsponsors").should("be.visible");
  });
});
