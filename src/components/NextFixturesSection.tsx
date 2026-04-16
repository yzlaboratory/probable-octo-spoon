import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Skeleton from "@mui/material/Skeleton";
import Frontpageheader from "./Frontpageheader";

export interface Fixture {
  id: number;
  slug: string;
  kickoff: string;
  home: {
    name: string;
    shortName: string;
    clubSlug?: string;
    logo: string | null;
  };
  away: {
    name: string;
    shortName: string;
    clubSlug?: string;
    logo: string | null;
  };
  ourSide: "home" | "away" | null;
  competition: string;
  competitionShort: string;
  category: string;
  live: boolean;
}

export interface FixturesPayload {
  fetchedAt: string | null;
  fixtures: Fixture[];
}

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function formatKickoff(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = `${WEEKDAY[d.getDay()]}. ${d
    .getDate()
    .toString()
    .padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d
    .getFullYear()
    .toString()
    .slice(2)}`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  return { date, time };
}

export function FixtureCard({ fixture }: { fixture: Fixture }) {
  const { date, time } = formatKickoff(fixture.kickoff);
  const hvLabel = fixture.ourSide === "home" ? "H" : fixture.ourSide === "away" ? "A" : "N";
  return (
    <article
      className="fixturecard bg-dark-gray-700 relative flex w-9/10 shrink-0 flex-col gap-3 p-4 text-white md:w-80"
      data-fixture-id={fixture.id}
      data-our-side={fixture.ourSide ?? ""}
    >
      <header className="flex items-center justify-between text-xs text-gray-300">
        <span className="font-mono">{date}</span>
        {fixture.live ? (
          <span className="fixture-live rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase">
            LIVE
          </span>
        ) : (
          <span className="font-mono">{time}</span>
        )}
      </header>
      <div className="flex flex-col gap-3">
        <TeamRow team={fixture.home} emphasise={fixture.ourSide === "home"} />
        <TeamRow team={fixture.away} emphasise={fixture.ourSide === "away"} />
      </div>
      <footer className="flex items-center justify-between text-[11px] text-gray-400">
        <span className="rounded border border-gray-700 px-2 py-0.5 uppercase">
          {hvLabel}
        </span>
        <span className="truncate pl-2">
          {fixture.category} · {fixture.competitionShort || fixture.competition}
        </span>
      </footer>
    </article>
  );
}

function TeamRow({
  team,
  emphasise,
}: {
  team: Fixture["home"];
  emphasise: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {team.logo ? (
        <img
          src={team.logo}
          alt=""
          className="h-6 w-6 object-contain"
          loading="lazy"
        />
      ) : (
        <div className="h-6 w-6 rounded-full bg-gray-700" />
      )}
      <span className={`truncate ${emphasise ? "font-semibold" : "text-gray-200"}`}>
        {team.name}
      </span>
    </div>
  );
}

interface Props {
  hideHeading?: boolean;
  limit?: number;
  /** When true, show a "Alle Spiele" link under the cards. */
  showAllLink?: boolean;
}

export default function NextFixturesSection({
  hideHeading = false,
  limit = 3,
  showAllLink = true,
}: Props) {
  const [data, setData] = useState<FixturesPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/fupa/fixtures")
      .then((r) => r.json())
      .then((d: FixturesPayload) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, []);

  const fixtures = (data?.fixtures ?? []).slice(0, limit);

  return (
    <section className="nextfixtures flex w-full flex-col">
      {!hideHeading && <Frontpageheader text="NÄCHSTE SPIELE" />}
      <div className="hidescrollbar flex w-full flex-row gap-4 overflow-x-auto px-4 md:px-20">
        {!loaded &&
          Array.from({ length: limit }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="bg-dark-gray-700 flex w-9/10 shrink-0 flex-col gap-3 p-4 md:w-80"
            >
              <Skeleton variant="text" width="60%" sx={{ bgcolor: "#2a2a2a" }} />
              <Skeleton variant="text" width="80%" sx={{ bgcolor: "#2a2a2a" }} />
              <Skeleton variant="text" width="80%" sx={{ bgcolor: "#2a2a2a" }} />
              <Skeleton variant="text" width="40%" sx={{ bgcolor: "#2a2a2a" }} />
            </div>
          ))}
        {loaded && fixtures.length === 0 && (
          <div className="px-2 py-6 text-sm text-gray-400">
            Derzeit keine anstehenden Spiele.
          </div>
        )}
        {fixtures.map((f) => (
          <FixtureCard key={f.id} fixture={f} />
        ))}
      </div>
      {showAllLink && fixtures.length > 0 && (
        <div className="mt-4 px-4 text-right text-sm md:px-20">
          <Link
            to="/spiele"
            className="text-primary underline-offset-4 hover:underline"
          >
            Alle Spiele →
          </Link>
        </div>
      )}
    </section>
  );
}
