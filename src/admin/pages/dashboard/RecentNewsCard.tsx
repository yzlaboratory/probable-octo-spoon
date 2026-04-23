import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Pill } from "../../ui";
import type { PillTone } from "../../ui/Pill";
import type { News, NewsStatus } from "../../types";
import { formatShortDate } from "./format";

const FILTERS: ReadonlyArray<{
  key: "all" | NewsStatus;
  label: string;
}> = [
  { key: "all", label: "Alle" },
  { key: "draft", label: "Entwurf" },
  { key: "scheduled", label: "Geplant" },
  { key: "published", label: "Veröffentlicht" },
];

const STATUS_LABELS: Record<NewsStatus, string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  published: "Veröffentlicht",
  withdrawn: "Zurückgezogen",
  deleted: "Papierkorb",
};

const STATUS_TONES: Record<NewsStatus, PillTone> = {
  draft: "neutral",
  scheduled: "warn",
  published: "primary",
  withdrawn: "mute",
  deleted: "accent",
};

export interface RecentNewsCardProps {
  news: News[];
  /** Max rows after filtering. Defaults to 5 like the prototype. */
  limit?: number;
}

/**
 * Top-N news rows by updatedAt (newest first), with status-bucket filter pills.
 * "Papierkorb" entries are always hidden — the dashboard surfaces working
 * material, not the trash.
 */
export function RecentNewsCard({ news, limit = 5 }: RecentNewsCardProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const sorted = useMemo(
    () =>
      [...news]
        .filter((n) => n.status !== "deleted")
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [news],
  );

  const visible = useMemo(() => {
    const matches =
      filter === "all" ? sorted : sorted.filter((n) => n.status === filter);
    return matches.slice(0, limit);
  }, [sorted, filter, limit]);

  return (
    <Card padded={false}>
      <div className="rule-b flex items-center justify-between px-5 py-4">
        <div className="font-display text-[20px]">Zuletzt geändert</div>
        <div className="flex gap-1" role="tablist" aria-label="News-Filter">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className="cs-focus h-7 rounded-full px-2.5 text-[11.5px]"
                style={
                  active
                    ? {
                        background: "var(--primary)",
                        color: "#fff",
                        boxShadow: "0 0 16px var(--glow)",
                      }
                    : { color: "var(--ink-3)", background: "transparent" }
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div
          className="px-5 py-8 text-center text-[13px]"
          style={{ color: "var(--ink-3)" }}
        >
          Keine Meldungen in dieser Ansicht.
        </div>
      ) : (
        visible.map((n, i) => (
          <Link
            key={n.id}
            to={`/admin/news/${n.id}`}
            className="row-hover flex items-center gap-4 px-5 py-3.5 no-underline"
            style={{
              borderTop: i ? "1px solid var(--rule)" : "none",
              color: "var(--ink)",
            }}
          >
            <div className="w-14 text-right">
              <div
                className="font-mono text-[11px]"
                style={{ color: "var(--ink-3)" }}
              >
                {formatShortDate(n.publishAt ?? n.updatedAt)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] leading-snug font-medium">
                {n.title || "(ohne Titel)"}
              </div>
              <div
                className="mt-0.5 flex items-center gap-2 text-[11.5px]"
                style={{ color: "var(--ink-3)" }}
              >
                {n.tag && <span>{n.tag}</span>}
              </div>
            </div>
            <Pill tone={STATUS_TONES[n.status]}>{STATUS_LABELS[n.status]}</Pill>
          </Link>
        ))
      )}
    </Card>
  );
}
