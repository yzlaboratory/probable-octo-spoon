import { useMemo } from "react";
import {
  shuffleSponsors,
  usePublicSponsors,
  type PublicSponsor,
} from "../utilities/publicData";

const TIERS: Array<{ label: string; min: number }> = [
  { label: "Hauptsponsor", min: 50 },
  { label: "Premium", min: 20 },
  { label: "Standard", min: 5 },
  { label: "Partner", min: 0 },
];

function tierFor(s: PublicSponsor): string {
  for (const t of TIERS) if (s.money >= t.min) return t.label;
  return "Partner";
}

function SponsorTile({
  s,
  large,
}: {
  s: PublicSponsor;
  large: boolean;
}) {
  const inner = s.ImageUrl ? (
    <img
      src={s.ImageUrl}
      alt={s.Name}
      style={{
        maxHeight: large ? 80 : 56,
        maxWidth: "80%",
        objectFit: "contain",
        filter: s.hasBackground ? "none" : "grayscale(1)",
      }}
    />
  ) : (
    <span
      className="font-display"
      style={{
        fontSize: large ? 18 : 14,
        letterSpacing: "-0.01em",
        color: "var(--p-ink)",
        textAlign: "center",
      }}
    >
      {s.Name}
    </span>
  );

  const tile = (
    <div
      style={{
        aspectRatio: "2 / 1",
        background: "var(--p-paper-2)",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {inner}
    </div>
  );

  return s.Link ? (
    <a
      href={s.Link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={s.Name}
    >
      {tile}
    </a>
  ) : (
    tile
  );
}

export default function SponsorsPage() {
  const all = usePublicSponsors();
  const sponsors = useMemo(
    () => (all ? shuffleSponsors(all) : []),
    [all],
  );

  const grouped = useMemo(() => {
    const groups: Record<string, PublicSponsor[]> = {
      Hauptsponsor: [],
      Premium: [],
      Standard: [],
      Partner: [],
    };
    for (const s of sponsors) groups[tierFor(s)].push(s);
    return groups;
  }, [sponsors]);

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
          Unsere Partner.
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
          Seit Jahrzehnten ermöglichen lokale Unternehmen den Sport in
          Thalexweiler. Danke.
        </p>

        {all === null && (
          <p style={{ color: "var(--p-ink-3)", marginTop: 32 }}>Lädt …</p>
        )}
        {all && sponsors.length === 0 && (
          <p style={{ color: "var(--p-ink-3)", marginTop: 32 }}>
            Aktuell sind keine Sponsoren hinterlegt.
          </p>
        )}

        {TIERS.map(({ label }) => {
          const list = grouped[label];
          if (!list || list.length === 0) return null;
          const isLead = label === "Hauptsponsor";
          return (
            <div key={label} style={{ marginTop: 40 }}>
              <div
                className="caps"
                style={{
                  fontSize: 10,
                  color: "var(--p-ink-3)",
                  letterSpacing: "0.2em",
                  marginBottom: 12,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: isLead
                    ? "repeat(auto-fit, minmax(260px, 1fr))"
                    : "repeat(auto-fit, minmax(180px, 1fr))",
                }}
              >
                {list.map((s) => (
                  <SponsorTile key={s.Name} s={s} large={isLead} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
