import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Media } from "../types";
import { Button, Card, PageHeader } from "../ui";
import * as Icons from "../ui/Icons";
import { DetailPanel } from "./media/DetailPanel";
import {
  KIND_LABEL,
  displayName,
  filterMedia,
  kpis,
  mimeLabel,
  thumbUrl,
  type KindFilter,
} from "./media/helpers";

const KIND_FILTERS: Array<{ key: KindFilter; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "news", label: "News" },
  { key: "sponsor", label: "Sponsoren" },
  { key: "vorstand", label: "Vorstand" },
];

const LIST_COLS = "60px 1fr 120px 140px 160px";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub: string;
}

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <Card padded={false} className="p-4">
      <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>
        {label}
      </div>
      <div className="font-display mt-1.5 text-[28px] leading-none">
        {value}
      </div>
      <div className="mt-1.5 text-[11px]" style={{ color: "var(--ink-3)" }}>
        {sub}
      </div>
    </Card>
  );
}

function MediaThumb({ media }: { media: Media }) {
  const url = thumbUrl(media);
  if (!url) {
    return (
      <div
        aria-hidden
        className="flex h-full w-full items-center justify-center text-[10px]"
        style={{ background: "var(--paper-3)", color: "var(--ink-3)" }}
      >
        kein Bild
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
    />
  );
}

interface ListProps {
  items: Media[];
  selectedId: number | null;
  onSelect: (m: Media) => void;
}

function Grid({ items, selectedId, onSelect }: ListProps) {
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="media-grid">
      {items.map((m) => {
        const active = selectedId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m)}
            data-testid={`media-cell-${m.id}`}
            aria-pressed={active}
            className="group relative aspect-square overflow-hidden rounded-lg text-left transition"
            style={{
              background: "var(--paper-2)",
              border: `1px solid ${active ? "var(--primary)" : "var(--rule)"}`,
              boxShadow: active ? "0 0 0 2px var(--glow)" : "none",
            }}
          >
            <MediaThumb media={m} />
            <div
              aria-hidden
              className="absolute right-0 bottom-0 left-0 p-2"
              style={{
                background:
                  "linear-gradient(180deg, transparent, rgba(14,14,18,.9))",
              }}
            >
              <div
                className="truncate font-mono text-[11px]"
                style={{ color: "var(--ink)" }}
                title={displayName(m)}
              >
                {displayName(m)}
              </div>
              <div
                className="flex items-center gap-2 text-[10px]"
                style={{ color: "var(--ink-3)" }}
              >
                <span>{mimeLabel(m.mimeType)}</span>
                <span>·</span>
                <span>{m.kind ? KIND_LABEL[m.kind] : "?"}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function List({ items, selectedId, onSelect }: ListProps) {
  return (
    <Card padded={false}>
      <div
        className="caps grid gap-3 px-4 py-2.5 text-[10px]"
        style={{
          gridTemplateColumns: LIST_COLS,
          color: "var(--ink-3)",
          borderBottom: "1px solid var(--rule)",
          background: "var(--paper-3)",
        }}
      >
        <div />
        <div>Name</div>
        <div>Typ</div>
        <div>Verwendung</div>
        <div>Upload</div>
      </div>
      {items.map((m) => {
        const active = selectedId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m)}
            data-testid={`media-row-${m.id}`}
            aria-pressed={active}
            className="row-hover grid w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left"
            style={{
              gridTemplateColumns: LIST_COLS,
              borderBottom: "1px solid var(--rule)",
              background: active ? "var(--paper-3)" : undefined,
            }}
          >
            <div className="h-10 w-12 overflow-hidden rounded-md">
              <MediaThumb media={m} />
            </div>
            <div
              className="truncate font-mono text-[12.5px]"
              title={displayName(m)}
            >
              {displayName(m)}
            </div>
            <div className="text-[12px]" style={{ color: "var(--ink-2)" }}>
              {mimeLabel(m.mimeType)}
            </div>
            <div className="text-[12px]" style={{ color: "var(--ink-2)" }}>
              {m.kind ? KIND_LABEL[m.kind] : "—"}
            </div>
            <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
              {m.uploadedBy ? `${m.uploadedBy} · ` : ""}
              {formatDate(m.uploadedAt)}
            </div>
          </button>
        );
      })}
    </Card>
  );
}

export default function MediaListPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Media | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<Media[]>("/api/media");
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unbekannter Fehler");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => kpis(items), [items]);
  const visible = useMemo(
    () => filterMedia(items, kind, query),
    [items, kind, query],
  );

  // Keep selection stable across list refreshes, but drop it when the user
  // changes filters such that the selected row is no longer visible — the
  // panel pointing at a hidden row is disorienting.
  useEffect(() => {
    if (!selected) return;
    if (!visible.some((m) => m.id === selected.id)) {
      setSelected(null);
    }
  }, [selected, visible]);

  const onDeleted = useCallback((id: number) => {
    setItems((prev) => prev.filter((m) => m.id !== id));
    setSelected(null);
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Inhalte · Mediathek"
        title="Bilder & Logos."
        subtitle="Zentrale Ablage für alle Medien. Einmal hochladen, in News, Sponsoren und Vorstand wiederverwenden."
        right={
          <Button kind="ghost" leading={<Icons.Upload size={14} />} disabled>
            Hochladen
          </Button>
        }
      />

      <div className="px-10 pb-14" data-testid="media-body">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-md px-4 py-3 text-[13px]"
            style={{
              background: "oklch(0.5 0.18 25 / 0.12)",
              color: "var(--accent)",
              border: "1px solid oklch(0.5 0.18 25 / 0.4)",
            }}
          >
            Medien konnten nicht geladen werden: {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-4 gap-4">
          <KpiCard label="Dateien" value={stats.total} sub="in der Mediathek" />
          <KpiCard label="News-Bilder" value={stats.news} sub="Hero-Images" />
          <KpiCard
            label="Sponsor-Logos"
            value={stats.sponsor}
            sub="PNG / JPEG / SVG"
          />
          <KpiCard
            label="Vorstand-Porträts"
            value={stats.vorstand}
            sub="Porträts"
          />
        </div>

        <div
          className="rule-b mb-5 flex items-center gap-3 pb-4"
          data-testid="media-toolbar"
        >
          <div
            className="flex items-center rounded-md p-0.5"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
            }}
          >
            {(["grid", "list"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setView(k)}
                aria-pressed={view === k}
                data-testid={`view-toggle-${k}`}
                className="rounded-md px-3 text-[12.5px] transition"
                style={{
                  height: 32,
                  background: view === k ? "var(--primary)" : "transparent",
                  color: view === k ? "#fff" : "var(--ink-2)",
                  boxShadow: view === k ? "0 0 12px var(--glow)" : "none",
                }}
              >
                {k === "grid" ? "Raster" : "Liste"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-[12px]">
            {KIND_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setKind(key)}
                aria-pressed={kind === key}
                data-testid={`kind-${key}`}
                className="rounded-full px-2.5"
                style={{
                  height: 32,
                  background: kind === key ? "var(--paper-3)" : "transparent",
                  border: `1px solid ${kind === key ? "var(--rule-2)" : "transparent"}`,
                  color: "var(--ink-2)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1" />
          <div
            className="flex h-9 w-[280px] items-center gap-2 rounded-md px-3"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
            }}
          >
            <Icons.Search size={14} stroke="var(--ink-3)" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Dateiname oder Typ…"
              aria-label="Medien durchsuchen"
              data-testid="media-search"
              className="flex-1 bg-transparent text-[12.5px] outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div
            className="py-20 text-center text-[13px]"
            style={{ color: "var(--ink-3)" }}
            data-testid="media-loading"
          >
            Lade Mediathek…
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>
              {items.length === 0 ? "Leer" : "Keine Treffer"}
            </div>
            <p className="mt-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
              {items.length === 0
                ? "Noch keine Medien hochgeladen. Lade dein erstes Bild in einer News-, Sponsor- oder Vorstandskarte hoch."
                : "Kein Medium entspricht dem aktuellen Filter."}
            </p>
          </Card>
        ) : (
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "1fr 340px" }}
            data-testid="media-content"
          >
            <div>
              {view === "grid" ? (
                <Grid
                  items={visible}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
              ) : (
                <List
                  items={visible}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                />
              )}
            </div>
            <DetailPanel selected={selected} onDeleted={onDeleted} />
          </div>
        )}
      </div>
    </div>
  );
}
