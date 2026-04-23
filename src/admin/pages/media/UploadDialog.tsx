import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../api";
import type { Media, MediaKind } from "../../types";
import { Button } from "../../ui";
import * as Icons from "../../ui/Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onUploaded: (m: Media) => void;
  /**
   * Kind pre-selected when the dialog opens. When undefined, the dialog
   * defaults to "news" and lets the user change it. The News/Sponsor/Vorstand
   * picker in 3e will pre-fill this and hide the selector.
   */
  initialKind?: MediaKind;
  /** When true, the kind radio group is hidden (kind is fixed). */
  lockKind?: boolean;
}

const KIND_OPTIONS: Array<{ value: MediaKind; label: string; hint: string }> = [
  { value: "news", label: "News-Hero", hint: "PNG, JPEG, WebP — max. 10 MB" },
  {
    value: "sponsor",
    label: "Sponsor-Logo",
    hint: "PNG, JPEG, SVG — max. 2 MB",
  },
  {
    value: "vorstand",
    label: "Vorstand-Porträt",
    hint: "PNG, JPEG, WebP — max. 5 MB",
  },
];

function accept(kind: MediaKind) {
  return kind === "sponsor"
    ? "image/png,image/jpeg,image/svg+xml"
    : "image/png,image/jpeg,image/webp";
}

export function UploadDialog({
  open,
  onClose,
  onUploaded,
  initialKind,
  lockKind = false,
}: Props) {
  const [kind, setKind] = useState<MediaKind>(initialKind ?? "news");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Reset the dialog state whenever it opens so stale selections from a
  // previous session don't bleed into the next upload.
  useEffect(() => {
    if (!open) return;
    setKind(initialKind ?? "news");
    setFile(null);
    setError(null);
    setBusy(false);
  }, [open, initialKind]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Bitte eine Datei auswählen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      const media = await api.upload<Media>("/api/media", form);
      onUploaded(media);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-upload-title"
      data-testid="media-upload-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(8, 8, 11, 0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-[440px] rounded-xl p-6"
        style={{
          background: "var(--paper-2)",
          border: "1px solid var(--rule-2)",
          boxShadow: "0 20px 60px rgba(0,0,0,.55)",
        }}
      >
        <div
          className="caps mb-2 text-[10.5px]"
          style={{ color: "var(--ink-3)" }}
        >
          Medium hochladen
        </div>
        <h2
          id="media-upload-title"
          className="font-display mb-5 text-[22px] leading-tight"
        >
          Neue Datei zur Mediathek
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          {!lockKind && (
            <fieldset className="space-y-2">
              <legend
                className="caps mb-1 text-[10.5px]"
                style={{ color: "var(--ink-3)" }}
              >
                Verwendung
              </legend>
              {KIND_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md p-3"
                  style={{
                    background:
                      kind === opt.value ? "var(--paper-3)" : "transparent",
                    border: `1px solid ${
                      kind === opt.value ? "var(--rule-2)" : "var(--rule)"
                    }`,
                  }}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={opt.value}
                    checked={kind === opt.value}
                    onChange={() => setKind(opt.value)}
                    data-testid={`upload-kind-${opt.value}`}
                    className="mt-0.5"
                  />
                  <div>
                    <div
                      className="text-[13px]"
                      style={{ color: "var(--ink)" }}
                    >
                      {opt.label}
                    </div>
                    <div
                      className="text-[11.5px]"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {opt.hint}
                    </div>
                  </div>
                </label>
              ))}
            </fieldset>
          )}

          <label className="block">
            <span
              className="caps mb-1 block text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Datei
            </span>
            <input
              type="file"
              accept={accept(kind)}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              data-testid="upload-file"
              className="block w-full text-[12.5px]"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-md px-3 py-2 text-[12px]"
              style={{
                border: "1px solid oklch(0.5 0.15 25 / 0.5)",
                background: "oklch(0.25 0.15 25 / 0.25)",
                color: "oklch(0.85 0.12 25)",
              }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              kind="ghost"
              size="md"
              type="button"
              onClick={onClose}
              disabled={busy}
              data-testid="upload-cancel"
            >
              Abbrechen
            </Button>
            <Button
              kind="primary"
              size="md"
              type="submit"
              disabled={busy || !file}
              leading={<Icons.Upload size={13} />}
              data-testid="upload-submit"
            >
              {busy ? "Lädt…" : "Hochladen"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
