import { useEffect, useState } from "react";
import Skeleton from "@mui/material/Skeleton";
import Frontpageheader from "./Frontpageheader";

interface StandingRow {
  rank: number;
  matches: number;
  wins: number;
  draws: number;
  defeats: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  penaltyPoints: number;
  team: {
    slug: string;
    clubSlug?: string;
    name: string;
    shortName: string;
    logo: string | null;
  };
  isOwnClub: boolean;
}

interface StandingsPayload {
  fetchedAt: string | null;
  competition: { slug: string; name: string; season: string } | null;
  standings: StandingRow[];
}

function formatGerman(iso: string | null): string {
  if (!iso) return "unbekannt";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unbekannt";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface Props {
  hideHeading?: boolean;
}

export default function LeagueStandingsSection({ hideHeading = false }: Props) {
  const [data, setData] = useState<StandingsPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/fupa/standings")
      .then((r) => r.json())
      .then((d: StandingsPayload) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, []);

  const rows = data?.standings ?? [];
  const competition = data?.competition;

  return (
    <section className="leaguestandings flex w-full flex-col">
      {!hideHeading && <Frontpageheader text="TABELLE" />}

      <div className="px-4 text-xs text-gray-400 md:px-20">
        {competition && (
          <span className="mr-3 font-medium text-gray-300">
            {competition.name} · Saison {competition.season}
          </span>
        )}
        <span>zuletzt aktualisiert: {formatGerman(data?.fetchedAt ?? null)}</span>
      </div>

      <div className="hidescrollbar mt-4 flex w-full overflow-x-auto px-4 md:px-20">
        <table className="leaguetable w-full min-w-[36rem] text-sm text-white">
          <thead className="bg-dark-gray-700 text-xs tracking-widest text-gray-300 uppercase">
            <tr>
              <th className="w-10 py-2 text-right">#</th>
              <th className="py-2 pl-3 text-left">Team</th>
              <th className="py-2 text-center">Sp</th>
              <th className="py-2 text-center">S</th>
              <th className="py-2 text-center">U</th>
              <th className="py-2 text-center">N</th>
              <th className="py-2 text-center">Tore</th>
              <th className="py-2 text-center">Diff</th>
              <th className="py-2 pr-3 text-right">P</th>
            </tr>
          </thead>
          <tbody>
            {!loaded &&
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-gray-800">
                  <td className="py-2 pl-2">
                    <Skeleton
                      variant="text"
                      width={20}
                      sx={{ bgcolor: "#2a2a2a" }}
                    />
                  </td>
                  <td className="py-2 pl-3">
                    <Skeleton
                      variant="text"
                      width={160}
                      sx={{ bgcolor: "#2a2a2a" }}
                    />
                  </td>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-2 text-center">
                      <Skeleton
                        variant="text"
                        width={24}
                        sx={{ bgcolor: "#2a2a2a", mx: "auto" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {loaded && rows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="py-6 text-center text-sm text-gray-400"
                >
                  Tabelle derzeit nicht verfügbar.
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr
                key={row.team.slug}
                data-own-club={row.isOwnClub ? "true" : "false"}
                className={`border-b border-gray-800 ${
                  row.isOwnClub
                    ? "bg-primary/20 font-semibold text-white"
                    : "text-gray-200 hover:bg-dark-gray-700/40"
                }`}
              >
                <td className="py-2 pr-1 pl-2 text-right font-mono">
                  {row.rank}
                </td>
                <td className="py-2 pl-3">
                  <span className="flex items-center gap-2">
                    {row.team.logo && (
                      <img
                        src={row.team.logo}
                        alt=""
                        className="h-5 w-5 object-contain"
                        loading="lazy"
                      />
                    )}
                    <span>{row.team.name}</span>
                  </span>
                </td>
                <td className="py-2 text-center font-mono">{row.matches}</td>
                <td className="py-2 text-center font-mono">{row.wins}</td>
                <td className="py-2 text-center font-mono">{row.draws}</td>
                <td className="py-2 text-center font-mono">{row.defeats}</td>
                <td className="py-2 text-center font-mono">
                  {row.goalsFor}:{row.goalsAgainst}
                </td>
                <td className="py-2 text-center font-mono">
                  {row.goalDifference > 0 ? "+" : ""}
                  {row.goalDifference}
                </td>
                <td className="py-2 pr-3 text-right font-mono font-bold">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
