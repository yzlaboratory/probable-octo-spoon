import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type {
  Fixture,
  FixturesPayload,
} from "./NextFixturesSection";

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

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

export default function HomeFixturesStrip() {
  const [data, setData] = useState<FixturesPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/fupa/fixtures")
      .then((r) => r.json())
      .then((d: FixturesPayload) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, []);

  const fixtures: Fixture[] = (data?.fixtures ?? []).slice(0, 3);
  if (loaded && fixtures.length === 0) return null;

  return (
    <section
      aria-labelledby="fixtures-heading"
      style={{
        padding: "56px 24px",
        background: "var(--p-paper-2)",
        borderBottom: "1px solid var(--p-rule)",
      }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div
          className="flex items-baseline justify-between"
          style={{ marginBottom: 20 }}
        >
          <h2
            id="fixtures-heading"
            className="font-display"
            style={{ fontSize: 24, margin: 0 }}
          >
            Nächste Spiele
          </h2>
          <Link
            to="/spiele"
            style={{
              fontSize: 12.5,
              color: "var(--p-ink-2)",
              textDecoration: "underline dotted",
              textUnderlineOffset: 4,
            }}
          >
            Spielplan →
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {!loaded &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`sk-${i}`}
                style={{
                  height: 92,
                  background: "var(--p-paper)",
                  border: "1px solid var(--p-rule)",
                  borderRadius: 6,
                }}
              />
            ))}

          {fixtures.map((f) => {
            const { date, time } = formatKickoff(f.kickoff);
            const venueLabel =
              f.ourSide === "home"
                ? "Heim"
                : f.ourSide === "away"
                  ? "Auswärts"
                  : "Neutral";
            return (
              <article
                key={f.id}
                style={{
                  padding: 16,
                  borderRadius: 6,
                  background: "var(--p-paper)",
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
                </div>
                <div
                  className="font-display"
                  style={{ fontSize: 16, lineHeight: 1.2 }}
                >
                  {f.home.name}{" "}
                  <span style={{ color: "var(--p-ink-3)" }}>—</span>{" "}
                  {f.away.name}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--p-ink-3)",
                    marginTop: 6,
                  }}
                >
                  {f.category} · {f.competitionShort || f.competition}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
