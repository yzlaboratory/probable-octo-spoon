function DashboardScreen() {
  const published = NEWS_DATA.filter(n => n.status === "published").length;
  const drafts = NEWS_DATA.filter(n => n.status === "draft").length;
  const scheduled = NEWS_DATA.filter(n => n.status === "scheduled").length;

  // sparkline data — fake weekly views
  const views = [120, 180, 150, 220, 290, 240, 380, 340, 420, 390, 510, 480];
  const maxV = Math.max(...views);
  const points = views.map((v, i) => `${(i/(views.length-1))*100},${40 - (v/maxV)*34}`).join(" ");

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Übersicht · Donnerstag, 16. April"
        title="Guten Morgen, Michael."
        subtitle="Drei Meldungen warten auf Freigabe, und die Jahreshauptversammlung ist in zwei Wochen. Hier ist, was heute anliegt."
        right={<>
          <Button kind="ghost" leading={<Icons.External size={14} />}>Website ansehen</Button>
          <Button kind="primary" leading={<Icons.Plus size={14} />}>Neue Meldung</Button>
        </>}
      />

      <div className="px-10 pb-14">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { k: "Meldungen", v: published, sub: `+${scheduled} geplant · ${drafts} Entwürfe`, tone: "forest", glow: "oklch(0.62 0.22 290 / 0.25)" },
            { k: "Seitenaufrufe / 7 T.", v: "4.218", sub: "+12 % vs. Vorwoche", tone: "rust", spark: true, glow: "oklch(0.72 0.19 25 / 0.22)" },
            { k: "Aktive Sponsoren", v: SPONSORS_DATA.filter(s=>s.status==="active").length, sub: "1 pausiert, 0 ausgelaufen", tone: "plum", glow: "oklch(0.58 0.22 330 / 0.22)" },
            { k: "Vorstandsmitglieder", v: VORSTAND_DATA.filter(v=>v.status==="active").length, sub: "vollständig · keine Lücken", tone: "ochre", glow: "oklch(0.78 0.16 85 / 0.18)" },
          ].map((k, i) => (
            <Card key={i} padded={false} className="p-5 relative overflow-hidden">
              <div className="absolute inset-0 opacity-60 pointer-events-none" style={{ background: `radial-gradient(circle at 0% 0%, ${k.glow}, transparent 60%)` }} />
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `var(--${k.tone === "forest" ? "forest" : k.tone === "rust" ? "rust" : k.tone === "plum" ? "plum" : "ochre"})`, boxShadow: `0 0 20px ${k.glow}` }} />
              <div className="caps text-[10.5px] relative" style={{ color: "var(--ink-3)" }}>{k.k}</div>
              <div className="font-display text-[40px] leading-none mt-2 relative">{k.v}</div>
              <div className="text-[12px] mt-2 relative" style={{ color: "var(--ink-3)" }}>{k.sub}</div>
              {k.spark && (
                <svg className="spark absolute right-4 bottom-4" width="120" height="40" viewBox="0 0 100 40">
                  <polyline fill="none" stroke="var(--rust)" strokeWidth="1.5" points={points} style={{ filter: "drop-shadow(0 0 6px var(--rust))" }} />
                </svg>
              )}
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: to-do + queue */}
          <div className="col-span-8 space-y-6">
            {/* To-do */}
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 py-4 rule-b">
                <div>
                  <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Heute zu erledigen</div>
                  <div className="font-display text-[22px] mt-1">Drei Dinge warten auf dich</div>
                </div>
                <Button kind="ghost" size="sm">Alle anzeigen</Button>
              </div>
              <div>
                {[
                  { tag: "News", label: "Kreisligaderby: später Siegtreffer", meta: "Entwurf seit 2 Std. · M. Keller", action: "Prüfen & veröffentlichen", tone: "rust" },
                  { tag: "Sponsor", label: "Vertrag Reifen Stiegler läuft 30.04. aus", meta: "Verlängerung oder Archivieren", action: "Öffnen", tone: "ochre" },
                  { tag: "Vorstand", label: "Portrait für Thomas Brandt fehlt", meta: "Platzhalter wird angezeigt", action: "Hochladen", tone: "plum" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 row-hover" style={{ borderTop: i ? "1px solid var(--rule)" : "none" }}>
                    <Pill tone={t.tone}>{t.tag}</Pill>
                    <div className="flex-1">
                      <div className="text-[14px] font-medium">{t.label}</div>
                      <div className="text-[12px] mt-0.5" style={{ color: "var(--ink-3)" }}>{t.meta}</div>
                    </div>
                    <button className="text-[12.5px] flex items-center gap-1.5" style={{ color: "var(--forest)" }}>
                      {t.action}
                      <Icons.Arrow size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent meldungen */}
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 py-4 rule-b">
                <div className="font-display text-[20px]">Zuletzt geändert</div>
                <div className="flex gap-1">
                  {["Alle", "Entwurf", "Geplant", "Veröffentlicht"].map((f, i) => (
                    <button key={f} className="text-[11.5px] px-2.5 h-7 rounded-full" style={i === 0 ? { background: "var(--forest)", color: "#fff", boxShadow: "0 0 16px var(--glow)" } : { color: "var(--ink-3)" }}>{f}</button>
                  ))}
                </div>
              </div>
              {NEWS_DATA.slice(0, 5).map((n, i) => (
                <div key={n.id} className="flex items-center gap-4 px-5 py-3.5 row-hover" style={{ borderTop: i ? "1px solid var(--rule)" : "none" }}>
                  <div className="w-14 text-right">
                    <div className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>{n.publishAt || "—"}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-medium leading-snug">{n.title}</div>
                    <div className="text-[11.5px] mt-0.5 flex items-center gap-2" style={{ color: "var(--ink-3)" }}>
                      <span>{n.tag}</span>
                      <span>·</span>
                      <span>{n.author}</span>
                      {n.views > 0 && <><span>·</span><span>{n.views} Aufrufe</span></>}
                    </div>
                  </div>
                  <Pill tone={n.status === "published" ? "forest" : n.status === "scheduled" ? "ochre" : n.status === "draft" ? "mute" : "neutral"}>
                    {({ published: "Veröffentlicht", scheduled: "Geplant", draft: "Entwurf", withdrawn: "Zurückgezogen" })[n.status]}
                  </Pill>
                </div>
              ))}
            </Card>
          </div>

          {/* Right: activity + upcoming */}
          <div className="col-span-4 space-y-6">
            <Card padded={false}>
              <div className="px-5 py-4 rule-b">
                <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Nächste Termine</div>
              </div>
              <div className="px-5 py-4 space-y-4">
                {[
                  { d: "25", m: "APR", title: "Jahreshauptversammlung", time: "Freitag · 19:30 · Sportheim", tone: "rust" },
                  { d: "03", m: "MAI", title: "Heimspiel 1. Mannschaft", time: "Samstag · 15:00 · gegen FC Waldau", tone: "forest" },
                  { d: "27", m: "JUN", title: "Sommerfest (Entwurf)", time: "Freitag – Sonntag · Festplatz", tone: "mute" },
                ].map((e, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-12 text-center rounded-md py-1.5" style={{ background: e.tone === "rust" ? "var(--rust)" : e.tone === "forest" ? "var(--forest)" : "var(--paper-3)", color: e.tone === "mute" ? "var(--ink-2)" : "#fff", boxShadow: e.tone !== "mute" ? `0 0 20px color-mix(in oklab, ${e.tone === "rust" ? "var(--rust)" : "var(--forest)"} 40%, transparent)` : "none" }}>
                      <div className="font-display text-[18px] leading-none">{e.d}</div>
                      <div className="caps text-[9.5px] mt-0.5" style={{ opacity: .85 }}>{e.m}</div>
                    </div>
                    <div className="flex-1 leading-snug">
                      <div className="text-[13.5px] font-medium">{e.title}</div>
                      <div className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-3)" }}>{e.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card padded={false}>
              <div className="px-5 py-4 rule-b flex items-center justify-between">
                <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Aktivität</div>
                <span className="font-mono text-[10.5px]" style={{ color: "var(--ink-4)" }}>live</span>
              </div>
              <div className="px-5 py-3">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="flex gap-3 py-2.5" style={{ borderTop: i ? "1px dashed var(--rule)" : "none" }}>
                    <div className="w-1 shrink-0 mt-1.5 h-1 rounded-full" style={{ background: a.kind === "news" ? "var(--rust)" : a.kind === "media" ? "var(--ochre)" : a.kind === "vorstand" ? "var(--plum)" : "var(--ink-4)" }} />
                    <div className="flex-1 text-[12px] leading-snug">
                      <span className="font-medium">{a.who}</span>{" "}
                      <span style={{ color: "var(--ink-2)" }}>{a.what}</span>
                      <div className="mt-0.5 font-mono text-[10.5px]" style={{ color: "var(--ink-4)" }}>{a.t}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
