import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import type { Media, MediaKind } from "../../types";
import { Button, Card } from "../../ui";
import * as Icons from "../../ui/Icons";
import { KIND_LABEL, displayName, mimeLabel, thumbUrl } from "./helpers";

interface Props {
  open: boolean;
  kind: MediaKind;
  /** Currently-attached media, so we can mark it as already selected. */
  current?: Media | null;
  onClose: () => void;
  onPick: (m: Media) => void;
}

/**
 * Picker used by the News hero / Sponsor logo / Vorstand portrait uploaders
 * so editors can re-use an existing Media row instead of uploading a fresh
 * copy each time. Always filters to the caller's kind — the backend does the
 * same via ?kind=... so we never hand back an SVG where a News hero needs a
 * raster + fallback JPEG.
 */
export function MediaLibraryPicker({
  open,
  kind,
  current,
  onClose,
  onPick,
}: Props) {
  const [items, setItems] = useState<Media[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Media | null>(current ?? null);

  useEffect(() => {
    if (!open) return;
    setSelected(current ?? null);
    setQuery("");
    setError(null);
    let cancelled = false;
    setItems(null);
    (async () => {
      try {
        const data = await api.get<Media[]>(
          `/api/media?kind=${encodeURIComponent(kind)}`,
        );
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unbekannter Fehler");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, kind, current]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const visible = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) =>
      (m.filename ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  if (!open) return null;

  function confirm() {
    if (!selected) return;
    onPick(selected);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
      data-testid="media-picker"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(8, 8, 11, 0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full max-w-[720px] flex-col rounded-xl"
        style={{
          background: "var(--paper-2)",
          border: "1px solid var(--rule-2)",
          boxShadow: "0 20px 60px rgba(0,0,0,.55)",
          maxHeight: "85vh",
        }}
      >
        <div className="flex items-center justify-between gap-4 p-6 pb-4">
          <div>
            <div
              className="caps text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Aus Mediathek · {KIND_LABEL[kind]}
            </div>
            <h2
              id="media-picker-title"
              className="font-display mt-1 text-[22px] leading-tight"
            >
              Bestehendes Medium wählen
            </h2>
          </div>
          <div
            className="flex h-9 w-[240px] items-center gap-2 rounded-md px-3"
            style={{
              background: "var(--paper-3)",
              border: "1px solid var(--rule)",
            }}
          >
            <Icons.Search size={14} stroke="var(--ink-3)" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Dateiname…"
              aria-label="Mediathek durchsuchen"
              data-testid="media-picker-search"
              className="flex-1 bg-transparent text-[12.5px] outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-4">
          {items === null && !error && (
            <div
              className="py-16 text-center text-[13px]"
              style={{ color: "var(--ink-3)" }}
              data-testid="media-picker-loading"
            >
              Lade Mediathek…
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="my-4 rounded-md px-3 py-2 text-[12px]"
              style={{
                border: "1px solid oklch(0.5 0.15 25 / 0.5)",
                background: "oklch(0.25 0.15 25 / 0.25)",
                color: "oklch(0.85 0.12 25)",
              }}
            >
              {error}
            </div>
          )}
          {items !== null && !error && visible.length === 0 && (
            <Card data-testid="media-picker-empty">
              <div
                className="caps text-[10px]"
                style={{ color: "var(--ink-3)" }}
              >
                {items.length === 0 ? "Leer" : "Keine Treffer"}
              </div>
              <p
                className="mt-2 text-[13px]"
                style={{ color: "var(--ink-2)" }}
              >
                {items.length === 0
                  ? "Noch keine passenden Medien in der Bibliothek. Lade stattdessen eine neue Datei hoch."
                  : "Keine Datei entspricht dem Suchbegriff."}
              </p>
            </Card>
          )}
          {visible.length > 0 && (
            <div className="grid grid-cols-4 gap-3" data-testid="media-picker-grid">
              {visible.map((m) => {
                const active = selected?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelected(m)}
                    onDoubleClick={() => {
                      setSelected(m);
                      onPick(m);
                      onClose();
                    }}
                    data-testid={`media-picker-cell-${m.id}`}
                    aria-pressed={active}
                    className="group relative aspect-square overflow-hidden rounded-lg text-left"
                    style={{
                      background: "var(--paper-3)",
                      border: `1px solid ${active ? "var(--primary)" : "var(--rule)"}`,
                      boxShadow: active ? "0 0 0 2px var(--glow)" : "none",
                    }}
                  >
                    {(() => {
                      const url = thumbUrl(m);
                      return url ? (
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          aria-hidden
                          className="flex h-full w-full items-center justify-center text-[10px]"
                          style={{ color: "var(--ink-3)" }}
                        >
                          kein Bild
                        </div>
                      );
                    })()}
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
                        className="text-[10px]"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {mimeLabel(m.mimeType)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 rounded-b-xl p-4"
          style={{ borderTop: "1px solid var(--rule)" }}
        >
          <Button
            kind="ghost"
            size="md"
            onClick={onClose}
            data-testid="media-picker-cancel"
          >
            Abbrechen
          </Button>
          <Button
            kind="primary"
            size="md"
            onClick={confirm}
            disabled={!selected}
            data-testid="media-picker-apply"
          >
            Übernehmen
          </Button>
        </div>
      </div>
    </div>
  );
}
