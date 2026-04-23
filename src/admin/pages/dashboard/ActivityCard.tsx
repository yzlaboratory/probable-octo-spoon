import { Link } from "react-router-dom";
import { Card } from "../../ui";
import type { ActivityItem, ActivityKind } from "./activity";
import { relativeTime } from "./format";

const KIND_DOT: Record<ActivityKind, string> = {
  news: "var(--accent)",
  sponsor: "var(--tertiary)",
  vorstand: "var(--warn)",
};

export interface ActivityCardProps {
  items: ActivityItem[];
  /** Inject a fixed clock for tests; otherwise relativeTime uses Date.now(). */
  now?: Date;
}

export function ActivityCard({ items, now }: ActivityCardProps) {
  return (
    <Card padded={false}>
      <div className="rule-b flex items-center justify-between px-5 py-4">
        <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>
          Aktivität
        </div>
        <span
          className="font-mono text-[10.5px]"
          style={{ color: "var(--ink-4)" }}
        >
          live
        </span>
      </div>

      {items.length === 0 ? (
        <div
          className="px-5 py-8 text-center text-[13px]"
          style={{ color: "var(--ink-3)" }}
        >
          Noch keine Aktivität.
        </div>
      ) : (
        <div className="px-5 py-3">
          {items.map((a, i) => (
            <Link
              key={`${a.kind}-${a.href}-${a.at}-${i}`}
              to={a.href}
              className="flex gap-3 py-2.5 no-underline"
              style={{
                borderTop: i ? "1px dashed var(--rule)" : "none",
                color: "inherit",
              }}
            >
              <div
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                aria-hidden
                style={{ background: KIND_DOT[a.kind] }}
              />
              <div className="min-w-0 flex-1 text-[12px] leading-snug">
                <span className="font-medium" style={{ color: "var(--ink)" }}>
                  {a.noun}
                </span>{" "}
                <span style={{ color: "var(--ink-2)" }}>
                  „{a.title}" geändert
                </span>
                <div
                  className="mt-0.5 font-mono text-[10.5px]"
                  style={{ color: "var(--ink-4)" }}
                >
                  {relativeTime(a.at, now)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
