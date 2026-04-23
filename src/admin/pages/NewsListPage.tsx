import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { News, NewsStatus } from "../types";
import { Button, Card, PageHeader, Pill } from "../ui";
import type { PillTone } from "../ui/Pill";
import * as Icons from "../ui/Icons";

interface FilterSpec {
  key: string;
  label: string;
  query: string;
  status: NewsStatus | null;
}

const FILTERS: FilterSpec[] = [
  { key: "all", label: "Alle", query: "", status: null },
  { key: "draft", label: "Entwurf", query: "?status=draft", status: "draft" },
  {
    key: "scheduled",
    label: "Geplant",
    query: "?status=scheduled",
    status: "scheduled",
  },
  {
    key: "published",
    label: "Veröffentlicht",
    query: "?status=published",
    status: "published",
  },
  {
    key: "withdrawn",
    label: "Zurückgezogen",
    query: "?status=withdrawn",
    status: "withdrawn",
  },
  {
    key: "deleted",
    label: "Papierkorb",
    query: "?status=deleted",
    status: "deleted",
  },
];

const STATUS_TONES: Record<NewsStatus, PillTone> = {
  draft: "neutral",
  scheduled: "warn",
  published: "primary",
  withdrawn: "mute",
  deleted: "accent",
};

const STATUS_LABELS: Record<NewsStatus, string> = {
  draft: "Entwurf",
  scheduled: "Geplant",
  published: "Veröffentlicht",
  withdrawn: "Zurückgezogen",
  deleted: "Papierkorb",
};

const ROW_COLS = "80px 1fr 140px 120px 140px 72px";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function NewsListPage() {
  const nav = useNavigate();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<News[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load(key: string) {
    setLoading(true);
    const f = FILTERS.find((x) => x.key === key)!;
    const data = await api.get<News[]>(`/api/news${f.query}`);
    setItems(data);
    setLoading(false);
  }

  async function loadCounts() {
    try {
      const all = await api.get<News[]>(`/api/news`);
      const bucket: Record<string, number> = { all: all.length };
      for (const status of [
        "draft",
        "scheduled",
        "published",
        "withdrawn",
        "deleted",
      ] as NewsStatus[]) {
        bucket[status] = all.filter((n) => n.status === status).length;
      }
      setCounts(bucket);
    } catch {
      /* nice-to-have */
    }
  }

  useEffect(() => {
    load(filter);
  }, [filter]);
  useEffect(() => {
    loadCounts();
  }, []);

  async function softDelete(n: News) {
    if (!confirm(`„${n.title}" in den Papierkorb verschieben?`)) return;
    await api.delete(`/api/news/${n.id}`);
    load(filter);
    loadCounts();
  }

  async function hardDelete(n: News) {
    if (!confirm(`„${n.title}" endgültig löschen?`)) return;
    await api.delete(`/api/news/${n.id}`);
    load(filter);
    loadCounts();
  }

  const visible = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.tag.toLowerCase().includes(q) ||
        n.short.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div>
      <PageHeader
        eyebrow="Redaktion"
        title="News"
        subtitle="Meldungen, geplante Veröffentlichungen und Archiv."
        right={
          <Button
            kind="primary"
            size="md"
            leading={<Icons.Plus size={14} />}
            onClick={() => nav("/admin/news/new")}
          >
            Neue Meldung
          </Button>
        }
      />

      <div className="px-10 pb-10">
        <Card padded={false} className="overflow-hidden">
          <div
            className="flex items-center gap-2 p-3 rule-b flex-wrap"
            style={{ minHeight: 56 }}
          >
            <div className="flex flex-wrap items-center gap-1">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className="cs-focus inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] transition"
                    style={{
                      background: active ? "var(--paper-3)" : "transparent",
                      color: active ? "var(--ink)" : "var(--ink-2)",
                      border: `1px solid ${active ? "var(--rule-2)" : "transparent"}`,
                      boxShadow: active
                        ? "0 0 0 1px var(--rule-2) inset, 0 8px 24px -14px var(--glow)"
                        : undefined,
                    }}
                    aria-pressed={active}
                  >
                    <span>{f.label}</span>
                    {counts[f.key] != null && (
                      <span
                        className="font-mono text-[10.5px]"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {counts[f.key]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex-1" />
            <label
              className="flex items-center gap-2 h-9 w-[260px] px-3 rounded-md"
              style={{
                background: "var(--paper)",
                border: "1px solid var(--rule-2)",
              }}
            >
              <Icons.Search size={14} stroke="var(--ink-3)" />
              <input
                type="search"
                placeholder="Suchen…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[12.5px]"
                style={{ color: "var(--ink)" }}
              />
            </label>
          </div>

          <div
            className="grid text-[10.5px] caps rule-b"
            style={{
              gridTemplateColumns: ROW_COLS,
              color: "var(--ink-3)",
            }}
          >
            <div className="px-4 py-2.5">Bild</div>
            <div className="px-4 py-2.5">Titel</div>
            <div className="px-4 py-2.5">Tag</div>
            <div className="px-4 py-2.5">Status</div>
            <div className="px-4 py-2.5">Datum</div>
            <div className="px-4 py-2.5 text-right"></div>
          </div>

          {loading ? (
            <div
              className="px-4 py-12 text-center"
              style={{ color: "var(--ink-3)" }}
            >
              Lade…
            </div>
          ) : visible.length === 0 ? (
            <div
              className="px-4 py-12 text-center"
              style={{ color: "var(--ink-3)" }}
            >
              {search.trim()
                ? `Keine Treffer für „${search}".`
                : "Keine Einträge."}
            </div>
          ) : (
            visible.map((n) => (
              <div
                key={n.id}
                role="link"
                tabIndex={0}
                onClick={() => nav(`/admin/news/${n.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    nav(`/admin/news/${n.id}`);
                  }
                }}
                className="row-hover group grid cs-focus cursor-pointer"
                style={{
                  gridTemplateColumns: ROW_COLS,
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                <div className="px-4 py-3 flex items-center">
                  {n.hero?.variants["320w"] || n.hero?.variants["160w"] ? (
                    <img
                      src={n.hero.variants["320w"] || n.hero.variants["160w"]}
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded stripes"
                      style={{ background: "var(--paper-3)" }}
                    />
                  )}
                </div>
                <div className="px-4 py-3 min-w-0">
                  <div
                    className="text-[13.5px] font-medium truncate"
                    style={{ color: "var(--ink)" }}
                  >
                    {n.title}
                  </div>
                  <div
                    className="text-[12px] mt-0.5 truncate"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {n.short}
                  </div>
                </div>
                <div
                  className="px-4 py-3 text-[12.5px] flex items-center"
                  style={{ color: "var(--ink-2)" }}
                >
                  {n.tag}
                </div>
                <div className="px-4 py-3 flex items-center">
                  <Pill tone={STATUS_TONES[n.status]}>
                    {STATUS_LABELS[n.status]}
                  </Pill>
                </div>
                <div
                  className="px-4 py-3 font-mono text-[12px] flex items-center"
                  style={{ color: "var(--ink-2)" }}
                >
                  {formatDate(n.publishAt ?? n.createdAt)}
                </div>
                <div className="px-4 py-3 flex items-center justify-end">
                  {n.status === "deleted" ? (
                    <button
                      type="button"
                      aria-label="Endgültig löschen"
                      onClick={(e) => {
                        e.stopPropagation();
                        hardDelete(n);
                      }}
                      className="cs-focus opacity-0 group-hover:opacity-100 transition p-1 rounded"
                      style={{ color: "oklch(0.7 0.18 25)" }}
                    >
                      <Icons.Trash size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="In Papierkorb verschieben"
                      onClick={(e) => {
                        e.stopPropagation();
                        softDelete(n);
                      }}
                      className="cs-focus opacity-0 group-hover:opacity-100 transition p-1 rounded"
                      style={{ color: "var(--ink-3)" }}
                    >
                      <Icons.Trash size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
