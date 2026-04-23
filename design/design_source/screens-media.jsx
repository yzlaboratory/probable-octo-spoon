// Media library screen

function MediaScreen({ onToast }) {
  const [view, setView] = React.useState("grid");
  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState("all");
  const [selected, setSelected] = React.useState(null);

  const list = MEDIA_DATA
    .filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()))
    .filter(m => kind === "all" || m.kind === kind);

  const stats = {
    count: MEDIA_DATA.length,
    images: MEDIA_DATA.filter(m => m.kind === "image").length,
    docs: MEDIA_DATA.filter(m => m.kind === "document").length,
    storage: "28,4 MB / 2 GB",
  };

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Inhalte · Mediathek"
        title="Bilder, Logos, Dokumente."
        subtitle="Zentrale Ablage für alle Medien. Einmal hochladen, in News, Spielberichten und Sponsorenseiten wiederverwenden."
        right={<>
          <Button kind="ghost" leading={<Icons.Tag size={13} />}>Schlagworte</Button>
          <Button kind="primary" leading={<Icons.Upload size={13} />} onClick={() => onToast("Upload-Dialog geöffnet.")}>Hochladen</Button>
        </>}
      />

      <div className="px-10">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { k: "Dateien", v: stats.count, s: "in der Mediathek" },
            { k: "Bilder", v: stats.images, s: "JPG, PNG, SVG" },
            { k: "Dokumente", v: stats.docs, s: "PDF" },
            { k: "Speicher", v: stats.storage, s: "1,4 % belegt" },
          ].map((s, i) => (
            <Card key={i} padded={false} className="p-4">
              <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>{s.k}</div>
              <div className="font-display text-[28px] leading-none mt-1.5">{s.v}</div>
              <div className="text-[11px] mt-1.5" style={{ color: "var(--ink-3)" }}>{s.s}</div>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5 rule-b pb-4">
          <div className="flex items-center rounded-md p-0.5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            {[["grid","Raster"],["list","Liste"]].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} className="px-3 h-8 text-[12.5px] rounded-md transition" style={{ background: view === k ? "var(--forest)" : "transparent", color: view === k ? "#fff" : "var(--ink-2)", boxShadow: view === k ? "0 0 12px var(--glow)" : "none" }}>{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[12px]">
            {[["all","Alle"],["image","Bilder"],["document","Dokumente"],["vector","Vektor"]].map(([k,l]) => (
              <button key={k} onClick={() => setKind(k)} className="px-2.5 h-8 rounded-full" style={{ background: kind === k ? "var(--paper-3)" : "transparent", border: `1px solid ${kind === k ? "var(--rule-2)" : "transparent"}`, color: "var(--ink-2)" }}>{l}</button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 w-[280px] h-9 px-3 rounded-md" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <Icons.Search size={14} stroke="var(--ink-3)" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Dateiname…" className="flex-1 bg-transparent outline-none text-[12.5px]" />
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-[1fr_340px] gap-6 pb-10">
            <div className="grid grid-cols-4 gap-3">
              <button onClick={() => onToast("Upload-Dialog geöffnet.")} className="aspect-square rounded-lg flex flex-col items-center justify-center gap-2" style={{ border: "1.5px dashed var(--rule-2)", background: "var(--paper-2)", color: "var(--ink-3)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--paper-3)" }}>
                  <Icons.Upload size={16} stroke="var(--ink-2)" />
                </div>
                <span className="text-[11.5px]">Dateien ablegen</span>
              </button>
              {list.map(m => (
                <button key={m.id} onClick={() => setSelected(m)} className="group aspect-square rounded-lg overflow-hidden relative text-left transition hover:scale-[1.015]" style={{ background: "var(--paper-2)", border: `1px solid ${selected?.id === m.id ? "var(--forest)" : "var(--rule)"}`, boxShadow: selected?.id === m.id ? "0 0 0 2px var(--glow)" : "none" }}>
                  <MediaPreview m={m} />
                  <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: "linear-gradient(180deg, transparent, rgba(14,14,18,.9))" }}>
                    <div className="text-[11px] font-mono truncate" style={{ color: "var(--ink)" }}>{m.name}</div>
                    <div className="text-[10px] flex items-center gap-2" style={{ color: "var(--ink-3)" }}>
                      <span>{m.size}</span>
                      <span>·</span>
                      <span>{m.at}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div>
              {selected ? (
                <Card>
                  <div className="aspect-[4/3] rounded-md overflow-hidden mb-3">
                    <MediaPreview m={selected} big />
                  </div>
                  <div className="font-mono text-[12px] break-all">{selected.name}</div>
                  <div className="mt-3 space-y-2 text-[12.5px]">
                    <Row l="Typ" v={selected.kind} />
                    <Row l="Größe" v={selected.size} mono />
                    <Row l="Maße" v={selected.dims} mono />
                    <Row l="Hochgeladen" v={`${selected.uploader} · ${selected.at}`} />
                  </div>
                  <div className="mt-3">
                    <div className="caps text-[10px] mb-1.5" style={{ color: "var(--ink-3)" }}>Schlagworte</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-[11px]" style={{ background: "var(--paper-3)", color: "var(--ink-2)" }}>{t}</span>)}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 rule-t flex gap-2">
                    <Button kind="primary" size="sm" className="flex-1" onClick={() => onToast("Einfügen in Meldung.")}>In Meldung einfügen</Button>
                    <Button kind="ghost" size="sm" onClick={() => onToast("Kopie verlinkt.")}><Icons.Link size={12} /></Button>
                    <Button kind="ghost" size="sm" onClick={() => onToast("Gelöscht.")}><Icons.Trash size={12} /></Button>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>Keine Auswahl</div>
                  <p className="text-[13px] mt-2" style={{ color: "var(--ink-2)" }}>Datei anklicken — Vorschau & Details erscheinen hier.</p>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card padded={false} className="mb-10">
            <div className="grid grid-cols-[60px_1fr_120px_140px_140px_40px] gap-3 px-4 py-2.5 caps text-[10px]" style={{ color: "var(--ink-3)", borderBottom: "1px solid var(--rule)", background: "var(--paper-3)" }}>
              <div />
              <div>Name</div>
              <div>Typ / Maße</div>
              <div>Größe</div>
              <div>Upload</div>
              <div />
            </div>
            {list.map(m => (
              <div key={m.id} onClick={() => setSelected(m)} className="row-hover grid grid-cols-[60px_1fr_120px_140px_140px_40px] gap-3 px-4 py-2.5 items-center cursor-pointer" style={{ borderBottom: "1px solid var(--rule)" }}>
                <div className="w-12 h-10 rounded-md overflow-hidden"><MediaPreview m={m} small /></div>
                <div className="font-mono text-[12.5px] truncate">{m.name}</div>
                <div className="text-[12px]" style={{ color: "var(--ink-2)" }}>{m.kind} · {m.dims}</div>
                <div className="font-mono text-[12px]" style={{ color: "var(--ink-3)" }}>{m.size}</div>
                <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>{m.uploader} · {m.at}</div>
                <Icons.Chevron size={12} stroke="var(--ink-3)" />
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function MediaPreview({ m, big, small }) {
  // Abstract generated preview per file — no real images
  const hue = (m.name.charCodeAt(0) * 7) % 360;
  if (m.kind === "document") {
    return (
      <div className="w-full h-full stripes flex flex-col items-center justify-center p-2" style={{ background: "var(--paper-3)" }}>
        <div className={`rounded-sm flex items-center justify-center`} style={{ width: small ? 18 : big ? 48 : 36, height: small ? 24 : big ? 64 : 48, background: "var(--paper-2)", border: "1px solid var(--rule-2)", color: "var(--rust)", fontFamily: "Geist Mono", fontSize: small ? 7 : big ? 14 : 10 }}>PDF</div>
        {!small && <div className="caps text-[9px] mt-2" style={{ color: "var(--ink-4)" }}>Dokument</div>}
      </div>
    );
  }
  if (m.kind === "vector") {
    return (
      <div className="w-full h-full flex items-center justify-center stripes-forest">
        <svg width={small ? 20 : big ? 80 : 60} height={small ? 20 : big ? 80 : 60} viewBox="0 0 60 60">
          <path d="M30 8 L52 24 L46 50 L14 50 L8 24 Z" fill="none" stroke="var(--forest-2)" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="6" fill="var(--forest-2)" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: `linear-gradient(135deg, oklch(0.35 0.15 ${hue}), oklch(0.25 0.1 ${(hue+60)%360}))` }}>
      <div className="absolute inset-0 stripes opacity-40" />
      {!small && (
        <div className="absolute top-2 left-2 font-mono text-[9px] px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(0,0,0,.5)", color: "var(--ink)", backdropFilter: "blur(4px)" }}>JPG</div>
      )}
    </div>
  );
}

window.MediaScreen = MediaScreen;
