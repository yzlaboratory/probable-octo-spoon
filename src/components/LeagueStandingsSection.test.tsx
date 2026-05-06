import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import LeagueStandingsSection from "./LeagueStandingsSection";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const row = (over: Record<string, unknown> = {}) => ({
  rank: 1,
  matches: 10,
  wins: 7,
  draws: 2,
  defeats: 1,
  goalsFor: 25,
  goalsAgainst: 8,
  goalDifference: 17,
  points: 23,
  penaltyPoints: 0,
  team: {
    slug: "alemannia",
    name: "SV Alemannia",
    shortName: "ALE",
    logo: "/a.png",
  },
  isOwnClub: true,
  ...over,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LeagueStandingsSection", () => {
  it("shows ten skeleton rows while the standings are loading", () => {
    let _resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((r) => {
            _resolve = r;
          }),
      ),
    );
    const { container } = render(<LeagueStandingsSection />);
    const skeletons = container.querySelectorAll("tbody tr");
    expect(skeletons.length).toBe(10);
    expect(container.textContent).toContain("TABELLE");
    expect(container.textContent).toContain("zuletzt aktualisiert: unbekannt");
  });

  it("shows the empty-state row when /api/fupa/standings returns no rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ fetchedAt: null, competition: null, standings: [] }),
      ),
    );
    const { container } = render(<LeagueStandingsSection />);
    await waitFor(() =>
      expect(container.textContent).toContain(
        "Tabelle derzeit nicht verfügbar",
      ),
    );
  });

  it("formats the fetchedAt timestamp as German dd.mm.yyyy and shows the competition meta", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          fetchedAt: "2026-04-30T12:00:00Z",
          competition: { slug: "kla", name: "Kreisliga A", season: "25/26" },
          standings: [],
        }),
      ),
    );
    const { container } = render(<LeagueStandingsSection />);
    await waitFor(() =>
      expect(container.textContent).toContain("Kreisliga A · Saison 25/26"),
    );
    expect(container.textContent).toMatch(/30\.04\.2026/);
  });

  it("renders 'unbekannt' for a malformed fetchedAt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          fetchedAt: "garbage",
          competition: null,
          standings: [],
        }),
      ),
    );
    const { container } = render(<LeagueStandingsSection />);
    await waitFor(() =>
      expect(container.textContent).toContain("zuletzt aktualisiert: unbekannt"),
    );
  });

  it("renders one row per standing, marks the own club, and renders a + sign for positive goal difference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          fetchedAt: null,
          competition: null,
          standings: [
            row({ team: { ...row().team, slug: "alemannia" } }),
            row({
              rank: 2,
              isOwnClub: false,
              goalDifference: -3,
              team: {
                slug: "other",
                name: "FC Other",
                shortName: "OTH",
                logo: null,
              },
            }),
          ],
        }),
      ),
    );
    const { container } = render(<LeagueStandingsSection />);
    await waitFor(() =>
      expect(container.querySelectorAll("tr[data-own-club]").length).toBe(2),
    );
    const ownClub = container.querySelector(
      "tr[data-own-club='true']",
    ) as HTMLTableRowElement;
    expect(ownClub.textContent).toContain("SV Alemannia");
    expect(ownClub.textContent).toContain("+17");
    const other = container.querySelector(
      "tr[data-own-club='false']",
    ) as HTMLTableRowElement;
    expect(other.textContent).toContain("FC Other");
    // Negative diff is rendered as-is, no leading +.
    expect(other.textContent).toContain("-3");
    // Own club has a logo image; the other row's logo is null and renders no img.
    expect(ownClub.querySelector("img")).not.toBeNull();
    expect(other.querySelector("img")).toBeNull();
  });

  it("hides its eyebrow heading when hideHeading is true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ fetchedAt: null, competition: null, standings: [] }),
      ),
    );
    const { container } = render(<LeagueStandingsSection hideHeading />);
    await waitFor(() =>
      expect(container.textContent).toContain("Tabelle derzeit nicht"),
    );
    expect(container.textContent).not.toContain("TABELLE");
  });

  it("falls back to the empty state when the fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const { container } = render(<LeagueStandingsSection />);
    await waitFor(() =>
      expect(container.textContent).toContain(
        "Tabelle derzeit nicht verfügbar",
      ),
    );
  });
});
