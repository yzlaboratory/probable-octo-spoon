import type { ThemeDraft } from "./draft";
import { DENSITY_PAD_PX, paletteFor } from "./palettes";

/**
 * In-page mock of the public homepage in the chosen theme. NOT an iframe of
 * the real `/` route — the public site does not yet consume theme tokens
 * (see ADR 0013), so previewing it would mislead.
 *
 * Mirrors the public-site design language post-redesign (PR #20): dark
 * `paper` surface, caps-eyebrow section labels with a glowing primary rail,
 * `cs-tile`-style news cards (image · chip · mono date · display title),
 * hairline rules between sections, optional Instagram strip, sponsor strip.
 *
 * The composition is fixed; only the palette/density/typography tokens move.
 * It exists to give an honest sense of the chosen settings against the
 * current layout, not to be pixel-accurate to whatever the public site
 * eventually becomes.
 */
export default function ThemePreview({ draft }: { draft: ThemeDraft }) {
  const t = paletteFor(draft.palette);
  const pad = DENSITY_PAD_PX[draft.density];
  const headingFamily =
    draft.headingFont === "Newsreader"
      ? "Newsreader, serif"
      : draft.headingFont === "Fraunces"
        ? "Fraunces, Newsreader, serif"
        : "DM Serif Display, Newsreader, serif";
  const bodyFamily =
    draft.bodyFont === "Geist"
      ? "Geist, ui-sans-serif, system-ui, sans-serif"
      : draft.bodyFont === "IBMPlex"
        ? "IBM Plex Sans, Geist, ui-sans-serif, sans-serif"
        : "Manrope, Geist, ui-sans-serif, sans-serif";
  const navDark = draft.darkNav && t.nav === "dark";

  // Derived tokens that mirror the public-shell role (paper-2, rule, ink-3,
  // primary-glow). For palette-agnostic translucent fills we lean on
  // color-mix so navy / kiosk / moss all get sensibly tinted chips and
  // hairlines instead of hardcoded purple.
  const paper2 = `color-mix(in oklab, ${t.ink} 5%, ${t.paper})`;
  const paper3 = `color-mix(in oklab, ${t.ink} 9%, ${t.paper})`;
  const rule = `color-mix(in oklab, ${t.ink} 14%, transparent)`;
  const rule2 = `color-mix(in oklab, ${t.ink} 22%, transparent)`;
  const inkMuted = `color-mix(in oklab, ${t.ink} 60%, ${t.paper})`;
  const inkSoft = `color-mix(in oklab, ${t.ink} 80%, ${t.paper})`;
  const primaryGlow = `color-mix(in oklab, ${t.primary} 35%, transparent)`;
  const chipBg = `color-mix(in oklab, ${t.primary} 18%, ${t.paper})`;
  const chipFg = `color-mix(in oklab, ${t.primary} 65%, ${t.ink})`;

  function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
      <div
        className="mb-3 flex items-center gap-2"
        style={{
          fontFamily: bodyFamily,
          fontSize: 10.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: inkMuted,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 22,
            height: 2,
            background: t.primary,
            borderRadius: 2,
            boxShadow: `0 0 12px ${primaryGlow}`,
          }}
        />
        {children}
      </div>
    );
  }

  return (
    <div
      data-testid="theme-preview"
      className="overflow-hidden rounded-sm"
      style={{
        background: t.paper,
        color: t.ink,
        border: "1px solid var(--rule-2)",
        boxShadow: "0 20px 60px -30px rgba(0,0,0,.45)",
        fontFamily: bodyFamily,
        fontSize: draft.baseSizePx,
      }}
    >
      {/* Header: glowing logo + stacked caps wordmark + small navlinks + IG/LOGIN */}
      <header
        style={{
          background: navDark
            ? t.paper
            : `color-mix(in oklab, ${t.ink} 4%, ${t.paper})`,
          color: navDark ? t.ink : t.ink,
          padding: `12px ${pad}px`,
          borderBottom: `1px solid ${rule}`,
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold"
              style={{
                background: t.primary,
                color: "#fff",
                boxShadow: `0 0 14px ${primaryGlow}`,
              }}
            >
              SVA
            </div>
            <div className="flex flex-col leading-[1.05]">
              <span
                className="text-[11px] font-semibold"
                style={{
                  letterSpacing: "0.04em",
                  color: t.ink,
                }}
              >
                SVALEMANNIA
              </span>
              <span
                className="text-[9px]"
                style={{
                  letterSpacing: "0.18em",
                  color: inkMuted,
                }}
              >
                THALEXWEILER
              </span>
            </div>
          </div>
          <nav
            className="ml-2 flex flex-1 items-center gap-1"
            aria-label="Beispielnavigation"
          >
            {[
              { label: "Start", active: true },
              { label: "Spiele", active: false },
              { label: "Training", active: false },
            ].map((n) => (
              <span
                key={n.label}
                className="inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-medium"
                style={{
                  background: n.active ? paper3 : "transparent",
                  color: n.active ? t.ink : inkSoft,
                  boxShadow: n.active ? `inset 0 0 0 1px ${rule2}` : "none",
                  letterSpacing: "0.01em",
                }}
              >
                {n.label}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md text-[10px]"
              style={{
                background: paper2,
                border: `1px solid ${rule2}`,
                color: inkSoft,
              }}
              aria-hidden="true"
            >
              IG
            </div>
            <span
              className="inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium"
              style={{
                background: paper2,
                border: `1px solid ${rule2}`,
                color: t.ink,
                letterSpacing: "0.04em",
              }}
            >
              LOGIN
            </span>
          </div>
        </div>
      </header>

      {/* News section */}
      <section style={{ padding: pad }}>
        <Eyebrow>Alemannia News</Eyebrow>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              tag: "Liga",
              title: "Spätes 2:1 gegen FC Waldau",
              date: "28.04.",
            },
            {
              tag: "Jugend",
              title: "F-Junioren-Turnier in Lebach",
              date: "21.04.",
            },
            {
              tag: "Sponsor",
              title: "Neue Trikots dank Bauunion Saar",
              date: "14.04.",
            },
          ].map((n, i) => (
            <article
              key={n.title}
              className="overflow-hidden rounded-[10px]"
              style={{
                background: paper2,
                border: `1px solid ${rule}`,
              }}
            >
              <div
                style={{
                  aspectRatio: "100 / 56",
                  background:
                    i === 0
                      ? `color-mix(in oklab, ${t.primary} 65%, ${t.paper})`
                      : i === 1
                        ? `color-mix(in oklab, ${t.accent} 60%, ${t.paper})`
                        : paper3,
                }}
              />
              <div style={{ padding: 10 }}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-[1px] text-[9.5px]"
                    style={{
                      background: chipBg,
                      color: chipFg,
                      letterSpacing: "0.02em",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        background: t.primary,
                      }}
                    />
                    {n.tag}
                  </span>
                  <span
                    className="text-[9.5px]"
                    style={{
                      fontFamily: "ui-monospace, Menlo, monospace",
                      color: inkMuted,
                    }}
                  >
                    {n.date}
                  </span>
                </div>
                <div
                  className="text-[12.5px] leading-[1.18]"
                  style={{
                    fontFamily: headingFamily,
                    letterSpacing: "-0.012em",
                    textWrap: "balance",
                    color: t.ink,
                  }}
                >
                  {n.title}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: rule }} />

      {/* Fixtures strip — caps eyebrow + a single tile row, mirrors NextFixturesSection */}
      <section style={{ padding: pad }}>
        <Eyebrow>Nächste Spiele</Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              home: "SV-A",
              away: "FC Waldau",
              when: "So · 15:00",
              venue: "Heim",
            },
            {
              home: "TuS Aschbach",
              away: "SV-A",
              when: "Sa · 17:30",
              venue: "Auswärts",
            },
          ].map((f) => (
            <div
              key={`${f.home}-${f.away}`}
              className="flex items-center justify-between rounded-[10px] px-3 py-2.5"
              style={{
                background: paper2,
                border: `1px solid ${rule}`,
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-[11.5px] font-medium"
                  style={{ color: t.ink }}
                >
                  {f.home} <span style={{ color: inkMuted }}>vs</span> {f.away}
                </span>
                <span
                  className="text-[10px]"
                  style={{
                    color: inkMuted,
                    letterSpacing: "0.02em",
                  }}
                >
                  {f.when} · {f.venue}
                </span>
              </div>
              <span
                className="inline-flex h-5 items-center rounded-full px-2 text-[9px]"
                style={{
                  background: chipBg,
                  color: chipFg,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {f.venue}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: rule }} />

      {/* Instagram strip — gated by toggle */}
      {draft.instagramOnHome && (
        <>
          <section style={{ padding: pad }}>
            <Eyebrow>Aus dem Instagram-Feed</Eyebrow>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[8px]"
                  style={{
                    background: paper3,
                    border: `1px solid ${rule}`,
                  }}
                />
              ))}
            </div>
          </section>
          <div style={{ height: 1, background: rule }} />
        </>
      )}

      {/* Sponsors */}
      <section
        style={{ padding: `${pad}px ${pad}px ${Math.max(8, pad - 6)}px` }}
      >
        <Eyebrow>Unsere Sponsoren</Eyebrow>
        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex h-12 items-center justify-center rounded-[8px] text-[10px]"
              style={{
                background: paper2,
                border: `1px solid ${rule}`,
                color: inkMuted,
                fontFamily: bodyFamily,
                letterSpacing: "0.04em",
              }}
            >
              Logo {i}
            </div>
          ))}
        </div>
        <div
          className="mt-4 text-center text-[10px]"
          style={{
            color: inkMuted,
            letterSpacing: "0.04em",
          }}
        >
          © {new Date().getFullYear()} SV Alemannia Thalexweiler · Impressum ·
          Datenschutz
        </div>
      </section>
    </div>
  );
}
