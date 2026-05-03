import { Link } from "react-router-dom";
import type { PublicNewsItem } from "../utilities/publicData";

const PLACEHOLDER_PAIRS: Array<[string, string]> = [
  ["#2a4a3a", "#1f3a2e"],
  ["#b5401b", "#d25a2e"],
  ["#5b7a52", "#3a5a30"],
  ["#c89a2a", "#e0b848"],
  ["#6b3a5a", "#8a4e76"],
  ["#1f3a2e", "#0a1a14"],
];

interface Props {
  items: PublicNewsItem[];
}

export default function HomeNewsGrid({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="news-grid-heading"
      style={{ padding: "56px 24px", borderBottom: "1px solid var(--p-rule)" }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div
          className="flex items-baseline justify-between"
          style={{ marginBottom: 24 }}
        >
          <h2
            id="news-grid-heading"
            className="font-display"
            style={{ fontSize: 28, letterSpacing: "-0.015em", margin: 0 }}
          >
            Meldungen
          </h2>
          <Link
            to="/news"
            style={{
              fontSize: 13,
              color: "var(--p-ink-2)",
              textDecorationStyle: "dotted",
              textDecoration: "underline dotted",
              textUnderlineOffset: 4,
            }}
          >
            Alle Meldungen →
          </Link>
        </div>

        <div
          className="news-grid"
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {items.map((n, i) => {
            const [from, to] = PLACEHOLDER_PAIRS[i % PLACEHOLDER_PAIRS.length];
            const dateStr = new Date(n.date).toLocaleDateString("de-DE");
            return (
              <article key={n.id} className="news-card">
                <Link
                  to={`/news/${n.path}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      aspectRatio: "4 / 3",
                      borderRadius: 6,
                      overflow: "hidden",
                      marginBottom: 12,
                      position: "relative",
                      background: n.imageurl
                        ? `url(${n.imageurl}) center/cover no-repeat, linear-gradient(135deg, ${from}, ${to})`
                        : `linear-gradient(135deg, ${from}, ${to})`,
                    }}
                  >
                    <span
                      className="p-stripes"
                      style={{ position: "absolute", inset: 0 }}
                    />
                    <span
                      className="caps font-mono"
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        fontSize: 9,
                        padding: "2px 8px",
                        background: "rgba(20,20,15,0.7)",
                        color: "#f4eee2",
                        letterSpacing: "0.15em",
                      }}
                    >
                      {n.tag}
                    </span>
                  </div>
                  <div
                    className="font-mono"
                    style={{ fontSize: 10.5, color: "var(--p-ink-3)" }}
                  >
                    {dateStr}
                  </div>
                  <h3
                    className="font-display"
                    style={{
                      fontSize: 19,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.2,
                      margin: "4px 0 6px",
                    }}
                  >
                    {n.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--p-ink-2)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {n.short}
                  </p>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
