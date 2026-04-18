import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import type { CardPalette, Media, Sponsor, SponsorStatus } from "../types";
import MediaUploader from "../components/MediaUploader";

const PALETTES: Array<{ key: CardPalette; label: string; preview: string }> = [
  { key: "transparent", label: "Transparent", preview: "bg-transparent border-dashed border-neutral-600" },
  { key: "purple", label: "Clubviolett", preview: "bg-primary/70" },
  { key: "warm-neutral", label: "Warm", preview: "bg-amber-100" },
  { key: "cool-neutral", label: "Kühl", preview: "bg-slate-200" },
];

function paletteBg(p: CardPalette) {
  switch (p) {
    case "purple": return "bg-primary/70";
    case "warm-neutral": return "bg-amber-100";
    case "cool-neutral": return "bg-slate-200";
    default: return "bg-transparent";
  }
}

export default function SponsorEditPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = id !== undefined;
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [logo, setLogo] = useState<Media | null>(null);
  const [logoHasOwnBackground, setLogoHasOwnBackground] = useState(false);
  const [cardPalette, setCardPalette] = useState<CardPalette>("transparent");
  const [weight, setWeight] = useState(50);
  const [status, setStatus] = useState<SponsorStatus>("active");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeUntil, setActiveUntil] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!editing) return;
    api.get<Sponsor[]>("/api/sponsors").then((all) => {
      const s = all.find((x) => x.id === Number(id));
      if (!s) {
        setError("Sponsor nicht gefunden.");
        setLoading(false);
        return;
      }
      setName(s.name);
      setTagline(s.tagline ?? "");
      setLinkUrl(s.linkUrl);
      setLogo(s.logo);
      setLogoHasOwnBackground(s.logoHasOwnBackground);
      setCardPalette(s.cardPalette);
      setWeight(s.weight);
      setStatus(s.status);
      setActiveFrom(s.activeFrom?.slice(0, 16) ?? "");
      setActiveUntil(s.activeUntil?.slice(0, 16) ?? "");
      setNotes(s.notes ?? "");
      setLoading(false);
    });
  }, [editing, id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!logo) {
      setError("Bitte ein Logo hochladen.");
      return;
    }
    const payload = {
      name,
      tagline: tagline || null,
      linkUrl,
      logoMediaId: logo.id,
      logoHasOwnBackground,
      cardPalette,
      weight,
      status,
      activeFrom: activeFrom ? new Date(activeFrom).toISOString() : null,
      activeUntil: activeUntil ? new Date(activeUntil).toISOString() : null,
      notes: notes || null,
    };
    try {
      if (editing) await api.patch(`/api/sponsors/${id}`, payload);
      else await api.post("/api/sponsors", payload);
      nav("/admin/sponsors");
    } catch (e2) {
      if (e2 instanceof ApiError) setError(e2.message);
      else setError("Speichern fehlgeschlagen.");
    }
  }

  if (loading) return <div className="text-neutral-500">Lade…</div>;

  const logoSrc = logo?.variants["400w"] || logo?.variants["200w"] || logo?.variants.svg;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{editing ? "Sponsor bearbeiten" : "Neuer Sponsor"}</h1>
        <Link to="/admin/sponsors" className="rounded-sm border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800">
          Abbrechen
        </Link>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Untertitel (optional)</span>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Link</span>
            <input type="url" required value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
          <MediaUploader kind="sponsor" value={logo} onChange={setLogo} label="Logo" helper="PNG, JPEG oder SVG — max. 2 MB." />

          <div>
            <div className="mb-1 text-xs text-neutral-400">Kartenhintergrund</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PALETTES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setCardPalette(p.key)}
                  className={`rounded-sm border-2 p-3 text-xs ${
                    cardPalette === p.key ? "border-primary" : "border-neutral-800"
                  } ${p.preview}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={logoHasOwnBackground}
              onChange={(e) => setLogoHasOwnBackground(e.target.checked)}
            />
            Logo hat einen eigenen Hintergrund
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Gewicht (1–100)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-32 rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Niedrig = seltene Einblendung. Mittel (~50) = Standard. Hoch = Headliner-Platzierung.
            </p>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">Aktiv ab (optional)</span>
              <input type="datetime-local" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-neutral-400">Aktiv bis (optional)</span>
              <input type="datetime-local" value={activeUntil} onChange={(e) => setActiveUntil(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-neutral-400">Interne Notizen</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-sm border border-neutral-700 bg-black px-3 py-2 text-sm" />
          </label>
        </div>

        <aside className="space-y-4">
          <div>
            <div className="mb-2 text-xs text-neutral-400">Vorschau</div>
            <div className="rounded-sm border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-2 text-xs text-neutral-500">News-Karussell</div>
              <div className={`mb-4 flex h-24 items-center justify-center rounded-sm ${paletteBg(cardPalette)}`}>
                {logoSrc && <img src={logoSrc} alt="" className="max-h-16 object-contain" />}
              </div>
              <div className="mb-2 text-xs text-neutral-500">Social-Karussell</div>
              <div className={`mb-4 flex h-24 items-center justify-center rounded-sm ${paletteBg(cardPalette)} grayscale`}>
                {logoSrc && <img src={logoSrc} alt="" className="max-h-16 object-contain" />}
              </div>
              <div className="mb-2 text-xs text-neutral-500">Footer-Kachel</div>
              <div className={`flex h-20 items-center justify-center rounded-sm ${paletteBg(cardPalette)}`}>
                {logoSrc && <img src={logoSrc} alt="" className="max-h-12 object-contain" />}
              </div>
            </div>
          </div>
          <fieldset className="rounded-sm border border-neutral-800 p-3">
            <legend className="px-2 text-xs text-neutral-400">Status</legend>
            {(["active", "paused", "archived"] as const).map((s) => (
              <label key={s} className="mb-1 flex items-center gap-2 text-sm">
                <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} />
                {s}
              </label>
            ))}
          </fieldset>
          {error && (
            <div role="alert" className="rounded-sm border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
          <button type="submit" className="w-full rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white">
            Speichern
          </button>
        </aside>
      </form>
    </div>
  );
}
