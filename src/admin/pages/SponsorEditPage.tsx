import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import type { CardPalette, Media, Sponsor, SponsorStatus } from "../types";
import MediaUploader from "../components/MediaUploader";
import { Button, Card, PageHeader } from "../ui";

const PALETTES: Array<{
  key: CardPalette;
  label: string;
  previewClass: string;
}> = [
  {
    key: "transparent",
    label: "Transparent",
    previewClass: "bg-transparent border-dashed",
  },
  { key: "purple", label: "Clubviolett", previewClass: "" },
  { key: "warm-neutral", label: "Warm", previewClass: "bg-amber-100" },
  { key: "cool-neutral", label: "Kühl", previewClass: "bg-slate-200" },
];

function paletteBg(p: CardPalette) {
  switch (p) {
    case "purple":
      return { background: "var(--primary)" };
    case "warm-neutral":
      return { background: "#fef3c7" };
    case "cool-neutral":
      return { background: "#e2e8f0" };
    default:
      return { background: "transparent" };
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

  if (loading) {
    return (
      <div
        className="px-10 py-20 text-center"
        style={{ color: "var(--ink-3)" }}
      >
        Lade…
      </div>
    );
  }

  const logoSrc =
    logo?.variants["400w"] || logo?.variants["200w"] || logo?.variants.svg;
  const bgStyle = paletteBg(cardPalette);

  return (
    <div>
      <PageHeader
        eyebrow={editing ? "Bearbeiten" : "Neu"}
        title={editing ? name || "Sponsor bearbeiten" : "Neuer Sponsor"}
        subtitle="Name, Logo, Gewichtung und Zeitraum der Einblendung."
        right={
          <Button kind="ghost" size="md" onClick={() => nav("/admin/sponsors")}>
            Abbrechen
          </Button>
        }
      />

      <div className="px-10 pb-10">
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]"
        >
          <div className="space-y-4">
            <Card>
              <label className="block mb-3">
                <span
                  className="mb-1 block text-[11px] caps"
                  style={{ color: "var(--ink-3)" }}
                >
                  Name
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="cs-input"
                />
              </label>
              <label className="block mb-3">
                <span
                  className="mb-1 block text-[11px] caps"
                  style={{ color: "var(--ink-3)" }}
                >
                  Untertitel (optional)
                </span>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="cs-input"
                />
              </label>
              <label className="block">
                <span
                  className="mb-1 block text-[11px] caps"
                  style={{ color: "var(--ink-3)" }}
                >
                  Link
                </span>
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="cs-input"
                />
              </label>
            </Card>

            <Card>
              <div
                className="caps text-[10.5px] mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Logo
              </div>
              <MediaUploader
                kind="sponsor"
                value={logo}
                onChange={setLogo}
                label=""
                helper="PNG, JPEG oder SVG — max. 2 MB."
              />
            </Card>

            <Card>
              <div
                className="caps text-[10.5px] mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Kartenhintergrund
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PALETTES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setCardPalette(p.key)}
                    className={`rounded-md p-3 text-[12px] transition ${p.previewClass}`}
                    style={{
                      border: `2px solid ${cardPalette === p.key ? "var(--primary)" : "var(--rule-2)"}`,
                      color: ["warm-neutral", "cool-neutral"].includes(p.key)
                        ? "#111"
                        : "var(--ink)",
                      background:
                        p.key === "purple"
                          ? "color-mix(in oklab, var(--primary) 70%, transparent)"
                          : undefined,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={logoHasOwnBackground}
                  onChange={(e) => setLogoHasOwnBackground(e.target.checked)}
                />
                Logo hat einen eigenen Hintergrund
              </label>
            </Card>

            <Card>
              <label className="block mb-3">
                <span
                  className="mb-1 block text-[11px] caps"
                  style={{ color: "var(--ink-3)" }}
                >
                  Gewicht (1–100)
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="cs-input max-w-[120px] font-mono"
                />
                <p
                  className="mt-1 text-[12px]"
                  style={{ color: "var(--ink-3)" }}
                >
                  Niedrig = seltene Einblendung. Mittel (~50) = Standard. Hoch
                  = Headliner-Platzierung.
                </p>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span
                    className="mb-1 block text-[11px] caps"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Aktiv ab (optional)
                  </span>
                  <input
                    type="datetime-local"
                    value={activeFrom}
                    onChange={(e) => setActiveFrom(e.target.value)}
                    className="cs-input"
                  />
                </label>
                <label className="block">
                  <span
                    className="mb-1 block text-[11px] caps"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Aktiv bis (optional)
                  </span>
                  <input
                    type="datetime-local"
                    value={activeUntil}
                    onChange={(e) => setActiveUntil(e.target.value)}
                    className="cs-input"
                  />
                </label>
              </div>
            </Card>

            <Card>
              <label className="block">
                <span
                  className="mb-1 block text-[11px] caps"
                  style={{ color: "var(--ink-3)" }}
                >
                  Interne Notizen
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="cs-input"
                />
              </label>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <div
                className="caps text-[10.5px] mb-3"
                style={{ color: "var(--ink-3)" }}
              >
                Vorschau
              </div>
              <div
                className="mb-2 text-[11px] caps"
                style={{ color: "var(--ink-4)" }}
              >
                News-Karussell
              </div>
              <div
                className="mb-4 flex h-24 items-center justify-center rounded-md"
                style={bgStyle}
              >
                {logoSrc && (
                  <img src={logoSrc} alt="" className="max-h-16 object-contain" />
                )}
              </div>
              <div
                className="mb-2 text-[11px] caps"
                style={{ color: "var(--ink-4)" }}
              >
                Social-Karussell
              </div>
              <div
                className="mb-4 flex h-24 items-center justify-center rounded-md grayscale"
                style={bgStyle}
              >
                {logoSrc && (
                  <img src={logoSrc} alt="" className="max-h-16 object-contain" />
                )}
              </div>
              <div
                className="mb-2 text-[11px] caps"
                style={{ color: "var(--ink-4)" }}
              >
                Footer-Kachel
              </div>
              <div
                className="flex h-20 items-center justify-center rounded-md"
                style={bgStyle}
              >
                {logoSrc && (
                  <img src={logoSrc} alt="" className="max-h-12 object-contain" />
                )}
              </div>
            </Card>
            <Card>
              <fieldset
                className="rounded-md p-3"
                style={{ border: "1px solid var(--rule-2)" }}
              >
                <legend
                  className="px-2 text-[10.5px] caps"
                  style={{ color: "var(--ink-3)" }}
                >
                  Status
                </legend>
                {(["active", "paused", "archived"] as const).map((s) => (
                  <label
                    key={s}
                    className="mb-1 flex items-center gap-2 text-[13px]"
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={status === s}
                      onChange={() => setStatus(s)}
                    />
                    {s === "active"
                      ? "Aktiv"
                      : s === "paused"
                        ? "Pausiert"
                        : "Archiviert"}
                  </label>
                ))}
              </fieldset>
            </Card>
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
            <Button
              type="submit"
              kind="primary"
              size="lg"
              className="w-full justify-center"
            >
              Speichern
            </Button>
          </aside>
        </form>
      </div>
    </div>
  );
}
