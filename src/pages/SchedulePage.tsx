import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer";
import {
  FixtureCard,
  type Fixture,
  type FixturesPayload,
} from "../components/NextFixturesSection";

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unbekannt";
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function SchedulePage() {
  const [data, setData] = useState<FixturesPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/fupa/fixtures")
      .then((r) => r.json())
      .then((d: FixturesPayload) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, []);

  const byMonth = useMemo(() => {
    const fixtures = data?.fixtures ?? [];
    const groups: Record<string, Fixture[]> = {};
    for (const f of fixtures) {
      const key = monthKey(f.kickoff);
      (groups[key] ??= []).push(f);
    }
    return Object.entries(groups);
  }, [data]);

  return (
    <div className="flex flex-1 flex-col justify-start overflow-auto">
      <div className="mt-8 flex w-full flex-col gap-12 md:mt-16">
        <div className="px-6 text-white md:px-20">
          <h1 className="text-3xl font-black md:text-7xl">SPIELE</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-300 md:text-base">
            Kommende Spiele der ersten Mannschaft. Abgesagte, verlegte oder
            Geisterspiele sind ausgeblendet — gelistet ist nur, was stattfindet.
          </p>
        </div>

        {!loaded && (
          <div className="px-6 text-gray-400 md:px-20">Lade Spielplan …</div>
        )}

        {loaded && byMonth.length === 0 && (
          <div className="px-6 text-gray-400 md:px-20">
            Derzeit keine anstehenden Spiele.
          </div>
        )}

        {byMonth.map(([month, fixtures]) => (
          <section key={month} className="flex flex-col gap-4">
            <h2 className="px-6 text-lg font-bold tracking-wide text-white uppercase md:px-20 md:text-xl">
              {month}
            </h2>
            <div className="hidescrollbar flex w-full flex-row flex-wrap gap-4 px-4 md:px-20">
              {fixtures.map((f) => (
                <FixtureCard key={f.id} fixture={f} />
              ))}
            </div>
          </section>
        ))}

        <Footer />
      </div>
    </div>
  );
}
