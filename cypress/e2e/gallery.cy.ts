describe("Gallery Components", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  describe("News Gallery", () => {
    it("has navigation arrows on desktop", () => {
      cy.viewport(1280, 720);
      cy.get("[class*='news']")
        .find("span.material-symbols-rounded")
        .should("exist");
    });

    it("news cards link to detail pages", () => {
      cy.get(".newscardcontainer a")
        .first()
        .should("have.attr", "href")
        .and("match", /\/news\//);
    });

    it("news cards show title, tag, date, and description", () => {
      cy.get(".newscardcontainer").first().within(() => {
        cy.get("h1").should("not.be.empty");
        cy.get("h3").should("not.be.empty");
        cy.get("p").should("not.be.empty");
      });
    });

    it("news cards display images", () => {
      cy.get(".newscardcontainer img").first().should("be.visible");
    });
  });

  describe("Vorstand Gallery", () => {
    it("displays board member cards", () => {
      cy.get(".vorstandcard").should("have.length.at.least", 6);
    });

    it("board member cards show images", () => {
      cy.get(".vorstandcard img").should("have.length.at.least", 1);
    });
  });
});
