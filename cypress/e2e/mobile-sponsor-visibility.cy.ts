describe("Mobile sponsor visibility", () => {
  describe("phone (375x812)", () => {
    beforeEach(() => {
      cy.viewport(375, 812);
      cy.visit("/");
    });

    it("renders a sponsor rotator within the first two cards of the news gallery", () => {
      cy.get(".galleryContainer")
        .first()
        .then(($gallery) => {
          const gallery = $gallery[0];
          const visibleChildren = Array.from(gallery.children).filter(
            (child) => getComputedStyle(child as HTMLElement).display !== "none",
          ) as HTMLElement[];
          // Find the first visible sponsor card (has an <img alt="Sponsor">)
          const sponsorIndex = visibleChildren.findIndex((c) =>
            c.querySelector("img[alt='Sponsor']"),
          );
          expect(sponsorIndex, "first sponsor slot visible on mobile").to.be.lessThan(2);
        });
    });

    it("does not render the desktop news sponsor slot on mobile", () => {
      // The desktop-only sponsor is the one marked `hidden lg:block`
      cy.get(".galleryContainer")
        .first()
        .find("img[alt='Sponsor']")
        .each(($img) => {
          const root = $img[0].closest(".shrink-0") as HTMLElement;
          // Must not be the desktop-only one (display: none when hidden class applies)
          const isDesktopOnly = root.classList.contains("hidden");
          if (isDesktopOnly) {
            expect(getComputedStyle(root).display).to.equal("none");
          }
        });
    });
  });

  describe("desktop (1440x900)", () => {
    beforeEach(() => {
      cy.viewport(1440, 900);
      cy.visit("/");
    });

    it("keeps the desktop news sponsor slot at visible position 3 (fourth item)", () => {
      cy.get(".galleryContainer")
        .first()
        .then(($gallery) => {
          const gallery = $gallery[0];
          const visibleChildren = Array.from(gallery.children).filter(
            (child) => getComputedStyle(child as HTMLElement).display !== "none",
          ) as HTMLElement[];
          const sponsorIndex = visibleChildren.findIndex((c) =>
            c.querySelector("img[alt='Sponsor']"),
          );
          expect(sponsorIndex, "visible sponsor slot index on desktop").to.equal(3);
        });
    });

    it("hides the mobile-only news sponsor slot on desktop", () => {
      cy.get(".galleryContainer")
        .first()
        .find("img[alt='Sponsor']")
        .each(($img) => {
          const root = $img[0].closest(".shrink-0") as HTMLElement;
          // Mobile-only uses `lg:hidden`; at lg+ it must be display:none
          if (root.classList.contains("lg:hidden")) {
            expect(getComputedStyle(root).display).to.equal("none");
          }
        });
    });
  });
});
