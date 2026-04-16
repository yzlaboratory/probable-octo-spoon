const standingsFixture = {
  fetchedAt: "2026-04-16T10:00:00.000Z",
  competition: {
    slug: "bezirksliga-ill",
    name: "Bezirksliga Ill/Theel",
    season: "25/26",
  },
  standings: [
    {
      rank: 1,
      matches: 24,
      wins: 17,
      draws: 3,
      defeats: 4,
      goalsFor: 60,
      goalsAgainst: 20,
      goalDifference: 40,
      points: 54,
      penaltyPoints: 0,
      team: {
        slug: "sv-habach-m1-2025-26",
        clubSlug: "sv-habach",
        name: "SV Habach",
        shortName: "SVH",
        logo: null,
      },
      isOwnClub: false,
    },
    {
      rank: 11,
      matches: 24,
      wins: 8,
      draws: 6,
      defeats: 10,
      goalsFor: 44,
      goalsAgainst: 51,
      goalDifference: -7,
      points: 30,
      penaltyPoints: 0,
      team: {
        slug: "sg-thalexweiler-aschbach-m1-2025-26",
        clubSlug: "sv-thalexweiler",
        name: "SG Thalex./Aschbach",
        shortName: "SGT",
        logo: null,
      },
      isOwnClub: true,
    },
  ],
};

const fixturesFixture = {
  fetchedAt: "2026-04-16T10:00:00.000Z",
  fixtures: [
    {
      id: 1,
      slug: "sv-thalexweiler-m1-sc-heiligenwald-m1-260419",
      kickoff: "2026-04-19T15:00:00+02:00",
      home: {
        name: "SG Thalex./Aschbach",
        shortName: "SGT",
        clubSlug: "sv-thalexweiler",
        logo: null,
      },
      away: {
        name: "SC Heiligenwald",
        shortName: "SCH",
        clubSlug: "sc-heiligenwald",
        logo: null,
      },
      ourSide: "home",
      competition: "Bezirksliga Ill/Theel",
      competitionShort: "BL Ill/Theel",
      category: "Liga",
      live: false,
    },
    {
      id: 2,
      slug: "sv-bubach-calmesweiler-m1-sv-thalexweiler-m1-260426",
      kickoff: "2026-04-26T15:00:00+02:00",
      home: {
        name: "SV Bubach-Calmesweiler",
        shortName: "SBC",
        clubSlug: "sv-bubach-calmesweiler",
        logo: null,
      },
      away: {
        name: "SG Thalex./Aschbach",
        shortName: "SGT",
        clubSlug: "sv-thalexweiler",
        logo: null,
      },
      ourSide: "away",
      competition: "Bezirksliga Ill/Theel",
      competitionShort: "BL Ill/Theel",
      category: "Liga",
      live: false,
    },
  ],
};

describe("FuPa standings + fixtures", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/fupa/standings", standingsFixture).as("standings");
    cy.intercept("GET", "/api/fupa/fixtures", fixturesFixture).as("fixtures");
  });

  describe("homepage order", () => {
    it("renders sections in the canonical order (news → fixtures → standings → training → socials → vorstand)", () => {
      cy.viewport(1440, 900);
      cy.visit("/");
      cy.wait("@fixtures");
      cy.wait("@standings");

      cy.document().then((doc) => {
        const titles = Array.from(doc.querySelectorAll("h1")).map(
          (h) => h.textContent?.trim() ?? "",
        );
        const order = [
          "ALEMANNIA NEWS",
          "NÄCHSTE SPIELE",
          "TABELLE",
          "TRAINING",
          "SOCIALS",
          "VORSTAND",
        ];
        const indices = order.map((t) => titles.indexOf(t));
        for (let i = 0; i < indices.length; i++) expect(indices[i]).to.be.greaterThan(-1);
        for (let i = 1; i < indices.length; i++)
          expect(indices[i]).to.be.greaterThan(indices[i - 1]);
      });
    });
  });

  describe("TABELLE section", () => {
    beforeEach(() => {
      cy.viewport(1440, 900);
      cy.visit("/");
      cy.wait("@standings");
    });

    it("renders 16-column header and the right row count", () => {
      cy.get(".leaguetable thead").contains("#");
      cy.get(".leaguetable tbody tr").should("have.length", 2);
    });

    it("highlights the own club's row", () => {
      cy.get("[data-own-club='true']").should("have.length", 1);
      cy.get("[data-own-club='true']").contains("SG Thalex./Aschbach");
    });

    it("shows the last-updated timestamp", () => {
      cy.contains("zuletzt aktualisiert");
    });
  });

  describe("NÄCHSTE SPIELE section", () => {
    beforeEach(() => {
      cy.viewport(1440, 900);
      cy.visit("/");
      cy.wait("@fixtures");
    });

    it("renders fixture cards with kickoff, teams, H/A tag and competition", () => {
      cy.get(".fixturecard").should("have.length", 2);
      cy.get(".fixturecard").first().within(() => {
        cy.contains("So. 19.04.26");
        cy.contains("15:00");
        cy.contains("SG Thalex./Aschbach");
        cy.contains("SC Heiligenwald");
        cy.contains("H");
        cy.contains("Liga");
      });
    });

    it("links to /spiele via 'Alle Spiele'", () => {
      cy.contains("Alle Spiele").should("have.attr", "href", "/spiele");
    });
  });

  describe("/spiele page", () => {
    beforeEach(() => {
      cy.intercept("GET", "/api/fupa/fixtures", fixturesFixture).as("fixtures");
      cy.visit("/spiele");
      cy.wait("@fixtures");
    });

    it("has a SPIELE heading and lists fixtures grouped by month", () => {
      cy.get("h1").contains("SPIELE");
      cy.contains("April 2026");
      cy.get(".fixturecard").should("have.length", 2);
    });
  });

  describe("empty/error states", () => {
    it("shows placeholder when standings API returns empty", () => {
      cy.intercept("GET", "/api/fupa/standings", {
        fetchedAt: null,
        competition: null,
        standings: [],
      }).as("empty");
      cy.visit("/");
      cy.wait("@empty");
      cy.contains("Tabelle derzeit nicht verfügbar");
    });

    it("shows placeholder when fixtures API returns empty", () => {
      cy.intercept("GET", "/api/fupa/fixtures", {
        fetchedAt: null,
        fixtures: [],
      }).as("empty");
      cy.visit("/");
      cy.wait("@empty");
      cy.contains("Derzeit keine anstehenden Spiele");
    });
  });
});
