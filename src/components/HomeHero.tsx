import { Link } from "react-router-dom";

interface Props {
  tag: string;
  title: string;
  short: string;
  date: string;
  imageUrl: string;
  path: string;
}

export default function HomeHero({
  tag,
  title,
  short,
  date,
  imageUrl,
  path,
}: Props) {
  return (
    <section
      className="home-hero"
      style={{
        padding: "56px 24px 64px",
        borderBottom: "1px solid var(--p-rule)",
      }}
    >
      <div
        className="mx-auto w-full max-w-6xl"
        style={{
          display: "grid",
          gap: 40,
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          alignItems: "center",
        }}
      >
        <div className="hero-copy">
          <div
            className="caps"
            style={{
              fontSize: 10.5,
              color: "var(--p-accent)",
              letterSpacing: "0.2em",
              marginBottom: 12,
            }}
          >
            {tag} · {date}
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(40px, 6vw, 62px)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: "var(--p-ink)",
              margin: 0,
            }}
          >
            {title}
          </h1>
          <p
            className="font-serif"
            style={{
              marginTop: 20,
              fontSize: 17,
              color: "var(--p-ink-2)",
              maxWidth: 540,
              lineHeight: 1.5,
              textWrap: "pretty",
            }}
          >
            {short}
          </p>
          <div style={{ marginTop: 24 }}>
            <Link
              to={`/news/${path}`}
              className="p-btn p-btn-primary"
              aria-label={`${title} weiterlesen`}
            >
              Weiterlesen →
            </Link>
          </div>
        </div>

        <Link
          to={`/news/${path}`}
          className="hero-image"
          style={{
            position: "relative",
            display: "block",
            aspectRatio: "4 / 5",
            overflow: "hidden",
            borderRadius: 6,
            background: imageUrl
              ? `url(${imageUrl}) center/cover no-repeat, linear-gradient(135deg, var(--p-primary-2), var(--p-primary))`
              : "linear-gradient(135deg, var(--p-primary-2), var(--p-primary))",
          }}
          aria-hidden="true"
        >
          <span
            className="p-stripes"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          />
          <span
            className="caps font-mono"
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              fontSize: 9,
              padding: "2px 8px",
              borderRadius: 2,
              background: "rgba(20,20,15,0.55)",
              color: "#fff",
              letterSpacing: "0.18em",
            }}
          >
            Titelbild
          </span>
        </Link>
      </div>
    </section>
  );
}
