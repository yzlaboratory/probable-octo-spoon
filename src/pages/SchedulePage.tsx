import { useEffect, useMemo, useState } from "react";
import type {
  Fixture,
  FixturesPayload,
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

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unbekannt";
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatKickoff(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = `${WEEKDAY[d.getDay()]}. ${d
    .getDate()
    .toString()
    .padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.`;
  const time = `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
  return { date, time };
}

function FixtureRow({ fixture }: { fixture: Fixture }) {
  const { date, time } = formatKickoff(fixture.kickoff);
  const venueLabel =
    fixture.ourSide === "home"
      ? "Heim"
      : fixture.ourSide === "away"
        ? "Auswärts"
        : "Neutral";
  return (
    <article
      data-fixture-id={fixture.id}
      data-our-side={fixture.ourSide ?? ""}
      style={{
        padding: 16,
        borderRadius: 6,
        background: "var(--p-paper-2)",
        border: "1px solid var(--p-rule)",
      }}
    >
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: 8 }}
      >
        <span className="font-mono" style={{ fontSize: 12 }}>
          {date} · {time}
        </span>
        {fixture.live ? (
          <span
            className="caps fixture-live"
            style={{
              fontSize: 9,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--p-accent)",
              color: "#fff",
              letterSpacing: "0.2em",
            }}
          >
            Live
          </span>
        ) : (
          <span
            className="caps"
            style={{
              fontSize: 9,
              color: "var(--p-accent)",
              letterSpacing: "0.2em",
            }}
          >
            {venueLabel}
          </span>
        )}
      </div>
      <div
        className="font-display"
        style={{ fontSize: 16, lineHeight: 1.2 }}
      >
        <span
          style={{
            fontWeight: fixture.ourSide === "home" ? 600 : 400,
          }}
        >
          {fixture.home.name}
        </span>{" "}
        <span style={{ color: "var(--p-ink-3)" }}>—</span>{" "}
        <span
          style={{
            fontWeight: fixture.ourSide === "away" ? 600 : 400,
          }}
        >
          {fixture.away.name}
        </span>
      </div>
      <div
        style={{ fontSize: 11.5, color: "var(--p-ink-3)", marginTop: 6 }}
      >
        {fixture.category} · {fixture.competitionShort || fixture.competition}
      </div>
    </article>
  );
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
    <section style={{ padding: "56px 24px 80px" }}>
      <div className="mx-auto w-full max-w-6xl">
        <div
          className="caps"
          style={{
            fontSize: 10.5,
            color: "var(--p-accent)",
            letterSpacing: "0.2em",
            marginBottom: 12,
          }}
        >
          Saison
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(36px, 5vw, 48px)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Spielplan.
        </h1>
        <p
          className="font-serif"
          style={{
            marginTop: 12,
            fontSize: 16,
            color: "var(--p-ink-2)",
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          Kommende Spiele der ersten Mannschaft. Abgesagte, verlegte oder
          Geisterspiele sind ausgeblendet — gelistet ist nur, was stattfindet.
        </p>

        {!loaded && (
          <p style={{ color: "var(--p-ink-3)", marginTop: 32 }}>
            Lade Spielplan …
          </p>
        )}
        {loaded && byMonth.length === 0 && (
          <p style={{ color: "var(--p-ink-3)", marginTop: 32 }}>
            Derzeit keine anstehenden Spiele.
          </p>
        )}

        {byMonth.map(([month, fixtures]) => (
          <section key={month} style={{ marginTop: 40 }}>
            <h2
              className="caps"
              style={{
                fontSize: 11,
                color: "var(--p-ink-3)",
                letterSpacing: "0.2em",
                margin: 0,
                marginBottom: 12,
              }}
            >
              {month}
            </h2>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              {fixtures.map((f) => (
                <FixtureRow key={f.id} fixture={f} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
