// Public-facing website preview — reflects theme/tweaks live, renders inside a simulated browser chrome

function PublicWebsiteScreen({ onToast, themeKey, density }) {
  const [page, setPage] = React.useState("home");
  const [device, setDevice] = React.useState("desktop"); // desktop, tablet, mobile

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Vorschau · Öffentliche Website"
        title="Was Besucher sehen."
        subtitle="Diese Vorschau spiegelt alle Änderungen aus Meldungen, Sponsoren, Vorstand und Erscheinungsbild wider. Publish & preview — in einem."
        right={<>
          <Button kind="ghost" leading={<Icons.External size={13} />} onClick={() => onToast("Öffentliche URL kopiert.")}>URL teilen</Button>
          <Button kind="primary" leading={<Icons.Globe size={13} />} onClick={() => onToast("Deploy angestoßen.")}>Veröffentlichen</Button>
        </>}
      />

      <div className="px-10 pb-14">
        {/* Controls row */}
        <div className="flex items-center gap-3 mb-5 rule-b pb-4">
          <div className="flex items-center gap-1 text-[12px]">
            {[["home","Startseite"],["news","Meldung"],["sponsors","Sponsoren"],["team","Mannschaft"],["contact","Kontakt"]].map(([k,l]) => (
              <button key={k} onClick={() => setPage(k)} className="px-3 h-8 rounded-md text-[12.5px]" style={{ background: page === k ? "var(--forest)" : "transparent", color: page === k ? "#fff" : "var(--ink-2)", boxShadow: page === k ? "0 0 12px var(--glow)" : "none" }}>{l}</button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center rounded-md p-0.5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            {[["desktop","⎚"],["tablet","▭"],["mobile","▯"]].map(([k, g]) => (
              <button key={k} onClick={() => setDevice(k)} className="w-9 h-7 text-[13px]" style={{ background: device === k ? "var(--paper-3)" : "transparent", color: device === k ? "var(--ink)" : "var(--ink-3)", borderRadius: 6 }}>{g}</button>
            ))}
          </div>
        </div>

        {/* Browser frame */}
        <div className="mx-auto" style={{ width: device === "mobile" ? 390 : device === "tablet" ? 820 : "100%" }}>
          <div className="rounded-t-lg flex items-center gap-2 px-3 py-2.5" style={{ background: "var(--paper-3)", border: "1px solid var(--rule-2)", borderBottom: "none" }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f56" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#ffbd2e" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#27c93f" }} />
            </div>
            <div className="flex-1 h-6 rounded-md flex items-center px-3 text-[11px] font-mono" style={{ background: "var(--paper-2)", color: "var(--ink-3)" }}>
              <span style={{ color: "var(--forest-2)" }}>https://</span>{CLUB.domain}{page !== "home" ? `/${page}` : ""}
            </div>
            <Icons.External size={12} stroke="var(--ink-3)" />
          </div>
          <div className="rounded-b-lg overflow-hidden" style={{ border: "1px solid var(--rule-2)", borderTop: "none" }}>
            <PublicSite page={page} device={device} />
          </div>
        </div>

        <div className="text-center text-[11.5px] mt-3" style={{ color: "var(--ink-4)" }}>
          Änderungen aus der Redaktion erscheinen hier innerhalb weniger Sekunden. Cache: CDN.
        </div>
      </div>
    </div>
  );
}

/* ---------------- Public site renderer (inline with its own scoped styles) ---------------- */

function PublicSite({ page, device }) {
  // Fixed, club-flavored palette for the public site (editorial warm tones — different DNA from the admin)
  const siteStyles = {
    "--p-paper": "#f4eee2",
    "--p-paper-2": "#ece5d4",
    "--p-ink": "#14140f",
    "--p-ink-2": "#3a3a32",
    "--p-ink-3": "#7a7868",
    "--p-rule": "#d2c9b3",
    "--p-primary": "#1f3a2e",
    "--p-accent": "#b5401b",
  };

  return (
    <div style={{ ...siteStyles, background: "var(--p-paper)", color: "var(--p-ink)", fontFamily: "Geist, sans-serif", minHeight: 560 }}>
      <PublicNav device={device} active={page} />
      {page === "home" && <HomePage device={device} />}
      {page === "news" && <ArticlePage device={device} />}
      {page === "sponsors" && <SponsorsPage device={device} />}
      {page === "team" && <TeamPage device={device} />}
      {page === "contact" && <ContactPage device={device} />}
      <PublicFooter />
    </div>
  );
}

function PublicNav({ device, active }) {
  const mobile = device === "mobile";
  return (
    <div className="flex items-center px-6 py-4 gap-6" style={{ borderBottom: "1px solid var(--p-rule)" }}>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-display text-[13px]" style={{ background: "var(--p-primary)", color: "var(--p-paper)", letterSpacing: "-0.02em" }}>GW</div>
        <div className="leading-tight">
          <div className="font-display text-[18px]" style={{ letterSpacing: "-0.02em" }}>SV Grün-Weiß</div>
          <div className="text-[10.5px] caps" style={{ color: "var(--p-ink-3)", letterSpacing: "0.16em" }}>Birkenstett · 1912</div>
        </div>
      </div>
      {!mobile && (
        <div className="flex items-center gap-5 text-[13px] ml-6" style={{ color: "var(--p-ink-2)" }}>
          {[["home","Start"],["news","Meldungen"],["team","Mannschaften"],["sponsors","Sponsoren"],["contact","Kontakt"]].map(([k,l]) => (
            <span key={k} style={{ color: active === k ? "var(--p-ink)" : "var(--p-ink-2)", fontWeight: active === k ? 600 : 400, borderBottom: active === k ? "2px solid var(--p-accent)" : "2px solid transparent", paddingBottom: 4 }}>{l}</span>
          ))}
        </div>
      )}
      <div className="flex-1" />
      {mobile ? (
        <div style={{ color: "var(--p-ink)" }}>☰</div>
      ) : (
        <button className="px-3 h-8 rounded-full text-[12px] font-medium" style={{ background: "var(--p-primary)", color: "var(--p-paper)" }}>Mitglied werden</button>
      )}
    </div>
  );
}

function HomePage({ device }) {
  const cols = device === "mobile" ? 1 : device === "tablet" ? 2 : 3;
  return (
    <div>
      {/* Hero */}
      <div className="px-6 py-10 grid gap-8" style={{ gridTemplateColumns: device === "mobile" ? "1fr" : "1.4fr 1fr" }}>
        <div>
          <div className="caps text-[10.5px] mb-3" style={{ color: "var(--p-accent)", letterSpacing: "0.2em" }}>Kreisliga A · 18. April</div>
          <h1 className="font-display leading-[1.02]" style={{ fontSize: device === "mobile" ? 40 : 62, letterSpacing: "-0.02em", color: "var(--p-ink)" }}>
            Später<br />Siegtreffer<br />
            <span style={{ color: "var(--p-accent)", fontStyle: "italic" }}>im Derby.</span>
          </h1>
          <p className="mt-5 text-[15px] max-w-[520px]" style={{ color: "var(--p-ink-2)", textWrap: "pretty" }}>
            Nach 0:1 in der 74. Minute dreht die Erste die Partie gegen den FC Waldau mit einem Doppelschlag in den Schlussminuten. 412 Zuschauer erleben die Wende.
          </p>
          <div className="mt-6 flex items-center gap-3 text-[12.5px]" style={{ color: "var(--p-ink-3)" }}>
            <span>Von M. Keller</span>
            <span>·</span>
            <span>4 Min. Lesezeit</span>
          </div>
        </div>
        <div className="aspect-[4/5] rounded-md overflow-hidden relative" style={{ background: "linear-gradient(135deg, #2a4a3a, #1f3a2e)" }}>
          <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 8px, transparent 8px 16px)" }} />
          <div className="absolute top-4 left-4 caps text-[9px] px-2 py-0.5 rounded-sm font-mono" style={{ background: "rgba(0,0,0,.5)", color: "#fff" }}>Titelbild</div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="text-[42px] font-display leading-none" style={{ color: "#f4eee2" }}>2 : 1</div>
            <div className="caps text-[10px] mt-2" style={{ color: "rgba(244,238,226,.6)", letterSpacing: "0.2em" }}>SV GW — FC Waldau</div>
          </div>
        </div>
      </div>

      {/* News grid */}
      <div className="px-6 py-10" style={{ borderTop: "1px solid var(--p-rule)" }}>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display" style={{ fontSize: 28, letterSpacing: "-0.015em" }}>Meldungen</h2>
          <a className="text-[13px] underline decoration-dotted" style={{ color: "var(--p-ink-2)" }}>Alle Meldungen →</a>
        </div>
        <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {NEWS_DATA.filter(n => n.status === "published").slice(0, 6).map((n, i) => (
            <article key={n.id} className="group">
              <div className="aspect-[4/3] rounded-md overflow-hidden mb-3 relative" style={{ background: `linear-gradient(135deg, ${["#2a4a3a","#b5401b","#5b7a52","#c89a2a","#6b3a5a","#1f3a2e"][i%6]}, ${["#1f3a2e","#d25a2e","#3a5a30","#e0b848","#8a4e76","#0a1a14"][i%6]})` }}>
                <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 6px, transparent 6px 12px)" }} />
                <div className="absolute top-3 left-3 caps text-[9px] px-2 py-0.5 font-mono" style={{ background: "rgba(20,20,15,.7)", color: "#f4eee2", letterSpacing: "0.15em" }}>{n.tag}</div>
              </div>
              <div className="font-mono text-[10.5px]" style={{ color: "var(--p-ink-3)" }}>{new Date(n.publishAt).toLocaleDateString("de-DE")}</div>
              <h3 className="font-display mt-1 leading-tight" style={{ fontSize: 19, letterSpacing: "-0.01em" }}>{n.title}</h3>
              <p className="text-[13px] mt-1.5" style={{ color: "var(--p-ink-2)" }}>{n.short}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Fixtures strip */}
      <div className="px-6 py-10" style={{ background: "var(--p-paper-2)", borderTop: "1px solid var(--p-rule)" }}>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display" style={{ fontSize: 24 }}>Nächste Spiele</h2>
          <a className="text-[12.5px] underline decoration-dotted" style={{ color: "var(--p-ink-2)" }}>Spielplan →</a>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: device === "mobile" ? "1fr" : "repeat(3, 1fr)" }}>
          {[
            { d: "26.04.", t: "15:00", h: "SV Grün-Weiß", a: "FC Waldau", v: "Heim" },
            { d: "03.05.", t: "15:00", h: "FC Eibenried", a: "SV Grün-Weiß", v: "Auswärts" },
            { d: "10.05.", t: "15:00", h: "SV Grün-Weiß", a: "TSV Forsthofen", v: "Heim" },
          ].map((m, i) => (
            <div key={i} className="p-4 rounded-md" style={{ background: "var(--p-paper)", border: "1px solid var(--p-rule)" }}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[12px] tabular-nums">{m.d} · {m.t}</span>
                <span className="caps text-[9px]" style={{ color: "var(--p-accent)", letterSpacing: "0.2em" }}>{m.v}</span>
              </div>
              <div className="font-display text-[16px] leading-tight">{m.h} <span style={{ color: "var(--p-ink-3)" }}>—</span> {m.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sponsor ribbon */}
      <div className="px-6 py-8" style={{ borderTop: "1px solid var(--p-rule)" }}>
        <div className="caps text-[10px] mb-4 text-center" style={{ color: "var(--p-ink-3)", letterSpacing: "0.2em" }}>Partner & Sponsoren</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${device === "mobile" ? 2 : 5}, 1fr)` }}>
          {SPONSORS_DATA.filter(s => s.status === "active").slice(0, device === "mobile" ? 4 : 5).map((s, i) => (
            <div key={s.id} className="h-16 flex items-center justify-center rounded-sm font-display text-[11.5px] text-center px-3" style={{ background: "var(--p-paper-2)", color: "var(--p-ink-2)", letterSpacing: "-0.01em" }}>{s.name}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArticlePage({ device }) {
  return (
    <article className="px-6 py-10 mx-auto" style={{ maxWidth: 720 }}>
      <div className="caps text-[10.5px] mb-3" style={{ color: "var(--p-accent)", letterSpacing: "0.2em" }}>Fußball · 18. April 2026</div>
      <h1 className="font-display leading-[1.05]" style={{ fontSize: device === "mobile" ? 32 : 46, letterSpacing: "-0.02em" }}>Kreisligaderby: später Siegtreffer gegen FC Waldau</h1>
      <p className="text-[17px] mt-4 leading-[1.5]" style={{ color: "var(--p-ink-2)", fontFamily: "Newsreader, serif" }}>Nach 0:1-Rückstand in der 74. Minute zeigt die Erste Moral — ein Doppelschlag in den Schlussminuten dreht die Partie.</p>
      <div className="mt-5 flex items-center gap-3 text-[12px]" style={{ color: "var(--p-ink-3)" }}>
        <div className="w-7 h-7 rounded-full" style={{ background: "var(--p-primary)" }} />
        <span>Von Michael Keller · 4 Min. Lesezeit</span>
      </div>
      <div className="aspect-[16/9] rounded-md mt-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #2a4a3a, #1f3a2e)" }}>
        <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 8px, transparent 8px 16px)" }} />
      </div>
      <div style={{ fontFamily: "Newsreader, serif", fontSize: 17, lineHeight: 1.7 }}>
        <p className="mt-6">Es war eines jener Spiele, die man in Birkenstett lange nicht vergessen wird. Die Erste geriet früh unter Druck, konnte aber durch eine konzentrierte Defensivarbeit in der ersten Halbzeit ein schnelleres Gegentor verhindern.</p>
        <h2 className="font-display mt-8 mb-2" style={{ fontSize: 26, lineHeight: 1.2 }}>Die Wende in den Schlussminuten</h2>
        <p>Trainer Hahn brachte in der 80. Minute Simon Brandmeier für den angeschlagenen Lukas Maierhofer. Genau dieser Wechsel sollte das Spiel drehen.</p>
        <blockquote className="my-6 pl-5 italic" style={{ borderLeft: "3px solid var(--p-accent)", fontSize: 22, lineHeight: 1.4 }}>
          „Wir haben bis zur letzten Sekunde an uns geglaubt.”
          <div className="text-[12px] mt-2 not-italic font-mono" style={{ color: "var(--p-ink-3)" }}>Rudolf Hahn, Trainer</div>
        </blockquote>
        <p>Zwei Minuten später war es Bernhard Brunner, der nach einem Freistoß aus 23 Metern die Partie endgültig drehte.</p>
      </div>
    </article>
  );
}

function SponsorsPage({ device }) {
  return (
    <div className="px-6 py-10">
      <h1 className="font-display" style={{ fontSize: 42, letterSpacing: "-0.02em" }}>Unsere Partner.</h1>
      <p className="mt-3 text-[15px] max-w-[560px]" style={{ color: "var(--p-ink-2)" }}>Seit Jahrzehnten ermöglichen lokale Unternehmen den Sport in Birkenstett. Danke.</p>
      {[["Hauptsponsor",1],["Premium",2],["Standard",3],["Partner",2]].map(([t, _]) => (
        <div key={t} className="mt-8">
          <div className="caps text-[10px] mb-3" style={{ color: "var(--p-ink-3)", letterSpacing: "0.2em" }}>{t}</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${device === "mobile" ? 2 : 4}, 1fr)` }}>
            {SPONSORS_DATA.filter(s => s.tier === t && s.status === "active").map(s => (
              <div key={s.id} className="rounded-md p-4 flex items-center justify-center" style={{ background: "var(--p-paper-2)", aspectRatio: "2/1" }}>
                <div className="font-display text-center" style={{ fontSize: t === "Hauptsponsor" ? 17 : 14, letterSpacing: "-0.01em", color: "var(--p-ink)" }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamPage({ device }) {
  return (
    <div className="px-6 py-10">
      <h1 className="font-display" style={{ fontSize: 42, letterSpacing: "-0.02em" }}>Mannschaften.</h1>
      <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: device === "mobile" ? "1fr" : "repeat(3, 1fr)" }}>
        {["Herren I · Kreisliga A","Herren II · A-Klasse","Damen","A-Jugend","F-Jugend","Leichtathletik LG"].map((n,i) => (
          <div key={n} className="rounded-md overflow-hidden" style={{ background: "var(--p-paper-2)", border: "1px solid var(--p-rule)" }}>
            <div className="aspect-[3/2] relative" style={{ background: "linear-gradient(135deg, #2a4a3a, #1f3a2e)" }}>
              <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 6px, transparent 6px 12px)" }} />
            </div>
            <div className="p-4">
              <div className="font-display text-[18px] leading-tight">{n}</div>
              <div className="text-[12px] mt-1" style={{ color: "var(--p-ink-3)" }}>{["22 Spieler","18 Spieler","16 Spielerinnen","14 Jugendliche","24 Kinder","12 Athleten"][i]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactPage({ device }) {
  return (
    <div className="px-6 py-10 grid gap-10" style={{ gridTemplateColumns: device === "mobile" ? "1fr" : "1fr 1fr" }}>
      <div>
        <h1 className="font-display" style={{ fontSize: 42, letterSpacing: "-0.02em" }}>Kontakt.</h1>
        <p className="mt-3 text-[15px] max-w-[480px]" style={{ color: "var(--p-ink-2)" }}>SV Grün-Weiß Birkenstett e.V.<br />Am Sportplatz 3, 94078 Birkenstett</p>
        <div className="mt-6 space-y-3 text-[13.5px]">
          <div><span className="caps text-[10px]" style={{ color: "var(--p-ink-3)", letterSpacing: "0.2em" }}>Geschäftsstelle</span><div>0851 / 123 456</div></div>
          <div><span className="caps text-[10px]" style={{ color: "var(--p-ink-3)", letterSpacing: "0.2em" }}>E-Mail</span><div>info@sv-gw-birkenstett.de</div></div>
          <div><span className="caps text-[10px]" style={{ color: "var(--p-ink-3)", letterSpacing: "0.2em" }}>Öffnungszeiten</span><div>Di · Do 18–20 Uhr · Vereinsheim</div></div>
        </div>
      </div>
      <div className="rounded-md p-5" style={{ background: "var(--p-paper-2)", border: "1px solid var(--p-rule)" }}>
        <div className="caps text-[10px] mb-3" style={{ color: "var(--p-ink-3)", letterSpacing: "0.2em" }}>Schreib uns</div>
        <input placeholder="Name" className="w-full h-10 px-3 rounded-sm text-[13px] bg-transparent mb-2" style={{ border: "1px solid var(--p-rule)" }} />
        <input placeholder="E-Mail" className="w-full h-10 px-3 rounded-sm text-[13px] bg-transparent mb-2" style={{ border: "1px solid var(--p-rule)" }} />
        <textarea placeholder="Nachricht…" rows={5} className="w-full p-3 rounded-sm text-[13px] bg-transparent mb-3 resize-none" style={{ border: "1px solid var(--p-rule)" }} />
        <button className="w-full h-10 rounded-sm text-[13px] font-medium" style={{ background: "var(--p-primary)", color: "var(--p-paper)" }}>Absenden</button>
      </div>
    </div>
  );
}

function PublicFooter() {
  return (
    <div className="px-6 py-8 text-[11.5px]" style={{ background: "var(--p-primary)", color: "#e8e4d6" }}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-display text-[14px]" style={{ color: "#fff" }}>SV Grün-Weiß Birkenstett e.V.</span>
        <span style={{ opacity: .7 }}>gegründet 1912 · Mitglied im BLSV</span>
        <div className="flex-1" />
        <span style={{ opacity: .7 }}>Impressum</span>
        <span style={{ opacity: .7 }}>Datenschutz</span>
        <span style={{ opacity: .7 }}>Satzung</span>
      </div>
    </div>
  );
}

window.PublicWebsiteScreen = PublicWebsiteScreen;
