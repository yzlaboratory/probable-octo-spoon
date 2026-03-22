describe("Responsive Design", () => {
  const viewports: Array<[string, number, number]> = [
    ["mobile", 375, 667],
    ["tablet", 768, 1024],
    ["desktop", 1280, 720],
  ];

  for (const [name, width, height] of viewports) {
    describe(`${name} (${width}x${height})`, () => {
      beforeEach(() => {
        cy.viewport(width, height);
        cy.visit("/");
      });

      it("loads without horizontal overflow", () => {
        cy.document().then((doc) => {
          expect(doc.documentElement.scrollWidth).to.be.at.most(
            doc.documentElement.clientWidth + 1,
          );
        });
      });

      it("header is visible", () => {
        cy.contains("SVALEMANNIA").should("be.visible");
      });

      it("news section is visible", () => {
        cy.contains("ALEMANNIA NEWS").should("be.visible");
      });

      it("footer is present", () => {
        cy.contains("SV Alemannia Thalexweiler").should("exist");
      });
    });
  }
});
