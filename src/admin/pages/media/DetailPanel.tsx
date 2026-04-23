import { useEffect, useState } from "react";
import { api, ApiError } from "../../api";
import type { Media } from "../../types";
import { Button, Card } from "../../ui";
import * as Icons from "../../ui/Icons";
import {
  KIND_LABEL,
  bestUrl,
  displayName,
  mimeLabel,
  previewUrl,
} from "./helpers";

interface Props {
  selected: Media | null;
  onDeleted: (id: number) => void;
}

interface Reference {
  kind: "news" | "sponsor" | "vorstand";
  id: number;
  label: string;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 text-[12.5px]">
      <div className="w-[90px] shrink-0" style={{ color: "var(--ink-3)" }}>
        {label}
      </div>
      <div
        className={`flex-1 break-all ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

export function DetailPanel({ selected, onDeleted }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refs, setRefs] = useState<Reference[] | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset any transient UI state whenever the user picks a different row.
  useEffect(() => {
    setConfirming(false);
    setBusy(false);
    setError(null);
    setRefs(null);
    setCopied(false);
  }, [selected?.id]);

  if (!selected) {
    return (
      <Card data-testid="media-detail-empty">
        <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>
          Keine Auswahl
        </div>
        <p className="mt-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
          Datei anklicken — Vorschau und Details erscheinen hier.
        </p>
      </Card>
    );
  }

  const preview = previewUrl(selected);

  async function onCopy() {
    const url = bestUrl(selected!);
    if (!url) return;
    // `navigator.clipboard` is not available in jsdom by default; tests stub
    // it. Be defensive so the UI never throws when the API is missing.
    try {
      const absolute =
        typeof window !== "undefined" && window.location
          ? new URL(url, window.location.origin).toString()
          : url;
      await navigator.clipboard?.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Kopieren nicht möglich.");
    }
  }

  async function onConfirmDelete() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setRefs(null);
    try {
      await api.delete(`/api/media/${selected.id}`);
      onDeleted(selected.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const raw = e.data.references;
        if (Array.isArray(raw)) setRefs(raw as Reference[]);
        setError(e.message);
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Löschen fehlgeschlagen.");
      }
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card data-testid="media-detail">
      <div
        className="mb-3 aspect-[4/3] overflow-hidden rounded-md"
        style={{ background: "var(--paper-3)" }}
      >
        {preview ? (
          <img
            src={preview}
            alt=""
            className="h-full w-full object-contain"
            data-testid="media-detail-preview"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-[11px]"
            style={{ color: "var(--ink-3)" }}
          >
            keine Vorschau
          </div>
        )}
      </div>

      <div
        className="mb-3 font-mono text-[12px] break-all"
        data-testid="media-detail-name"
      >
        {displayName(selected)}
      </div>

      <div className="space-y-2">
        <Row
          label="Typ"
          value={`${mimeLabel(selected.mimeType)} · ${selected.kind ? KIND_LABEL[selected.kind] : "?"}`}
        />
        <Row
          label="Hochgeladen"
          value={
            selected.uploadedBy
              ? `${selected.uploadedBy} · ${formatDate(selected.uploadedAt)}`
              : formatDate(selected.uploadedAt)
          }
        />
        {selected.filename && (
          <Row label="Dateiname" value={selected.filename} mono />
        )}
      </div>

      {refs && refs.length > 0 && (
        <div
          className="mt-4 rounded-md p-3 text-[12px]"
          style={{
            background: "oklch(0.78 0.16 85 / 0.08)",
            border: "1px solid oklch(0.78 0.16 85 / 0.4)",
            color: "var(--ink-2)",
          }}
          data-testid="media-detail-refs"
        >
          <div
            className="caps mb-1 text-[10px]"
            style={{ color: "var(--warn)" }}
          >
            Noch in Verwendung
          </div>
          <ul className="space-y-0.5">
            {refs.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                {KIND_LABEL[r.kind]}: {r.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && !refs && (
        <div
          role="alert"
          className="mt-3 rounded-md px-3 py-2 text-[12px]"
          style={{
            border: "1px solid oklch(0.5 0.15 25 / 0.5)",
            background: "oklch(0.25 0.15 25 / 0.25)",
            color: "oklch(0.85 0.12 25)",
          }}
        >
          {error}
        </div>
      )}

      <div className="rule-t mt-4 flex gap-2 pt-4">
        <Button
          kind="ghost"
          size="sm"
          onClick={onCopy}
          leading={<Icons.Link size={12} />}
          data-testid="media-detail-copy"
        >
          {copied ? "Kopiert" : "Link kopieren"}
        </Button>
        {!confirming ? (
          <Button
            kind="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            leading={<Icons.Trash size={12} />}
            data-testid="media-detail-delete"
            className="ml-auto"
          >
            Löschen
          </Button>
        ) : (
          <div className="ml-auto flex gap-2">
            <Button
              kind="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={busy}
              data-testid="media-detail-delete-cancel"
            >
              Abbrechen
            </Button>
            <Button
              kind="primary"
              size="sm"
              onClick={onConfirmDelete}
              disabled={busy}
              data-testid="media-detail-delete-confirm"
            >
              {busy ? "Lösche…" : "Ja, löschen"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
