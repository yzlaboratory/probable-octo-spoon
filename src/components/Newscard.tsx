import { Link } from "react-router-dom";

interface Props {
  title: string;
  tag: string;
  description: string;
  date: string;
  imageUrl: string;
  path: string;
}

export default function Newscard({
  title,
  tag,
  description,
  date,
  imageUrl,
  path,
}: Props) {
  return (
    <div className="newscardcontainer flex w-9/10 shrink-0 px-2 lg:w-1/4">
      <Link
        to={"/news/" + path}
        className="cs-tile cs-focus group relative flex h-full w-full flex-col overflow-hidden no-underline"
        style={{ color: "var(--ink)" }}
      >
        <div className="aspect-[100/56] w-full overflow-hidden">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Portrait"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
          <div className="flex items-center gap-2">
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
            <h3
              className="font-mono text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              {date}
            </h3>
          </div>

          <h1
            className="font-display text-[19px] leading-[1.15] md:text-[22px]"
            style={{ letterSpacing: "-0.012em", color: "var(--ink)" }}
          >
            {title}
          </h1>

          <p
            className="line-clamp-3 text-[13px] leading-[1.55]"
            style={{ color: "var(--ink-2)" }}
          >
            {description}
          </p>
        </div>
      </Link>
    </div>
  );
}
