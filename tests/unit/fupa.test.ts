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

  it("isCancelled returns false for non-string/array/object flag values (numbers etc)", async () => {
    const raw = [matchAt("2099-12-31T15:00:00+02:00", 42, "PRE")];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse(raw));
      }),
    );
    const h = await freshHandler();
    const body = JSON.parse((await h({ rawPath: "/api/fupa/fixtures" })).body);
    // Number flag → falls through to `return false` → match is NOT cancelled.
    expect(body.fixtures).toHaveLength(1);
  });

  it("isCancelled handles a string flag like 'postponed'", async () => {
    const raw = [matchAt("2026-04-26T15:00:00+02:00", "postponed", "PRE")];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse(raw));
      }),
    );
    const h = await freshHandler();
    const body = JSON.parse((await h({ rawPath: "/api/fupa/fixtures" })).body);
    expect(body.fixtures).toHaveLength(0);
  });

  it("falls back to event.path when rawPath is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse([]));
      }),
    );
    const h = await freshHandler();
    const res = await h({ path: "/api/fupa/fixtures" });
    expect(res.statusCode).toBe(200);
  });

  async function freshHandler(): Promise<typeof handler> {
    vi.resetModules();
    const mod = (await import("../../infrastructure/lambda/fupa.mjs")) as {
      handler: typeof handler;
    };
    return mod.handler;
  }

  it("returns the empty payload shape when the upstream first call fails (no cache)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 500))),
    );
    const h = await freshHandler();
    const res = await h({ rawPath: "/api/fupa/standings" });
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.standings).toEqual([]);
    expect(body.competition).toBeNull();
    expect(body.fetchedAt).toBeNull();
  });

  it("emits svg logo URLs when team.image.svg is true", async () => {
    const standingsSvg = {
      standings: [
        {
          rank: 1,
          matches: 1,
          wins: 1,
          draws: 0,
          defeats: 0,
          ownGoals: 1,
          againstGoals: 0,
          goalDifference: 1,
          points: 3,
          team: {
            slug: "x",
            clubSlug: "other",
            // Tests `r.team?.name?.middle` fallback (no .full).
            name: { middle: "MidName" },
            image: { path: "https://image.fupa.net/club/svg/", svg: true },
          },
        },
        {
          rank: 2,
          matches: 1,
          wins: 0,
          draws: 0,
          defeats: 1,
          ownGoals: 0,
          againstGoals: 1,
          goalDifference: -1,
          points: 0,
          team: {
            slug: "no-image",
            clubSlug: "another",
            // Both .full and .middle missing — exercises final "" fallback.
            name: {},
            // No image at all — exercises null logo branch.
          },
        },
      ],
    };
    const h = await freshHandler();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse(standingsSvg));
      }),
    );
    const body = JSON.parse((await h({ rawPath: "/api/fupa/standings" })).body);
    expect(body.standings[0].team.logo).toMatch(/100x100\.svg$/);
    expect(body.standings[0].team.name).toBe("MidName");
    expect(body.standings[1].team.logo).toBeNull();
    expect(body.standings[1].team.name).toBe("");
  });

  it("classifies cup matches as 'Pokal' and missing image paths as null", async () => {
    const cupMatch = {
      id: 1,
      slug: "cup-1",
      kickoff: "2099-12-31T15:00:00+02:00",
      homeTeam: {
        clubSlug: "opponent",
        name: { full: "Heim FC", short: "HFC" },
        // No image — exercises null logo branch.
      },
      awayTeam: {
        clubSlug: "sv-thalexweiler",
        name: { full: "SG Thalex.", short: "SGT" },
        // No image — exercises null logo branch.
      },
      flags: null,
      section: "PRE",
      round: {
        type: "cup",
        competitionSeason: { name: "Pokal", shortName: "Pokal" },
      },
    };
    const h = await freshHandler();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse([cupMatch]));
      }),
    );
    const body = JSON.parse((await h({ rawPath: "/api/fupa/fixtures" })).body);
    expect(body.fixtures).toHaveLength(1);
    expect(body.fixtures[0].category).toBe("Pokal");
    expect(body.fixtures[0].ourSide).toBe("away");
    expect(body.fixtures[0].home.logo).toBeNull();
    expect(body.fixtures[0].away.logo).toBeNull();
  });

  it("classifies an unknown round type as 'Liga' (default)", async () => {
    const friendly = {
      id: 2,
      slug: "f-1",
      kickoff: "2099-12-31T15:00:00+02:00",
      homeTeam: {
        clubSlug: "neutral",
        name: { full: "X", short: "X" },
      },
      awayTeam: {
        clubSlug: "neutral2",
        name: { full: "Y", short: "Y" },
      },
      flags: null,
      section: "PRE",
      round: {
        type: "friendly",
        competitionSeason: { name: "Friendly", shortName: "F" },
      },
    };
    const h = await freshHandler();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse([friendly]));
      }),
    );
    const body = JSON.parse((await h({ rawPath: "/api/fupa/fixtures" })).body);
    expect(body.fixtures).toHaveLength(1);
    expect(body.fixtures[0].category).toBe("Liga");
    // Neither home nor away is the club → ourSide is null.
    expect(body.fixtures[0].ourSide).toBeNull();
  });

  it("standings returns null-shaped payload when team has no competition slug", async () => {
    const h = await freshHandler();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse({ id: 1, competition: null }));
        return Promise.resolve(jsonResponse({}, 500));
      }),
    );
    const body = JSON.parse((await h({ rawPath: "/api/fupa/standings" })).body);
    expect(body.standings).toEqual([]);
  });

  it("fixtures returns empty payload when the team has no id", async () => {
    const h = await freshHandler();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse({ slug: "no-id" })); // no id
        return Promise.resolve(jsonResponse({}, 500));
      }),
    );
    const body = JSON.parse((await h({ rawPath: "/api/fupa/fixtures" })).body);
    expect(body.fixtures).toEqual([]);
  });

  it("standings serves a cached payload within the TTL window", async () => {
    const h = await freshHandler();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        calls += 1;
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse(standingsFixture));
      }),
    );
    await h({ rawPath: "/api/fupa/standings" });
    const callsAfterPrime = calls;
    // Second call within TTL — should not refetch.
    await h({ rawPath: "/api/fupa/standings" });
    expect(calls).toBe(callsAfterPrime);
  });

  it("fixtures serves a cached payload within the TTL window", async () => {
    const h = await freshHandler();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        calls += 1;
        if (url.endsWith("/v1/teams/sv-thalexweiler-m1"))
          return Promise.resolve(jsonResponse(teamSeasonFixture));
        return Promise.resolve(jsonResponse([]));
      }),
    );
    await h({ rawPath: "/api/fupa/fixtures" });
    const callsAfterPrime = calls;
    await h({ rawPath: "/api/fupa/fixtures" });
    expect(calls).toBe(callsAfterPrime);
  });
});
