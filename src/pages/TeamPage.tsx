import { usePublicVorstand } from "../utilities/publicData";

const TEAMS: Array<{ name: string; division: string; size: string }> = [
  { name: "Herren I", division: "Kreisliga A", size: "1. Mannschaft" },
  { name: "Herren II", division: "Kreisliga B", size: "2. Mannschaft" },
  { name: "Alte Herren", division: "Freundschaftsspiele", size: "Ü40" },
  { name: "A-Jugend", division: "JFG Glan-Theel", size: "U19" },
  { name: "D-Jugend", division: "JFG Glan-Theel", size: "U13" },
  { name: "Bambini", division: "Kindertraining", size: "U6/U7" },
];

export default function TeamPage() {
  const vorstand = usePublicVorstand() ?? [];

  return (
    <section style={{ padding: "56px 24px 80px" }}>
      <div className="mx-auto w-full max-w-6xl">
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(36px, 5vw, 48px)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Mannschaften.
        </h1>
        <p
          className="font-serif"
          style={{
            marginTop: 12,
            fontSize: 16,
            color: "var(--p-ink-2)",
            maxWidth: 560,
          }}
        >
          Vom Bambini-Training bis zur Aktiven-Mannschaft — bei der Alemannia
          spielt jede Generation.
        </p>

        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {TEAMS.map((t) => (
            <article
              key={t.name}
              style={{
                background: "var(--p-paper-2)",
                border: "1px solid var(--p-rule)",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  aspectRatio: "3 / 2",
                  position: "relative",
                  background:
                    "linear-gradient(135deg, var(--p-primary-2), var(--p-primary))",
                }}
              >
                <span
                  className="p-stripes"
                  style={{ position: "absolute", inset: 0 }}
                />
              </div>
              <div style={{ padding: 16 }}>
                <div
                  className="font-display"
                  style={{ fontSize: 18, letterSpacing: "-0.01em" }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "var(--p-ink-3)",
                  }}
                >
                  {t.division} · {t.size}
                </div>
              </div>
            </article>
          ))}
        </div>

        {vorstand.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <div
              className="caps"
              style={{
                fontSize: 10,
                color: "var(--p-ink-3)",
                letterSpacing: "0.2em",
                marginBottom: 16,
              }}
            >
              Vorstand
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 28,
                letterSpacing: "-0.015em",
                margin: 0,
                marginBottom: 24,
              }}
            >
              Wer den Verein trägt.
            </h2>
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              }}
            >
              {vorstand.map((m) => (
                <div
                  key={`${m.name}-${m.title}`}
                  style={{
                    background: "var(--p-paper-2)",
                    border: "1px solid var(--p-rule)",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "1 / 1",
                      background: m.imageSrc
                        ? `url(${m.imageSrc}) center/cover no-repeat`
                        : "linear-gradient(135deg, var(--p-primary-2), var(--p-primary))",
                    }}
                  />
                  <div style={{ padding: 12 }}>
                    <div
                      className="font-display"
                      style={{ fontSize: 16, lineHeight: 1.2 }}
                    >
                      {m.name}
                    </div>
                    <div
                      className="caps"
                      style={{
                        fontSize: 10,
                        color: "var(--p-ink-3)",
                        letterSpacing: "0.18em",
                        marginTop: 4,
                      }}
                    >
                      {m.title}
                    </div>
                    {m.mail && (
                      <a
                        href={`mailto:${m.mail}`}
                        style={{
                          display: "block",
                          marginTop: 8,
                          fontSize: 12,
                          color: "var(--p-ink-2)",
                          wordBreak: "break-all",
                        }}
                      >
                        {m.mail}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
