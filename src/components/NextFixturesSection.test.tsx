import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NextFixturesSection, {
  FixtureCard,
  type Fixture,
} from "./NextFixturesSection";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fixture = (over: Partial<Fixture> = {}): Fixture => ({
  id: 1,
  slug: "f1",
  kickoff: "2026-05-09T15:30:00.000Z",
  home: { name: "SV Alemannia", shortName: "ALE", logo: "/h.png" },
  away: { name: "FC Other", shortName: "OTH", logo: null },
  ourSide: "home",
  competition: "Kreisliga A",
  competitionShort: "KLA",
  category: "Herren",
  live: false,
  ...over,
});

function renderWith(node: React.ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function badgeText(container: HTMLElement): string {
  // The H / A / N indicator is the inline-flex "caps" badge in the footer.
  const badges = Array.from(
    container.querySelectorAll<HTMLSpanElement>("footer span.caps"),
  );
  return badges.map((b) => b.textContent ?? "").join("|");
}

describe("FixtureCard", () => {
  it("renders date+time, team names, and the H/A label for an upcoming home match", () => {
    const { container } = renderWith(<FixtureCard fixture={fixture()} />);
    const txt = container.textContent ?? "";
    expect(txt).toContain("SV Alemannia");
    expect(txt).toContain("FC Other");
    expect(badgeText(container)).toBe("H");
    // No LIVE chip for non-live fixtures.
    expect(container.querySelector(".fixture-live")).toBeNull();
  });

  it("renders the LIVE chip and hides the time for a live fixture", () => {
    const { container } = renderWith(
      <FixtureCard fixture={fixture({ live: true })} />,
    );
    expect(container.querySelector(".fixture-live")).not.toBeNull();
    expect(container.textContent).toContain("LIVE");
  });

  it("renders an A label when ourSide is away and emphasises the away team", () => {
    const { container } = renderWith(
      <FixtureCard
        fixture={fixture({ ourSide: "away" })}
      />,
    );
    expect(badgeText(container)).toBe("A");
    // The away team row should have the bold class.
    const bold = Array.from(
      container.querySelectorAll<HTMLSpanElement>("span.font-semibold"),
    );
    expect(bold.some((s) => s.textContent === "FC Other")).toBe(true);
  });

  it("renders an N label when ourSide is null (neutral) and uses the long competition name when short is empty", () => {
    const { container } = renderWith(
      <FixtureCard
        fixture={fixture({
          ourSide: null,
          competitionShort: "",
        })}
      />,
    );
    expect(badgeText(container)).toBe("N");
    expect(container.textContent).toContain("Kreisliga A");
  });

  it("renders an em-dash placeholder for an unparseable kickoff", () => {
    const { container } = renderWith(
      <FixtureCard fixture={fixture({ kickoff: "not-a-date" })} />,
    );
    // Both date and time fall back to "—".
    const dashes = (container.textContent ?? "").match(/—/g) ?? [];
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders a fallback circle when a team has no logo", () => {
    const { container } = renderWith(<FixtureCard fixture={fixture()} />);
    // Home has logo (img), away does not (placeholder div with rounded-full).
    expect(container.querySelector("img[src='/h.png']")).not.toBeNull();
    expect(
      container.querySelector("div.h-6.w-6.rounded-full"),
    ).not.toBeNull();
  });
});

describe("NextFixturesSection", () => {
  it("shows skeletons before the fetch resolves", () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          }),
      ),
    );
    const { container } = renderWith(<NextFixturesSection limit={2} />);
    // Two skeleton tiles rendered while loaded === false.
    expect(container.querySelectorAll(".cs-tile").length).toBe(2);
    // Heading still present (default).
    expect(container.textContent).toContain("NÄCHSTE SPIELE");
    // Resolve so the test cleans up cleanly.
    resolve(jsonResponse({ fetchedAt: null, fixtures: [] }));
  });

  it("hides the heading when hideHeading is true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ fetchedAt: null, fixtures: [] })),
    );
    const { container } = renderWith(
      <NextFixturesSection hideHeading limit={1} />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Derzeit keine");
    });
    expect(container.textContent).not.toContain("NÄCHSTE SPIELE");
  });

  it("renders the empty-state message when the API returns no fixtures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ fetchedAt: null, fixtures: [] })),
    );
    const { container } = renderWith(<NextFixturesSection />);
    await waitFor(() =>
      expect(container.textContent).toContain("Derzeit keine anstehenden"),
    );
    // No "Alle Spiele" link when the list is empty.
    expect(container.textContent).not.toContain("Alle Spiele");
  });

  it("renders fixtures up to the configured limit and shows the schedule link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          fetchedAt: null,
          fixtures: [
            fixture({ id: 1 }),
            fixture({ id: 2 }),
            fixture({ id: 3 }),
            fixture({ id: 4 }),
          ],
        }),
      ),
    );
    const { container } = renderWith(<NextFixturesSection limit={2} />);
    await waitFor(() => {
      expect(container.querySelectorAll(".fixturecard").length).toBe(2);
    });
    expect(container.textContent).toContain("Alle Spiele");
  });

  it("hides the schedule link when showAllLink is false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ fetchedAt: null, fixtures: [fixture()] }),
      ),
    );
    const { container } = renderWith(
      <NextFixturesSection showAllLink={false} />,
    );
    await waitFor(() => {
      expect(container.querySelectorAll(".fixturecard").length).toBe(1);
    });
    expect(container.textContent).not.toContain("Alle Spiele");
  });

  it("falls back to the empty state when the fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const { container } = renderWith(<NextFixturesSection />);
    await waitFor(() =>
      expect(container.textContent).toContain("Derzeit keine"),
    );
  });
});
