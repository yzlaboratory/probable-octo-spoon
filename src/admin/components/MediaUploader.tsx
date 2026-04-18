import { useState } from "react";
import { api, ApiError } from "../api";
import type { Media } from "../types";

interface Props {
  kind: "news" | "sponsor" | "vorstand";
  value: Media | null;
  onChange: (media: Media | null) => void;
  label?: string;
  helper?: string;
}

export default function MediaUploader({ kind, value, onChange, label = "Bild", helper }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      const media = await api.upload<Media>("/api/media", form);
      onChange(media);
    } catch (e2) {
      if (e2 instanceof ApiError) setErr(e2.message);
      else setErr("Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  const preview = value?.variants["400w"] || value?.variants["320w"] || value?.variants["200w"] || value?.variants.svg;

  return (
    <div>
      <div className="mb-1 text-xs text-neutral-400">{label}</div>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-neutral-600">kein Bild</span>
          )}
        </div>
        <label className="cursor-pointer rounded-sm border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800">
          {busy ? "Lädt…" : value ? "Ersetzen" : "Hochladen"}
          <input
            type="file"
            className="hidden"
            accept={
              kind === "sponsor"
                ? "image/png,image/jpeg,image/svg+xml"
                : "image/png,image/jpeg,image/webp"
            }
            onChange={onFile}
            disabled={busy}
          />
        </label>
        {value && (
          <button
            type="button"
            className="text-xs text-neutral-400 hover:text-neutral-200"
            onClick={() => onChange(null)}
          >
            Entfernen
          </button>
        )}
      </div>
      {helper && <div className="mt-1 text-xs text-neutral-500">{helper}</div>}
      {err && <div className="mt-1 text-xs text-red-400">{err}</div>}
    </div>
  );
}
