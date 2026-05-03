import { Link } from "react-router-dom";
import { usePublicNews } from "../utilities/publicData";

export default function NewsListPagePublic() {
  const news = usePublicNews();
  const items = news ?? [];

  return (
    <section style={{ padding: "56px 24px" }}>
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
          Aus dem Verein
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(36px, 5vw, 48px)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Meldungen.
        </h1>

        {news === null && (
          <p style={{ color: "var(--p-ink-3)", marginTop: 32 }}>Lädt …</p>
        )}
        {news && items.length === 0 && (
          <p style={{ color: "var(--p-ink-3)", marginTop: 32 }}>
            Noch keine Meldungen.
          </p>
        )}

        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {items.map((n) => {
            const dateStr = new Date(n.date).toLocaleDateString("de-DE");
            return (
              <article key={n.id}>
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
                      background: n.imageurl
                        ? `url(${n.imageurl}) center/cover no-repeat, linear-gradient(135deg, var(--p-primary-2), var(--p-primary))`
                        : "linear-gradient(135deg, var(--p-primary-2), var(--p-primary))",
                    }}
                  />
                  <div
                    className="font-mono"
                    style={{ fontSize: 10.5, color: "var(--p-ink-3)" }}
                  >
                    {n.tag} · {dateStr}
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
