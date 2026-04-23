import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Sponsor, SponsorStatus } from "../types";
import { Button, Card, PageHeader, Pill } from "../ui";
import type { PillTone } from "../ui/Pill";
import * as Icons from "../ui/Icons";

interface FilterSpec {
  key: string;
  label: string;
  query: string;
  status: SponsorStatus | null;
}

const FILTERS: FilterSpec[] = [
  { key: "all", label: "Alle", query: "", status: null },
  { key: "active", label: "Aktiv", query: "?status=active", status: "active" },
  { key: "paused", label: "Pausiert", query: "?status=paused", status: "paused" },
  {
    key: "archived",
    label: "Archiviert",
    query: "?status=archived",
    status: "archived",
  },
];

const STATUS_TONES: Record<SponsorStatus, PillTone> = {
  active: "primary",
  paused: "warn",
  archived: "mute",
};

const STATUS_LABELS: Record<SponsorStatus, string> = {
  active: "Aktiv",
  paused: "Pausiert",
  archived: "Archiviert",
};

const ROW_COLS = "52px 1fr 120px 120px 72px";

// Stable segment hues for the weight bar. Cycles through the admin palette so
// colors read as a distinct group rather than a gradient.
const SEGMENT_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--warn)",
  "var(--tertiary)",
  "var(--moss)",
];

function WeightBar({ sponsors }: { sponsors: Sponsor[] }) {
  const active = sponsors.filter((s) => s.status === "active");
  const total = active.reduce((sum, s) => sum + Math.max(0, s.weight), 0);
  if (total === 0 || active.length === 0) {
    return (
      <div
        className="h-10 rounded-md flex items-center justify-center text-[12px]"
        style={{
          background: "var(--paper-3)",
          border: "1px solid var(--rule)",
          color: "var(--ink-3)",
        }}
      >
        Keine aktiven Sponsoren — die Gewichtsverteilung ist leer.
      </div>
    );
  }
  return (
    <div
      className="h-10 rounded-md overflow-hidden flex items-stretch"
      style={{ border: "1px solid var(--rule)" }}
      role="img"
      aria-label="Gewichtete Verteilung der aktiven Sponsoren"
    >
      {active.map((s, i) => {
        const pct = (s.weight / total) * 100;
        const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        return (
          <div
            key={s.id}
            title={`${s.name} — Gewicht ${s.weight}`}
            style={{
              width: `${pct}%`,
              background: `color-mix(in oklab, ${color} 70%, var(--paper-3))`,
              borderRight: "1px solid var(--paper-2)",
              color: "#fff",
            }}
            className="flex items-center px-2 overflow-hidden"
          >
            {pct > 6 && (
              <span className="text-[11px] font-medium truncate">
                {s.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SponsorListPage() {
  const nav = useNavigate();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<Sponsor[]>([]);
  const [allForBar, setAllForBar] = useState<Sponsor[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load(key: string) {
    setLoading(true);
    const f = FILTERS.find((x) => x.key === key)!;
    const data = await api.get<Sponsor[]>(`/api/sponsors${f.query}`);
    setItems(data);
    setLoading(false);
  }

  async function loadAll() {
    try {
      const all = await api.get<Sponsor[]>("/api/sponsors");
      setAllForBar(all);
      setCounts({
        all: all.length,
        active: all.filter((s) => s.status === "active").length,
        paused: all.filter((s) => s.status === "paused").length,
        archived: all.filter((s) => s.status === "archived").length,
      });
    } catch {
      /* nice-to-have */
    }
  }

  useEffect(() => {
    load(filter);
  }, [filter]);
  useEffect(() => {
    loadAll();
  }, []);

  async function setStatus(s: Sponsor, status: SponsorStatus) {
    await api.patch(`/api/sponsors/${s.id}`, { status });
    load(filter);
    loadAll();
  }

  async function hardDelete(s: Sponsor) {
    const typed = window.prompt(
      `Zur Bestätigung den Namen eingeben: „${s.name}"`,
    );
    if (typed !== s.name) return;
    await api.delete(`/api/sponsors/${s.id}`);
    load(filter);
    loadAll();
  }

  const visible = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.tagline ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div>
      <PageHeader
        eyebrow="Partner"
        title="Sponsoren"
        subtitle="Partner, Gewichtung und Zeitraum der Einblendung."
        right={
          <Button
            kind="primary"
            size="md"
            leading={<Icons.Plus size={14} />}
            onClick={() => nav("/admin/sponsors/new")}
          >
            Neuer Sponsor
          </Button>
        }
      />

      <div className="px-10 pb-10 space-y-5">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                className="caps text-[10.5px]"
                style={{ color: "var(--ink-3)" }}
              >
                Gewichtsverteilung
              </div>
              <div
                className="text-[12.5px] mt-1"
                style={{ color: "var(--ink-2)" }}
              >
                Anteil jedes aktiven Sponsors am gewichteten Karussell.
              </div>
            </div>
            <div
              className="font-mono text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              {allForBar.filter((s) => s.status === "active").length} aktiv
            </div>
          </div>
          <WeightBar sponsors={allForBar} />
        </Card>

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
            <div className="px-4 py-2.5">Logo</div>
            <div className="px-4 py-2.5">Name</div>
            <div className="px-4 py-2.5">Gewicht</div>
            <div className="px-4 py-2.5">Status</div>
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
                : "Keine Sponsoren."}
            </div>
          ) : (
            visible.map((s) => {
              const logo =
                s.logo?.variants["400w"] ||
                s.logo?.variants["200w"] ||
                s.logo?.variants.svg;
              return (
                <div
                  key={s.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => nav(`/admin/sponsors/${s.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      nav(`/admin/sponsors/${s.id}`);
                    }
                  }}
                  className="row-hover group grid cs-focus cursor-pointer"
                  style={{
                    gridTemplateColumns: ROW_COLS,
                    borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <div className="px-4 py-3 flex items-center">
                    {logo ? (
                      <img
                        src={logo}
                        alt=""
                        className="w-9 h-9 rounded object-contain p-1"
                        style={{ background: "var(--paper-3)" }}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded stripes"
                        style={{ background: "var(--paper-3)" }}
                      />
                    )}
                  </div>
                  <div className="px-4 py-3 min-w-0">
                    <div
                      className="text-[13.5px] font-medium truncate"
                      style={{ color: "var(--ink)" }}
                    >
                      {s.name}
                    </div>
                    <div
                      className="text-[12px] mt-0.5 truncate"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {s.tagline || s.linkUrl}
                    </div>
                  </div>
                  <div
                    className="px-4 py-3 font-mono text-[12px] flex items-center"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {s.weight}
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <Pill tone={STATUS_TONES[s.status]}>
                      {STATUS_LABELS[s.status]}
                    </Pill>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-end gap-1">
                    {s.status === "active" && (
                      <button
                        type="button"
                        aria-label="Pausieren"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(s, "paused");
                        }}
                        className="cs-focus opacity-0 group-hover:opacity-100 transition px-2 py-1 rounded text-[11px]"
                        style={{
                          color: "var(--ink-2)",
                          background: "var(--paper-3)",
                        }}
                      >
                        Pause
                      </button>
                    )}
                    {s.status === "paused" && (
                      <button
                        type="button"
                        aria-label="Aktivieren"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(s, "active");
                        }}
                        className="cs-focus opacity-0 group-hover:opacity-100 transition px-2 py-1 rounded text-[11px]"
                        style={{
                          color: "var(--ink-2)",
                          background: "var(--paper-3)",
                        }}
                      >
                        Aktiv
                      </button>
                    )}
                    {s.status === "archived" ? (
                      <button
                        type="button"
                        aria-label="Endgültig löschen"
                        onClick={(e) => {
                          e.stopPropagation();
                          hardDelete(s);
                        }}
                        className="cs-focus opacity-0 group-hover:opacity-100 transition p-1 rounded"
                        style={{ color: "oklch(0.7 0.18 25)" }}
                      >
                        <Icons.Trash size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label="Archivieren"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(s, "archived");
                        }}
                        className="cs-focus opacity-0 group-hover:opacity-100 transition p-1 rounded"
                        style={{ color: "var(--ink-3)" }}
                      >
                        <Icons.Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
