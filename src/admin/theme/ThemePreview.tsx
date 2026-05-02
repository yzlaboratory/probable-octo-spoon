import type { ThemeDraft } from "./draft";
import { DENSITY_PAD_PX, paletteFor } from "./palettes";

/**
 * In-page mock of the public homepage in the chosen theme. NOT an iframe of
 * the real `/` route — the public site does not yet consume theme tokens
 * (see ADR 0013), so previewing it would mislead.
 *
 * Composition is a fixed shape: header / hero / news grid / sponsor strip.
 * It exists to give the admin an honest-enough sense of the palette and
 * density together, not to be pixel-accurate to whatever the public site
 * eventually becomes.
 */
export default function ThemePreview({ draft }: { draft: ThemeDraft }) {
  const t = paletteFor(draft.palette);
  const pad = DENSITY_PAD_PX[draft.density];
  const headingFamily =
    draft.headingFont === "Newsreader" ? "Newsreader, serif" : "Newsreader, serif";
  const bodyFamily = draft.bodyFont === "Geist" ? "Geist, sans-serif" : "Geist, sans-serif";
  const navDark = draft.darkNav && t.nav === "dark";

  return (
    <div
      data-testid="theme-preview"
      className="overflow-hidden rounded-sm"
      style={{
        background: t.paper,
        color: t.ink,
        border: "1px solid var(--rule-2)",
        boxShadow: "0 20px 60px -30px rgba(0,0,0,.25)",
        fontFamily: bodyFamily,
        fontSize: draft.baseSizePx,
      }}
    >
      <header
        style={{
          background: navDark ? t.ink : t.paper,
          color: navDark ? t.paper : t.ink,
          padding: `18px ${pad}px`,
          borderBottom: `1px solid ${navDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)"}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md text-[12px]"
              style={{
                background: t.accent,
                color: "#fff",
                fontFamily: headingFamily,
              }}
            >
              SVA
            </div>
            <div
              className="text-[17px]"
              style={{ letterSpacing: "-0.01em", fontFamily: headingFamily }}
            >
              SV Alemannia Thalexweiler
            </div>
          </div>
          <nav
            className="flex gap-5 text-[11.5px]"
            style={{ opacity: 0.8 }}
            aria-label="Beispielnavigation"
          >
            <span>News</span>
            <span>Mannschaften</span>
            <span>Termine</span>
            <span>Vorstand</span>
            <span>Kontakt</span>
          </nav>
        </div>
      </header>

      <section style={{ padding: pad }}>
        <div className="caps mb-2 text-[10px]" style={{ color: t.accent }}>
          Meldung vom 28. April
        </div>
        <h1
          className="text-[34px] leading-[1.05]"
          style={{
            letterSpacing: "-0.015em",
            textWrap: "balance",
            maxWidth: 520,
            fontFamily: headingFamily,
          }}
        >
          Kreisligaderby: später Siegtreffer gegen FC Waldau.
        </h1>
        <p
          className="mt-3 max-w-[500px] text-[12.5px]"
          style={{ opacity: 0.7, textWrap: "pretty" }}
        >
          Nach 0:1-Rückstand dreht die Erste die Partie in den Schlussminuten.
          Jonas Huber trifft in der 89.
        </p>
        <div className="mt-4 flex gap-2">
          <span
            className="flex h-8 items-center rounded-md px-3 text-[11.5px] font-medium"
            style={{ background: t.primary, color: "#fff" }}
          >
            Artikel lesen
          </span>
          <span
            className="flex h-8 items-center rounded-sm px-3 text-[11.5px]"
            style={{ border: `1px solid ${t.ink}22` }}
          >
            Alle Meldungen
          </span>
        </div>
      </section>

      <div style={{ height: 1, background: `${t.ink}15` }} />

      <section style={{ padding: pad }}>
        <div className="caps mb-3 text-[10px]" style={{ opacity: 0.6 }}>
          Weitere Meldungen
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { t: "F-Junioren-Turnier", tag: "Jugend" },
            { t: "Bezirksmeisterschaft: 4 Medaillen", tag: "Leichtathletik" },
            { t: "Neue Trikots für die Herren", tag: "Sponsoring" },
          ].map((n, i) => (
            <article
              key={n.t}
              className="overflow-hidden rounded-sm"
              style={{ border: `1px solid ${t.ink}15` }}
            >
              <div
                className="aspect-[5/3]"
                style={{
                  background:
                    i === 0 ? t.accent : i === 1 ? t.primary : `${t.ink}20`,
                }}
              />
              <div style={{ padding: 10 }}>
                <div
                  className="caps mb-1 text-[9px]"
                  style={{ color: t.accent }}
                >
                  {n.tag}
                </div>
                <div
                  className="text-[13px] leading-tight"
                  style={{ textWrap: "balance", fontFamily: headingFamily }}
                >
                  {n.t}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {draft.instagramOnHome && (
        <section
          style={{
            padding: `${pad}px ${pad}px 4px`,
            borderTop: `1px solid ${t.ink}10`,
          }}
        >
          <div className="caps mb-3 text-[9.5px]" style={{ opacity: 0.55 }}>
            Aus dem Instagram-Feed
          </div>
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-sm"
                style={{
                  background: `${t.ink}10`,
                }}
              />
            ))}
          </div>
        </section>
      )}

      <section
        style={{
          padding: `${pad}px ${pad}px 4px`,
          borderTop: `1px solid ${t.ink}10`,
        }}
      >
        <div className="caps mb-3 text-[9.5px]" style={{ opacity: 0.55 }}>
          Unsere Sponsoren
        </div>
        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex h-12 items-center justify-center rounded-sm text-[10px]"
              style={{
                background: `${t.ink}08`,
                color: t.ink,
                opacity: 0.6,
                fontFamily: headingFamily,
              }}
            >
              Logo {i}
            </div>
          ))}
        </div>
        <div
          className="mt-4 mb-2 text-center text-[10px]"
          style={{ opacity: 0.4 }}
        >
          © {new Date().getFullYear()} SV Alemannia Thalexweiler · Impressum ·
          Datenschutz
        </div>
      </section>
    </div>
  );
}
