describe("Training times", () => {
  describe("homepage", () => {
    it("renders the TRAINING section between NEWS and SOCIALS", () => {
      cy.viewport(1440, 900);
      cy.visit("/");
      cy.contains("ALEMANNIA NEWS");
      cy.contains("TRAINING").should("exist");
      cy.contains("SOCIALS").should("exist");

      cy.document().then((doc) => {
        const headings = Array.from(doc.querySelectorAll("h1")).map(
          (h) => h.textContent?.trim() ?? "",
        );
        const news = headings.indexOf("ALEMANNIA NEWS");
        const training = headings.indexOf("TRAINING");
        const socials = headings.indexOf("SOCIALS");
        expect(news).to.be.greaterThan(-1);
        expect(training).to.be.greaterThan(news);
        expect(socials).to.be.greaterThan(training);
      });
    });

    it("shows weekday headers for all seven days", () => {
      cy.viewport(1440, 900);
      cy.visit("/");
      ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
        .forEach((day) => cy.get(".trainingsection").contains(day));
    });
  });

  describe("/training page", () => {
    beforeEach(() => cy.visit("/training"));

    it("has a TRAINING page heading", () => {
      cy.get("h1").contains("TRAINING").should("be.visible");
    });

    it("renders slot cards with time, trainer and visibility chip", () => {
      cy.get(".trainingslot").should("have.length.greaterThan", 0);
      cy.get(".trainingslot")
        .first()
        .within(() => {
          cy.contains(/^\d{2}:\d{2}/);
          cy.contains("Trainer:");
          cy.get("a[href^='tel:']").should("exist");
          cy.contains(/offen für Gäste|Anmeldung erforderlich|nur Mitglieder/);
        });
    });

    it("phone numbers are tappable via tel:", () => {
      cy.get(".trainingslot a[href^='tel:']")
        .first()
        .should("have.attr", "href")
        .and("match", /^tel:\+?\d+$/);
    });

    it("marks an 'Alte Herren' slot as 'offen für Gäste'", () => {
      cy.get(".trainingslot")
        .contains("Alte Herren")
        .closest(".trainingslot")
        .contains("offen für Gäste");
    });
  });

  describe("mobile /training page (375x812)", () => {
    beforeEach(() => {
      cy.viewport(375, 812);
      cy.visit("/training");
    });

    it("page renders and does not overflow horizontally at the document level", () => {
      cy.get("body").then(($body) => {
        expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth);
      });
    });

    it("training grid is horizontally scrollable on mobile", () => {
      cy.get(".trainingsection .hidescrollbar").then(($el) => {
        expect($el[0].scrollWidth).to.be.greaterThan($el[0].clientWidth);
      });
    });
  });
});
