import { Link, useParams } from "react-router-dom";
import NewsDetail from "../components/NewsDetail";
import { usePublicNewsBySlug } from "../utilities/publicData";

export default function NewsDetailPage() {
  const { path } = useParams<{ path: string }>();
  const data = usePublicNewsBySlug(path);

  if (data === undefined) {
    return (
      <div
        style={{
          minHeight: 320,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--p-ink-3)",
        }}
      >
        Lädt …
      </div>
    );
  }

  if (data === null) {
    return (
      <section
        className="mx-auto"
        style={{ maxWidth: 720, padding: "80px 24px", textAlign: "center" }}
      >
        <h1
          className="font-display"
          style={{ fontSize: 36, letterSpacing: "-0.02em", margin: 0 }}
        >
          Artikel nicht gefunden.
        </h1>
        <p
          style={{
            marginTop: 12,
            color: "var(--p-ink-2)",
            fontSize: 15,
          }}
        >
          Vielleicht wurde der Beitrag verschoben oder ist nicht mehr verfügbar.
        </p>
        <Link
          to="/news"
          className="p-btn p-btn-ghost"
          style={{ marginTop: 24, display: "inline-flex" }}
        >
          ← Zurück zu den Meldungen
        </Link>
      </section>
    );
  }

  return (
    <NewsDetail
      title={data.title}
      date={new Date(data.date).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}
      tag={data.tag}
      imageUrl={data.imageurl}
      longHtml={data.longHtml}
    />
  );
}
