import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
// @ts-expect-error — .mjs with no types, ok for these tests
import { handler } from "../../infrastructure/lambda/fupa.mjs";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const teamSeasonFixture = {
  id: 99999,
  teamId: 1,
  slug: "sg-thalexweiler-aschbach-m1-2025-26",
  name: { full: "SG Thalex./Aschbach", middle: "SG Thalex./Aschbach", short: "SG TA" },
  competition: {
    id: 42,
    competitionSeasonId: 100,
    slug: "bezirksliga-ill",
    name: "Bezirksliga Ill/Theel",
    season: { slug: "2025-26", name: "25/26" },
  },
};

const standingsFixture = {
  standings: [
    {
      rank: 1,
      matches: 24,
      wins: 17,
      draws: 3,
      defeats: 4,
      ownGoals: 60,
      againstGoals: 20,
      goalDifference: 40,
      points: 54,
      penaltyPoints: 0,
      team: {
        slug: "sv-habach-m1-2025-26",
        clubSlug: "sv-habach",
        name: { full: "SV Habach", middle: "Habach", short: "SVH" },
        image: { path: "https://image.fupa.net/club/abc/", svg: false },
      },
    },
    {
      rank: 11,
      matches: 24,
      wins: 8,
      draws: 6,
      defeats: 10,
      ownGoals: 44,
      againstGoals: 51,
      goalDifference: -7,
      points: 30,
      penaltyPoints: 0,
      team: {
        slug: "sg-thalexweiler-aschbach-m1-2025-26",
        clubSlug: "sv-thalexweiler",
        name: { full: "SG Thalex./Aschbach", middle: "Thalex", short: "SGT" },
        image: { path: "https://image.fupa.net/team/xyz/", svg: false },
      },
    },
  ],
};

function matchAt(kickoff: string, flags: unknown = null, section = "POST") {
  return {
    id: Math.floor(Math.random() * 1e9),
    slug: `m-${kickoff}`,
    homeTeam: {
      clubSlug: "sv-thalexweiler",
      name: { full: "SG Thalex./Aschbach", short: "SGT" },
      image: { path: "https://image.fupa.net/team/x/", svg: false },
    },
    awayTeam: {
      clubSlug: "opponent",
      name: { full: "Opponent FC", short: "OFC" },
      image: { path: "https://image.fupa.net/club/o/", svg: false },
    },
    kickoff,
    homeGoal: null,
    awayGoal: null,
    flags,
    section,
    round: {
      type: "league",
      competitionSeason: { name: "Bezirksliga Ill/Theel", shortName: "BL Ill/Theel" },
    },
  };
}

describe("FuPa lambda — standings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reshapes the FuPa standings and flags the own club row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        if (url.includes("/v1/standings?competition=bezirksliga-ill"))
          return Promise.resolve(jsonResponse(standingsFixture));
        return Promise.resolve(jsonResponse({}, 500));
      }),
    );
    const res = await handler({ rawPath: "/api/fupa/standings" });
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.competition.slug).toBe("bezirksliga-ill");
    expect(body.standings).toHaveLength(2);
    expect(body.standings[0].isOwnClub).toBe(false);
    expect(body.standings[1].isOwnClub).toBe(true);
    expect(body.standings[0].team.logo).toMatch(/100x100\.png$/);
  });

  it("falls back to last-known-good snapshot when upstream fails", async () => {
    // First call succeeds and populates the cache
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse(standingsFixture));
      }),
    );
    const first = JSON.parse((await handler({ rawPath: "/api/fupa/standings" })).body);
    expect(first.standings.length).toBe(2);
    vi.advanceTimersByTime(2 * 60 * 60 * 1000); // past TTL
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 500))),
    );
    const second = JSON.parse((await handler({ rawPath: "/api/fupa/standings" })).body);
    expect(second.standings.length).toBe(2);
    expect(second.fetchedAt).toBe(first.fetchedAt);
  });
});

describe("FuPa lambda — fixtures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("only returns non-past, non-cancelled matches, sorted ascending", async () => {
    const raw = [
      matchAt("2026-04-10T13:00:00+02:00", null, "POST"), // past
      matchAt("2026-05-03T15:00:00+02:00", null, "PRE"), // future
      matchAt("2026-04-26T15:00:00+02:00", null, "PRE"), // future
      matchAt("2026-04-19T15:00:00+02:00", ["cancelled"], "PRE"), // cancelled
      matchAt("2026-04-20T15:00:00+02:00", { postponed: true }, "PRE"), // postponed
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        if (url.includes(`/v1/teams/${teamSeasonFixture.id}/matches`))
          return Promise.resolve(jsonResponse(raw));
        return Promise.resolve(jsonResponse({}, 500));
      }),
    );
    const res = await handler({ rawPath: "/api/fupa/fixtures" });
    const body = JSON.parse(res.body);
    expect(body.fixtures).toHaveLength(2);
    expect(new Date(body.fixtures[0].kickoff) < new Date(body.fixtures[1].kickoff)).toBe(true);
    expect(body.fixtures[0].ourSide).toBe("home");
    expect(body.fixtures[0].competition).toBe("Bezirksliga Ill/Theel");
  });

  it("marks a kickoff-in-progress match as live", async () => {
    const now = new Date("2026-04-19T13:30:00Z").toISOString(); // during a 15:00+02 kickoff
    vi.setSystemTime(new Date(now));
    const raw = [matchAt("2026-04-19T15:00:00+02:00", null, "PRE")];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse(raw));
      }),
    );
    const body = JSON.parse((await handler({ rawPath: "/api/fupa/fixtures" })).body);
    expect(body.fixtures).toHaveLength(1);
    expect(body.fixtures[0].live).toBe(true);
  });

  it("unknown route returns 404", async () => {
    const res = await handler({ rawPath: "/api/fupa/unknown" });
    expect(res.statusCode).toBe(404);
  });
});
