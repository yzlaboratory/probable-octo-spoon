import iglogo from "../assets/instagramwhite.svg";

interface Props {
  imageUrl: string;
  caption: string;
  timestamp: string;
  permalink: string;
  type: string;
  productType: string;
  children?: { data: Array<{ media_url: string; media_type: string }> };
}

export default function Socialcard({
  imageUrl,
  caption,
  timestamp,
  permalink,
  type,
  children,
}: Props) {
  return (
    <div className="socialcard flex w-9/10 shrink-0 px-2 lg:w-1/5">
      <a
        href={permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="cs-tile cs-focus group relative flex w-full flex-col overflow-hidden no-underline"
        style={{ color: "var(--ink)" }}
      >
        <div className="aspect-[100/56] w-full overflow-hidden">
          {type === "IMAGE" ? (
            <img
              src={imageUrl}
              alt="Portrait"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : type === "VIDEO" ? (
            <video className="h-full w-full object-cover" muted autoPlay>
              <source src={imageUrl} />
            </video>
          ) : type === "CAROUSEL_ALBUM" && children ? (
            <div className="ig_gallery hidescrollbar flex h-full snap-x snap-mandatory flex-row overflow-auto scroll-smooth">
              {children.data.map((item, idx) =>
                item.media_type === "IMAGE" ? (
                  <img
                    key={idx}
                    src={item.media_url}
                    alt="Portrait"
                    className="h-full min-w-full snap-start object-cover"
                  />
                ) : item.media_type === "VIDEO" ? (
                  <video
                    key={idx}
                    className="h-full min-w-full snap-start object-cover"
                    muted
                    autoPlay
                  >
                    <source src={item.media_url} />
                  </video>
                ) : (
                  <div key={idx} />
                ),
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="font-mono text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              {new Date(timestamp).toLocaleDateString()} · SOCIAL
            </h3>
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: "var(--paper-3)",
                border: "1px solid var(--rule-2)",
              }}
            >
              <img src={iglogo} alt="" className="h-3.5 w-3.5" />
            </span>
          </div>
          <p
            className="line-clamp-4 text-[13px] leading-[1.55]"
            style={{ color: "var(--ink-2)" }}
          >
            {caption}
          </p>
        </div>
      </a>
    </div>
  );
}
