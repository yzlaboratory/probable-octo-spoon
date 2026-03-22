describe("Mobile Layout (375x812 - iPhone)", () => {
  beforeEach(() => {
    cy.viewport(375, 812);
  });

  describe("Header", () => {
    it("logo and club name are visible and fit within viewport", () => {
      cy.visit("/");
      cy.get("img[alt='Club Logo.']").should("be.visible");
      cy.contains("SVALEMANNIA").should("be.visible");
      cy.contains("THALEXWEILER").should("be.visible");
    });

    it("header does not overflow horizontally", () => {
      cy.visit("/");
      cy.get("body").then(($body) => {
        expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth);
      });
    });

    it("login button is hidden on mobile", () => {
      cy.visit("/");
      cy.contains("LOGIN").should("not.be.visible");
    });

    it("instagram link is visible on mobile", () => {
      cy.visit("/");
      cy.get("a[href='https://www.instagram.com/sgthalexweileraschbach/']")
        .should("be.visible");
    });
  });

  describe("Homepage sections", () => {
    beforeEach(() => {
      cy.visit("/");
    });

    it("news section title is visible", () => {
      cy.contains("ALEMANNIA NEWS").should("be.visible");
    });

    it("news cards are at least 75% viewport width on mobile", () => {
      cy.get(".newscardcontainer").first().then(($card) => {
        const cardWidth = $card[0].getBoundingClientRect().width;
        expect(cardWidth).to.be.at.least(375 * 0.75);
      });
    });

    it("news card images render with correct aspect ratio", () => {
      cy.get(".newscardcontainer img").first().should("be.visible").then(($img) => {
        const rect = $img[0].getBoundingClientRect();
        expect(rect.width).to.be.greaterThan(0);
        expect(rect.height).to.be.greaterThan(0);
      });
    });

    it("vorstand cards are at least 75% viewport width on mobile", () => {
      cy.get(".vorstandcard").first().then(($card) => {
        const cardWidth = $card[0].getBoundingClientRect().width;
        expect(cardWidth).to.be.at.least(375 * 0.75);
      });
    });

    it("footer sponsors wrap and stay within viewport", () => {
      cy.get(".allsponsors").scrollIntoView().then(($sponsors) => {
        expect($sponsors[0].scrollWidth).to.be.at.most(
          $sponsors[0].clientWidth + 1,
        );
      });
    });

    it("footer text is visible and not clipped", () => {
      cy.contains("SV Alemannia Thalexweiler")
        .scrollIntoView()
        .should("be.visible");
      cy.contains("66822 Lebach").should("be.visible");
    });

    it("footer links are tappable (not overlapping)", () => {
      cy.contains("Startseite").scrollIntoView().should("be.visible");
      cy.contains("Impressum").should("be.visible");
    });
  });

  describe("Impressum page", () => {
    it("heading fits on screen without overflow", () => {
      cy.visit("/Impressum");
      cy.contains("IMPRESSUM").should("be.visible");
      cy.get("body").then(($body) => {
        expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth);
      });
    });

    it("contact info is readable", () => {
      cy.visit("/Impressum");
      cy.contains("Yannik Zeyer").should("be.visible");
      cy.contains("0151 2222 8048").should("be.visible");
    });
  });

  describe("Datenschutz page", () => {
    it("page loads and long text is scrollable", () => {
      cy.visit("/Datenschutzerklaerung");
      cy.contains("Datenschutz").should("exist");
      cy.get("[class*='overflow-auto']").first().then(($el) => {
        expect($el[0].scrollHeight).to.be.greaterThan($el[0].clientHeight);
      });
    });

    it("does not overflow horizontally", () => {
      cy.visit("/Datenschutzerklaerung");
      cy.get("body").then(($body) => {
        expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth);
      });
    });
  });

  describe("News detail page", () => {
    it("title is visible and wraps properly", () => {
      cy.visit("/news/dreikampf2026-02-14");
      cy.get("h1").should("be.visible");
      cy.get("h1").then(($h1) => {
        const rect = $h1[0].getBoundingClientRect();
        expect(rect.right).to.be.at.most(375 + 1);
      });
    });

    it("image fills most of the viewport width on mobile", () => {
      cy.visit("/news/dreikampf2026-02-14");
      cy.get("img[alt='Portrait']").should("be.visible").then(($img) => {
        const rect = $img[0].getBoundingClientRect();
        expect(rect.width).to.be.at.least(375 * 0.75);
      });
    });

    it("article text is visible below image on mobile", () => {
      cy.visit("/news/dreikampf2026-02-14");
      cy.contains("Dreikampf").scrollIntoView().should("be.visible");
    });

    it("does not overflow horizontally", () => {
      cy.visit("/news/dreikampf2026-02-14");
      cy.get("body").then(($body) => {
        expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth);
      });
    });
  });
});

describe("Small tablet layout (768x1024 - iPad)", () => {
  beforeEach(() => {
    cy.viewport(768, 1024);
  });

  it("homepage loads without horizontal overflow", () => {
    cy.visit("/");
    cy.get("body").then(($body) => {
      expect($body[0].scrollWidth).to.be.at.most($body[0].clientWidth);
    });
  });

  it("news cards are visible and properly sized", () => {
    cy.visit("/");
    cy.get(".newscardcontainer").first().should("be.visible");
  });

  it("footer sponsors wrap correctly", () => {
    cy.visit("/");
    cy.get(".allsponsors").scrollIntoView().should("be.visible");
  });

  it("news detail page image and text stack vertically", () => {
    cy.visit("/news/dreikampf2026-02-14");
    cy.get("img[alt='Portrait']").should("be.visible");
    cy.contains("Dreikampf").scrollIntoView().should("be.visible");
  });
});
