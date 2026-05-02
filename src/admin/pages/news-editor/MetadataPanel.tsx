interface Props {
  tag: string;
  onTagChange: (t: string) => void;
  slug: string;
  onSlugChange: (s: string) => void;
  /** Presets offered as pill buttons. Authors can still type any value. */
  tagPresets?: string[];
}

const DEFAULT_PRESETS = [
  "Fußball",
  "Jugend",
  "Leichtathletik",
  "Verein",
  "Sponsoring",
];

/**
 * Tag chips + slug input, shown below the publication panel. Tag presets are
 * a shortcut — authors can still free-type anything in the input below.
 */
export default function MetadataPanel({
  tag,
  onTagChange,
  slug,
  onSlugChange,
  tagPresets = DEFAULT_PRESETS,
}: Props) {
  return (
    <div className="space-y-4 p-5" data-testid="metadata-panel">
      <div>
        <label
          className="caps mb-1.5 block text-[11px]"
          style={{ color: "var(--ink-3)" }}
        >
          Tag
        </label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tagPresets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTagChange(t)}
              className="h-7 rounded-full px-2.5 text-[11.5px]"
              style={{
                background:
                  tag === t ? "var(--primary)" : "var(--paper-3)",
                color: tag === t ? "#fff" : "var(--ink-2)",
              }}
              data-testid={`tag-preset-${t}`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          placeholder="Eigenes Tag…"
          className="cs-input font-mono text-[12px]"
          data-testid="metadata-tag-input"
        />
      </div>

      <div>
        <label
          className="caps mb-1.5 block text-[11px]"
          style={{ color: "var(--ink-3)" }}
        >
          Slug
        </label>
        <div
          className="cs-input flex items-center gap-1 font-mono text-[12px]"
          style={{ padding: "7px 10px" }}
        >
          <span style={{ color: "var(--ink-4)" }}>/news/</span>
          <input
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            data-testid="metadata-slug-input"
          />
        </div>
      </div>
    </div>
  );
}
