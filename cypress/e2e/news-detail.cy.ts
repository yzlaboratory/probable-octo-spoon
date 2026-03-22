describe("News Detail Page", () => {
  // Use the first news entry path from news.json
  const testPath = "dreikampf2026-02-14";

  beforeEach(() => {
    cy.visit(`/news/${testPath}`);
  });

  it("loads successfully", () => {
    cy.get("body").should("be.visible");
  });

  it("displays the news title", () => {
    cy.get("h1").should("be.visible").and("not.be.empty");
  });

  it("displays the article tag", () => {
    cy.contains("FESTLICHKEIT").should("be.visible");
  });

  it("displays the article image", () => {
    cy.get("img[alt='Portrait']").should("be.visible");
  });

  it("displays the long-form article text", () => {
    cy.contains("Dreikampf").scrollIntoView().should("be.visible");
  });

  it("includes the header", () => {
    cy.contains("SVALEMANNIA").should("be.visible");
  });

  it("includes the footer", () => {
    cy.contains("SV Alemannia Thalexweiler").should("exist");
  });

  it("all news paths are accessible", () => {
    const paths = [
      "websitedev2025-02-20",
      "dreikampf2025-01-24",
      "fuenfkampf2025-05-07",
      "kirmes2025-06-12",
      "dreikampf2026-02-14",
    ];

    for (const path of paths) {
      cy.request(`/news/${path}`).its("status").should("eq", 200);
    }
  });
});
