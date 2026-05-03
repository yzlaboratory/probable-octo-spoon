interface Props {
  title: string;
  date: string;
  tag: string;
  imageUrl: string;
  longHtml: string;
}

export default function NewsDetail({
  title,
  date,
  tag,
  imageUrl,
  longHtml,
}: Props) {
  return (
    <article
      className="news-article mx-auto"
      style={{ maxWidth: 720, padding: "56px 24px 80px" }}
    >
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
          fontSize: "clamp(32px, 5vw, 46px)",
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          margin: 0,
        }}
      >
        {title}
      </h1>

      {imageUrl && (
        <div
          aria-hidden="true"
          style={{
            marginTop: 32,
            aspectRatio: "16 / 9",
            borderRadius: 8,
            overflow: "hidden",
            position: "relative",
            background: `url(${imageUrl}) center/cover no-repeat, linear-gradient(135deg, var(--p-primary-2), var(--p-primary))`,
          }}
        >
          <span
            className="p-stripes"
            style={{ position: "absolute", inset: 0 }}
          />
        </div>
      )}

      <div
        className="news-article-body font-serif"
        style={{
          marginTop: 32,
          fontSize: 17,
          lineHeight: 1.7,
          color: "var(--p-ink)",
        }}
        dangerouslySetInnerHTML={{ __html: longHtml }}
      />
    </article>
  );
}
