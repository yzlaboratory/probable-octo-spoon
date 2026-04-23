function ThemeScreen({ themeKey, setThemeKey, density, setDensity, onToast }) {
  const palettes = [
    { k: "editorial", l: "Midnight · Purple & Coral", ink: "#f2f1ee", paper: "#0e0e12", primary: "oklch(0.62 0.22 290)", accent: "oklch(0.72 0.19 25)" },
    { k: "navy",      l: "Deep · Navy & Gold",    ink: "#f2eee4", paper: "#0f1626", primary: "#2d528e", accent: "#c89a2a" },
    { k: "kiosk",     l: "Kiosk · Schwarz & Zinnober", ink: "#ece6da", paper: "#0a0a0a", primary: "#d63816", accent: "#d63816" },
    { k: "moss",      l: "Light · Grün-Weiß",     ink: "#14201a", paper: "#ffffff", primary: "#14201a", accent: "#5b7a52" },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Konfiguration · Erscheinungsbild"
        title="Erscheinungsbild der Website"
        subtitle="So sieht deine Vereinswebsite aus. Alles hier wirkt sofort in der Vorschau – live geschaltet wird erst mit „Veröffentlichen."
        right={<>
          <Button kind="ghost">Verwerfen</Button>
          <Button kind="primary" onClick={() => onToast("Änderungen übernommen.")}>Übernehmen & veröffentlichen</Button>
        </>}
      />

      <div className="px-10 pb-14 grid grid-cols-12 gap-6">
        {/* Settings column */}
        <div className="col-span-5 space-y-5">
          <Card padded={false}>
            <div className="px-5 py-3 rule-b caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Farbwelt</div>
            <div className="p-5 space-y-3">
              {palettes.map(p => (
                <button key={p.k} onClick={() => setThemeKey(p.k)} className="w-full flex items-center gap-4 p-3 rounded-sm text-left" style={{ background: themeKey === p.k ? "var(--paper-2)" : "transparent", border: `1px solid ${themeKey === p.k ? "var(--forest)" : "var(--rule)"}` }}>
                  <div className="flex rounded-sm overflow-hidden shrink-0" style={{ border: "1px solid var(--rule-2)" }}>
                    <div className="w-6 h-10" style={{ background: p.paper }} />
                    <div className="w-6 h-10" style={{ background: p.primary }} />
                    <div className="w-6 h-10" style={{ background: p.accent }} />
                    <div className="w-6 h-10" style={{ background: p.ink }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{p.l}</div>
                    <div className="font-mono text-[10.5px] mt-0.5" style={{ color: "var(--ink-3)" }}>{p.paper.toUpperCase()} / {p.primary.toUpperCase()} / {p.accent.toUpperCase()}</div>
                  </div>
                  {themeKey === p.k && <Icons.Check size={15} stroke="var(--forest)" />}
                </button>
              ))}
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 py-3 rule-b caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Typografie</div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] caps block mb-1.5" style={{ color: "var(--ink-3)" }}>Überschriften</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { f: "Newsreader", c: true },
                    { f: "Fraunces" },
                    { f: "DM Serif" },
                  ].map(x => (
                    <button key={x.f} className="h-14 rounded-md flex items-center justify-center" style={{ background: x.c ? "var(--forest)" : "var(--paper-3)", color: x.c ? "#fff" : "var(--ink)", border: "1px solid var(--rule)", fontFamily: "Newsreader, serif", fontSize: 18, boxShadow: x.c ? "0 0 16px var(--glow)" : "none" }}>{x.f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] caps block mb-1.5" style={{ color: "var(--ink-3)" }}>Fließtext</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { f: "Geist", c: true },
                    { f: "IBM Plex" },
                    { f: "Manrope" },
                  ].map(x => (
                    <button key={x.f} className="h-14 rounded-md flex items-center justify-center" style={{ background: x.c ? "var(--forest)" : "var(--paper-3)", color: x.c ? "#fff" : "var(--ink)", border: "1px solid var(--rule)", fontSize: 14, boxShadow: x.c ? "0 0 16px var(--glow)" : "none" }}>{x.f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] caps block mb-1.5" style={{ color: "var(--ink-3)" }}>Basisgröße</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={14} max={20} defaultValue={16} className="flex-1" style={{ accentColor: "var(--forest)" }} />
                  <span className="font-mono text-[12px] w-10 text-right">16 px</span>
                </div>
              </div>
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 py-3 rule-b caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Layout</div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] caps block mb-1.5" style={{ color: "var(--ink-3)" }}>Dichte</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Luftig", "Ausgewogen", "Kompakt"].map((l, i) => (
                    <button key={l} onClick={() => setDensity(i)} className="h-10 rounded-md text-[12px]" style={{ background: density === i ? "var(--forest)" : "var(--paper-3)", color: density === i ? "#fff" : "var(--ink-2)", border: "1px solid var(--rule)", boxShadow: density === i ? "0 0 16px var(--glow)" : "none" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 rule-t">
                <div>
                  <div className="text-[13px] font-medium">Dunkles Menü</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>Kopfzeile mit dunklem Hintergrund.</div>
                </div>
                <div className="w-10 h-6 rounded-full relative" style={{ background: "var(--forest)" }}>
                  <div className="w-4 h-4 rounded-full absolute top-1 right-1" style={{ background: "var(--paper)" }} />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 rule-t">
                <div>
                  <div className="text-[13px] font-medium">Instagram-Galerie auf Startseite</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>Zeigt die letzten 6 Posts.</div>
                </div>
                <div className="w-10 h-6 rounded-full relative" style={{ background: "var(--forest)" }}>
                  <div className="w-4 h-4 rounded-full absolute top-1 right-1" style={{ background: "var(--paper)" }} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div className="col-span-7">
          <div className="sticky top-[80px]">
            <div className="flex items-center justify-between mb-3">
              <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Vorschau · Startseite</div>
              <div className="flex gap-1 text-[11px]" style={{ color: "var(--ink-3)" }}>
                <button className="px-2.5 h-7 rounded-full" style={{ background: "var(--forest)", color: "#fff", boxShadow: "0 0 16px var(--glow)" }}>Desktop</button>
                <button className="px-2.5 h-7 rounded-full">Tablet</button>
                <button className="px-2.5 h-7 rounded-full">Mobil</button>
              </div>
            </div>

            <ThemePreview themeKey={themeKey} density={density} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemePreview({ themeKey, density }) {
  const themes = {
    editorial: { paper: "#0e0e12", ink: "#f2f1ee", primary: "oklch(0.62 0.22 290)", accent: "oklch(0.72 0.19 25)", nav: "dark" },
    navy:      { paper: "#0f1626", ink: "#f2eee4", primary: "#2d528e", accent: "#c89a2a", nav: "dark" },
    kiosk:     { paper: "#0a0a0a", ink: "#ece6da", primary: "#d63816", accent: "#d63816", nav: "dark" },
    moss:      { paper: "#ffffff", ink: "#14201a", primary: "#14201a", accent: "#5b7a52", nav: "light" },
  };
  const t = themes[themeKey];
  const pad = density === 0 ? "28px" : density === 1 ? "20px" : "14px";

  return (
    <div className="rounded-sm overflow-hidden" style={{ background: t.paper, color: t.ink, border: "1px solid var(--rule-2)", boxShadow: "0 20px 60px -30px rgba(0,0,0,.25)" }}>
      {/* Site header */}
      <div style={{ background: t.nav === "dark" ? t.ink : t.paper, color: t.nav === "dark" ? t.paper : t.ink, padding: `18px ${pad}`, borderBottom: `1px solid ${t.nav === "dark" ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)"}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-display text-[12px]" style={{ background: t.accent, color: "#fff" }}>GW</div>
            <div className="font-display text-[17px]" style={{ letterSpacing: "-0.01em" }}>SV Grün-Weiß Birkenstett</div>
          </div>
          <div className="flex gap-5 text-[11.5px]" style={{ opacity: .8 }}>
            <span>News</span><span>Mannschaften</span><span>Termine</span><span>Vorstand</span><span>Kontakt</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: pad }}>
        <div className="caps text-[10px] mb-2" style={{ color: t.accent }}>Meldung vom 18. April</div>
        <div className="font-display text-[34px] leading-[1.05]" style={{ letterSpacing: "-0.015em", textWrap: "balance", maxWidth: 520 }}>Kreisligaderby: später Siegtreffer gegen FC Waldau.</div>
        <div className="text-[12.5px] mt-3 max-w-[500px]" style={{ opacity: .7, textWrap: "pretty" }}>Nach 0:1-Rückstand dreht die Erste die Partie in den Schlussminuten. Jonas Huber trifft in der 89.</div>
        <div className="mt-4 flex gap-2">
          <div className="px-3 h-8 rounded-md flex items-center text-[11.5px] font-medium" style={{ background: t.primary, color: "#fff" }}>Artikel lesen</div>
          <div className="px-3 h-8 rounded-sm flex items-center text-[11.5px]" style={{ border: `1px solid ${t.ink}22` }}>Alle Meldungen</div>
        </div>
      </div>

      <div style={{ height: 1, background: `${t.ink}15` }} />

      {/* News grid */}
      <div style={{ padding: pad }}>
        <div className="caps text-[10px] mb-3" style={{ opacity: .6 }}>Weitere Meldungen</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { t: "F-Junioren-Turnier", tag: "Jugend" },
            { t: "Bezirksmeisterschaft: 4 Medaillen", tag: "Leichtathletik" },
            { t: "Neue Trikots für die Herren", tag: "Sponsoring" },
          ].map((n, i) => (
            <div key={i} className="rounded-sm overflow-hidden" style={{ border: `1px solid ${t.ink}15` }}>
              <div className="aspect-[5/3]" style={{ background: i === 0 ? t.accent : i === 1 ? t.primary : `${t.ink}20` }} />
              <div style={{ padding: 10 }}>
                <div className="caps text-[9px] mb-1" style={{ color: t.accent }}>{n.tag}</div>
                <div className="font-display text-[13px] leading-tight" style={{ textWrap: "balance" }}>{n.t}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sponsor strip */}
      <div style={{ padding: `${pad} ${pad} 4px`, borderTop: `1px solid ${t.ink}10` }}>
        <div className="caps text-[9.5px] mb-3" style={{ opacity: .55 }}>Unsere Sponsoren</div>
        <div className="grid grid-cols-6 gap-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-12 rounded-sm flex items-center justify-center font-display text-[10px]" style={{ background: `${t.ink}08`, color: t.ink, opacity: .6 }}>
              Logo {i}
            </div>
          ))}
        </div>
        <div className="text-[10px] mt-4 mb-2" style={{ opacity: .4, textAlign: "center" }}>© 2026 SV Grün-Weiß Birkenstett · Impressum · Datenschutz</div>
      </div>
    </div>
  );
}

window.ThemeScreen = ThemeScreen;
