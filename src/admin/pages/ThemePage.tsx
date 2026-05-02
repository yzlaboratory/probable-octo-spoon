import { useEffect, useState } from "react";
import { Button, Card, PageHeader } from "../ui";
import * as Icons from "../ui/Icons";
import {
  BASE_SIZE_RANGE,
  DEFAULT_DRAFT,
  clampBaseSize,
  loadDraft,
  resetDraft,
  saveDraft,
  type BodyFont,
  type Density,
  type HeadingFont,
  type PaletteKey,
  type ThemeDraft,
} from "../theme/draft";
import {
  BODY_FONT_LABELS,
  DENSITY_LABELS,
  HEADING_FONT_LABELS,
  PALETTES,
} from "../theme/palettes";
import ThemePreview from "../theme/ThemePreview";

const HEADING_FONTS: HeadingFont[] = ["Newsreader", "Fraunces", "DMSerif"];
const BODY_FONTS: BodyFont[] = ["Geist", "IBMPlex", "Manrope"];
const DENSITIES: Density[] = ["airy", "balanced", "compact"];

const PUBLISH_DISABLED_REASON =
  "Bald verfügbar — kommt mit dem Website-Redesign.";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="caps text-[11px] mb-1.5 block"
      style={{ color: "var(--ink-3)" }}
    >
      {children}
    </div>
  );
}

function PaletteRow({
  palette,
  selected,
  onSelect,
}: {
  palette: (typeof PALETTES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full items-center gap-4 rounded-sm p-3 text-left"
      style={{
        background: selected ? "var(--paper-2)" : "transparent",
        border: `1px solid ${selected ? "var(--primary)" : "var(--rule)"}`,
      }}
    >
      <div
        className="flex shrink-0 overflow-hidden rounded-sm"
        style={{ border: "1px solid var(--rule-2)" }}
      >
        <div className="h-10 w-6" style={{ background: palette.paper }} />
        <div className="h-10 w-6" style={{ background: palette.primary }} />
        <div className="h-10 w-6" style={{ background: palette.accent }} />
        <div className="h-10 w-6" style={{ background: palette.ink }} />
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium">{palette.label}</div>
        <div
          className="font-mono mt-0.5 text-[10.5px]"
          style={{ color: "var(--ink-3)" }}
        >
          {palette.paper.toUpperCase()} / {palette.primary.toUpperCase()}
        </div>
      </div>
      {selected && <Icons.Check size={15} stroke="var(--primary)" />}
    </button>
  );
}

function FontGrid<T extends string>({
  options,
  labels,
  selected,
  onSelect,
  family,
  fontSize,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  selected: T;
  onSelect: (value: T) => void;
  family: string;
  fontSize: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => {
        const active = opt === selected;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            aria-pressed={active}
            className="flex h-14 items-center justify-center rounded-md"
            style={{
              background: active ? "var(--primary)" : "var(--paper-3)",
              color: active ? "#fff" : "var(--ink)",
              border: "1px solid var(--rule)",
              fontFamily: family,
              fontSize,
              boxShadow: active ? "0 0 16px var(--glow)" : "none",
            }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

function DensitySegmented({
  value,
  onSelect,
}: {
  value: Density;
  onSelect: (d: Density) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DENSITIES.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            aria-pressed={active}
            className="h-10 rounded-md text-[12px]"
            style={{
              background: active ? "var(--primary)" : "var(--paper-3)",
              color: active ? "#fff" : "var(--ink-2)",
              border: "1px solid var(--rule)",
              boxShadow: active ? "0 0 16px var(--glow)" : "none",
            }}
          >
            {DENSITY_LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rule-t flex items-center justify-between py-2">
      <div className="pr-3">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-10 rounded-full"
        style={{
          background: checked ? "var(--primary)" : "var(--paper-3)",
          border: "1px solid var(--rule-2)",
          transition: "background-color 120ms ease",
        }}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full"
          style={{
            background: "var(--paper)",
            left: checked ? "calc(100% - 1.25rem)" : "0.25rem",
            transition: "left 120ms ease",
          }}
        />
      </button>
    </div>
  );
}

export default function ThemePage() {
  const [draft, setDraft] = useState<ThemeDraft>(() => DEFAULT_DRAFT);

  useEffect(() => {
    setDraft(loadDraft());
  }, []);

  // Persistence is driven by user actions, not by state-changes-via-hydration.
  // Saving inside the handlers keeps the initial mount's `updatedAt` intact
  // when the user only opens the page without editing.
  function update<K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      const stamped = saveDraft({
        palette: next.palette,
        headingFont: next.headingFont,
        bodyFont: next.bodyFont,
        baseSizePx: next.baseSizePx,
        density: next.density,
        darkNav: next.darkNav,
        instagramOnHome: next.instagramOnHome,
      });
      return stamped;
    });
  }

  function handleReset() {
    setDraft(resetDraft());
  }

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Konfiguration · Erscheinungsbild"
        title="Erscheinungsbild der Website"
        subtitle={
          <>
            Probiere Farben, Schriften und Dichte aus. Die Vorschau aktualisiert
            sich sofort. Die Einstellungen bleiben in deinem Browser, bis das
            Website-Redesign live geht — solange wirken sie nicht auf
            Besucher:innen.
          </>
        }
        right={
          <>
            <Button kind="ghost" onClick={handleReset}>
              Verwerfen
            </Button>
            <Button
              kind="primary"
              disabled
              aria-disabled="true"
              title={PUBLISH_DISABLED_REASON}
            >
              Übernehmen & veröffentlichen
            </Button>
          </>
        }
      />

      <div
        className="grid grid-cols-12 gap-6 px-10 pb-14"
        data-testid="theme-grid"
      >
        <div className="col-span-12 space-y-5 lg:col-span-5">
          <Card padded={false}>
            <div
              className="rule-b caps px-5 py-3 text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Farbwelt
            </div>
            <div className="space-y-3 p-5">
              {PALETTES.map((p) => (
                <PaletteRow
                  key={p.key}
                  palette={p}
                  selected={draft.palette === p.key}
                  onSelect={() => update("palette", p.key as PaletteKey)}
                />
              ))}
            </div>
          </Card>

          <Card padded={false}>
            <div
              className="rule-b caps px-5 py-3 text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Typografie
            </div>
            <div className="space-y-4 p-5">
              <div>
                <SectionLabel>Überschriften</SectionLabel>
                <FontGrid
                  options={HEADING_FONTS}
                  labels={HEADING_FONT_LABELS}
                  selected={draft.headingFont}
                  onSelect={(v) => update("headingFont", v)}
                  family="Newsreader, serif"
                  fontSize={18}
                />
              </div>
              <div>
                <SectionLabel>Fließtext</SectionLabel>
                <FontGrid
                  options={BODY_FONTS}
                  labels={BODY_FONT_LABELS}
                  selected={draft.bodyFont}
                  onSelect={(v) => update("bodyFont", v)}
                  family="Geist, sans-serif"
                  fontSize={14}
                />
              </div>
              <div>
                <SectionLabel>Basisgröße</SectionLabel>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={BASE_SIZE_RANGE.min}
                    max={BASE_SIZE_RANGE.max}
                    value={draft.baseSizePx}
                    onChange={(e) =>
                      update(
                        "baseSizePx",
                        clampBaseSize(Number.parseInt(e.target.value, 10)),
                      )
                    }
                    aria-label="Basisgröße"
                    className="flex-1"
                    style={{ accentColor: "var(--primary)" }}
                  />
                  <span className="font-mono w-12 text-right text-[12px]">
                    {draft.baseSizePx} px
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card padded={false}>
            <div
              className="rule-b caps px-5 py-3 text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Layout
            </div>
            <div className="space-y-4 p-5">
              <div>
                <SectionLabel>Dichte</SectionLabel>
                <DensitySegmented
                  value={draft.density}
                  onSelect={(d) => update("density", d)}
                />
              </div>
              <ToggleRow
                label="Dunkles Menü"
                description="Kopfzeile mit dunklem Hintergrund."
                checked={draft.darkNav}
                onChange={(v) => update("darkNav", v)}
              />
              <ToggleRow
                label="Instagram-Galerie auf Startseite"
                description="Zeigt die letzten Posts."
                checked={draft.instagramOnHome}
                onChange={(v) => update("instagramOnHome", v)}
              />
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div className="sticky top-[80px]">
            <div
              className="caps mb-3 text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Vorschau · Startseite
            </div>
            <ThemePreview draft={draft} />
            <p
              className="mt-3 text-[11.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Die Vorschau ist eine Simulation — die echte Website nutzt diese
              Einstellungen erst, wenn das Website-Redesign live geht.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
