// FuPa ingest Lambda.
// Two routes, selected by the API Gateway rawPath:
//   GET /api/fupa/standings → league table (array of rows, highlighted club)
//   GET /api/fupa/fixtures  → upcoming first-team fixtures (cancelled hidden)
//
// Strategy: fetch FuPa's public JSON API, reshape to a small contract the
// frontend consumes. On any upstream failure return an empty payload + the
// previous "last known good" snapshot held in Lambda memory — matches the
// Instagram proxy pattern. Warm-instance memory is enough at this scale
// (Saarland amateur football, handful of requests per day).

const TEAM_SLUG = process.env.FUPA_TEAM_SLUG || "sv-thalexweiler-m1";
const CLUB_SLUG = process.env.FUPA_CLUB_SLUG || "sv-thalexweiler";
const UA = "svthalexweiler-website/1.0 (+https://svthalexweiler.de)";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — daily cadence in spec + grace.

const memCache = {
  standings: { payload: null, fetchedAt: 0 },
  fixtures: { payload: null, fetchedAt: 0 },
};

async function fupaGet(path) {
  const res = await fetch(`https://api.fupa.net${path}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FuPa ${path} → HTTP ${res.status}`);
  return res.json();
}

function ok(body) {
  return {
    statusCode: 200,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  };
}

function reshapeStandings(raw, competition) {
  const rows = Array.isArray(raw?.standings) ? raw.standings : [];
  return rows.map((r) => ({
    rank: r.rank,
    matches: r.matches,
    wins: r.wins,
    draws: r.draws,
    defeats: r.defeats,
    goalsFor: r.ownGoals,
    goalsAgainst: r.againstGoals,
    goalDifference: r.goalDifference,
    points: r.points,
    penaltyPoints: r.penaltyPoints ?? 0,
    team: {
      slug: r.team?.slug,
      clubSlug: r.team?.clubSlug,
      name: r.team?.name?.full ?? r.team?.name?.middle ?? "",
      shortName: r.team?.name?.short ?? "",
      logo: r.team?.image?.path
        ? `${r.team.image.path}100x100.${r.team.image.svg ? "svg" : "png"}`
        : null,
    },
    isOwnClub: r.team?.clubSlug === CLUB_SLUG,
  }));
}

function isCancelled(match) {
  const flags = match?.flags;
  if (!flags) return false;
  if (typeof flags === "string")
    return /cancel|postponed|abgesagt|verlegt|closed.door/i.test(flags);
  if (Array.isArray(flags))
    return flags.some((f) =>
      /cancel|postponed|abgesagt|verlegt|closed.door/i.test(String(f)),
    );
  if (typeof flags === "object")
    return !!(flags.cancelled || flags.postponed || flags.hidden);
  return false;
}

function isUpcoming(match, now) {
  if (match.section === "POST") return false;
  const kickoff = new Date(match.kickoff).getTime();
  return Number.isFinite(kickoff) && kickoff + 2.5 * 60 * 60 * 1000 > now;
}

function isLive(match, now) {
  const kickoff = new Date(match.kickoff).getTime();
  return (
    match.section !== "POST" &&
    kickoff <= now &&
    now - kickoff < 2.5 * 60 * 60 * 1000
  );
}

function reshapeFixtures(raw) {
  const now = Date.now();
  return raw
    .filter((m) => !isCancelled(m))
    .filter((m) => isUpcoming(m, now) || isLive(m, now))
    .map((m) => ({
      id: m.id,
      slug: m.slug,
      kickoff: m.kickoff,
      home: {
        name: m.homeTeam?.name?.full ?? "",
        shortName: m.homeTeam?.name?.short ?? "",
        clubSlug: m.homeTeam?.clubSlug,
        logo: m.homeTeam?.image?.path
          ? `${m.homeTeam.image.path}100x100.${m.homeTeam.image.svg ? "svg" : "png"}`
          : null,
      },
      away: {
        name: m.awayTeam?.name?.full ?? "",
        shortName: m.awayTeam?.name?.short ?? "",
        clubSlug: m.awayTeam?.clubSlug,
        logo: m.awayTeam?.image?.path
          ? `${m.awayTeam.image.path}100x100.${m.awayTeam.image.svg ? "svg" : "png"}`
          : null,
      },
      ourSide:
        m.homeTeam?.clubSlug === CLUB_SLUG
          ? "home"
          : m.awayTeam?.clubSlug === CLUB_SLUG
            ? "away"
            : null,
      competition: m.round?.competitionSeason?.name ?? "",
      competitionShort: m.round?.competitionSeason?.shortName ?? "",
      category: m.round?.type === "league" ? "Liga" : m.round?.type === "cup" ? "Pokal" : "Liga",
      live: isLive(m, now),
    }))
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
}

async function fetchTeamSeason() {
  // /v1/teams/{slug-without-season-suffix} returns the current-season record.
  return fupaGet(`/v1/teams/${TEAM_SLUG}`);
}

async function fetchStandings() {
  const cached = memCache.standings;
  if (cached.payload && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.payload;
  }
  try {
    const team = await fetchTeamSeason();
    const competitionSlug = team?.competition?.slug;
    if (!competitionSlug) throw new Error("no competition slug on team");
    const raw = await fupaGet(
      `/v1/standings?competition=${encodeURIComponent(competitionSlug)}`,
    );
    const payload = {
      fetchedAt: new Date().toISOString(),
      competition: {
        slug: competitionSlug,
        name: team.competition?.name ?? "",
        season: team.competition?.season?.name ?? "",
      },
      standings: reshapeStandings(raw, team.competition),
    };
    memCache.standings = { payload, fetchedAt: Date.now() };
    return payload;
  } catch (err) {
    console.error("FuPa standings ingest failed:", err);
    // Last-known-good — old snapshot's fetchedAt tells the visitor about staleness.
    return cached.payload ?? null;
  }
}

async function fetchFixtures() {
  const cached = memCache.fixtures;
  if (cached.payload && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.payload;
  }
  try {
    const team = await fetchTeamSeason();
    const teamSeasonId = team?.id;
    if (!teamSeasonId) throw new Error("no teamseason id");
    const raw = await fupaGet(
      `/v1/teams/${teamSeasonId}/matches?flavor=current`,
    );
    const payload = {
      fetchedAt: new Date().toISOString(),
      fixtures: reshapeFixtures(raw),
    };
    memCache.fixtures = { payload, fetchedAt: Date.now() };
    return payload;
  } catch (err) {
    console.error("FuPa fixtures ingest failed:", err);
    return cached.payload ?? null;
  }
}

export async function handler(event) {
  const rawPath = event?.rawPath || event?.path || "";
  if (rawPath.endsWith("/standings")) {
    const data = await fetchStandings();
    return ok(data ?? { fetchedAt: null, competition: null, standings: [] });
  }
  if (rawPath.endsWith("/fixtures")) {
    const data = await fetchFixtures();
    return ok(data ?? { fetchedAt: null, fixtures: [] });
  }
  return { statusCode: 404, body: "not found" };
}
