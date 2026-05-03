import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  shuffleTopSponsors,
  usePublicSponsors,
} from "../utilities/publicData";

export default function HomeSponsorRibbon() {
  const all = usePublicSponsors();
  const sponsors = useMemo(
    () => (all ? shuffleTopSponsors(all, 8) : []),
    [all],
  );
  if (sponsors.length === 0) return null;

  return (
    <section
      aria-labelledby="sponsors-ribbon-heading"
      style={{ padding: "48px 24px" }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div
          id="sponsors-ribbon-heading"
          className="caps"
          style={{
            fontSize: 10,
            color: "var(--p-ink-3)",
            letterSpacing: "0.2em",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Partner & Sponsoren
        </div>

        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          }}
        >
          {sponsors.slice(0, 5).map((s) => {
            const inner = s.ImageUrl ? (
              <img
                src={s.ImageUrl}
                alt={s.Name}
                style={{
                  maxHeight: 40,
                  maxWidth: "80%",
                  objectFit: "contain",
                  filter: s.hasBackground ? "none" : "grayscale(1)",
                  opacity: 0.85,
                }}
              />
            ) : (
              <span
                className="font-display"
                style={{ fontSize: 13, color: "var(--p-ink-2)" }}
              >
                {s.Name}
              </span>
            );
            const tile = (
              <div
                style={{
                  height: 64,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--p-paper-2)",
                  borderRadius: 4,
                  padding: 12,
                }}
              >
                {inner}
              </div>
            );
            return s.Link ? (
              <a
                key={s.Name}
                href={s.Link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.Name}
              >
                {tile}
              </a>
            ) : (
              <div key={s.Name} aria-label={s.Name}>
                {tile}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link
            to="/sponsors"
            style={{
              fontSize: 12.5,
              color: "var(--p-ink-2)",
              textDecoration: "underline dotted",
              textUnderlineOffset: 4,
            }}
          >
            Alle Sponsoren →
          </Link>
        </div>
      </div>
    </section>
  );
}
