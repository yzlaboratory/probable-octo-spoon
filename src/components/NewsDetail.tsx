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
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-12 md:py-16 lg:gap-12"
      style={{ color: "var(--ink)" }}
    >
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span
            className="chip"
            style={{
              background: "oklch(0.62 0.22 290 / 0.15)",
              color: "oklch(0.8 0.18 290)",
            }}
          >
            <span
              className="chip-dot"
              style={{ background: "var(--primary)" }}
            />
            {tag}
          </span>
          <span
            className="font-mono text-[12px]"
            style={{ color: "var(--ink-3)" }}
          >
            {date}
          </span>
        </div>
        <h1
          className="text-2xl leading-[1.15] font-semibold md:text-4xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          {title}
        </h1>
      </header>

      <div
        className="cs-card overflow-hidden p-0"
        style={{ background: "var(--paper-2)" }}
      >
        <img
          src={imageUrl}
          alt="Portrait"
          className="block max-h-[70vh] w-full object-contain"
        />
      </div>

      <div
        className="prose prose-invert max-w-none text-[15px] leading-[1.7] md:text-[17px]"
        style={{ color: "var(--ink-2)" }}
        dangerouslySetInnerHTML={{ __html: longHtml }}
      />
    </article>
  );
}
