import { Link } from "react-router-dom";
import { Button, Card, Pill } from "../../ui";
import * as Icons from "../../ui/Icons";
import type { TodoItem } from "./todos";

export interface TodoCardProps {
  items: TodoItem[];
}

export function TodoCard({ items }: TodoCardProps) {
  const hasItems = items.length > 0;
  const headline = hasItems
    ? items.length === 1
      ? "Eine Sache wartet auf dich"
      : `${items.length} Dinge warten auf dich`
    : "Alles erledigt";

  return (
    <Card padded={false}>
      <div className="rule-b flex items-center justify-between px-5 py-4">
        <div>
          <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>
            Heute zu erledigen
          </div>
          <div className="font-display mt-1 text-[22px]">{headline}</div>
        </div>
        {hasItems && (
          <Button kind="ghost" size="sm" disabled aria-disabled="true">
            Alle anzeigen
          </Button>
        )}
      </div>

      {hasItems ? (
        <div>
          {items.map((t, i) => (
            <Link
              key={`${t.kind}-${i}`}
              to={t.href}
              className="row-hover flex items-center gap-4 px-5 py-4 no-underline"
              style={{
                borderTop: i ? "1px solid var(--rule)" : "none",
                color: "var(--ink)",
              }}
            >
              <Pill tone={t.tone}>{t.tag}</Pill>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium">
                  {t.label}
                </div>
                <div
                  className="mt-0.5 text-[12px]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {t.meta}
                </div>
              </div>
              <span
                className="flex shrink-0 items-center gap-1.5 text-[12.5px]"
                style={{ color: "var(--primary)" }}
              >
                {t.action}
                <Icons.Arrow size={12} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="px-5 py-8 text-center text-[13px]"
          style={{ color: "var(--ink-3)" }}
        >
          Keine Entwürfe, keine ablaufenden Sponsorenverträge,
          <br />
          alle Vorstandsfotos sind da. Schöner Tag.
        </div>
      )}
    </Card>
  );
}
