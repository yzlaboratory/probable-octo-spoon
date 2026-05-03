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
      <div className="mt-10 flex w-full flex-col gap-12 md:mt-16">
        <header className="flex flex-col gap-3 px-6 md:px-20">
          <h1
            className="section-eyebrow text-[13px] md:text-[14px]"
            style={{ color: "var(--ink-2)" }}
          >
            SPIELE
          </h1>
          <p
            className="max-w-3xl text-[14px] md:text-[15.5px]"
            style={{ color: "var(--ink-2)" }}
          >
            Kommende Spiele der ersten Mannschaft. Abgesagte, verlegte oder
            Geisterspiele sind ausgeblendet — gelistet ist nur, was stattfindet.
          </p>
        </header>

        {!loaded && (
          <div
            className="px-6 text-[13px] md:px-20"
            style={{ color: "var(--ink-3)" }}
          >
            Lade Spielplan …
          </div>
        )}

        {loaded && byMonth.length === 0 && (
          <div
            className="px-6 text-[13px] md:px-20"
            style={{ color: "var(--ink-3)" }}
          >
            Derzeit keine anstehenden Spiele.
          </div>
        )}

        {byMonth.map(([month, fixtures]) => (
          <section key={month} className="flex flex-col gap-4">
            <h2
              className="caps px-6 text-[11px] md:px-20"
              style={{ color: "var(--ink-3)" }}
            >
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
