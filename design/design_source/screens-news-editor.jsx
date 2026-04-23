// Block-based news editor

function NewsEditor({ item, onBack, onToast }) {
  const [title, setTitle] = React.useState(item?.title || "Kreisligaderby: später Siegtreffer gegen FC Waldau");
  const [short, setShort] = React.useState(item?.short || "Nach 0:1 dreht die Erste die Partie in den Schlussminuten.");
  const [tag, setTag] = React.useState(item?.tag || "Fußball");
  const [publishMode, setPublishMode] = React.useState(item?.status === "scheduled" ? "scheduled" : item?.status === "published" ? "now" : "draft");
  const [blocks, setBlocks] = React.useState(ARTICLE_BLOCKS);
  const [active, setActive] = React.useState("b4");
  const [showInsert, setShowInsert] = React.useState(null);

  function update(id, patch) { setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b)); }
  function remove(id) { setBlocks(bs => bs.filter(b => b.id !== id)); onToast("Block entfernt."); }
  function move(id, dir) {
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id);
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function insertAfter(id, kind) {
    const nid = "n" + Math.random().toString(36).slice(2, 7);
    const tpl = {
      paragraph: { id: nid, kind: "paragraph", text: "Neuer Absatz…" },
      heading:   { id: nid, kind: "heading", level: 2, text: "Zwischenüberschrift" },
      image:     { id: nid, kind: "image", caption: "Bildunterschrift", credit: "Foto: …" },
      quote:     { id: nid, kind: "quote", text: "Zitat.", attr: "Name" },
      stats:     { id: nid, kind: "stats", rows: [{ l: "Kennzahl", a: 50, b: 50 }] },
      callout:   { id: nid, kind: "callout", tone: "forest", text: "Hinweis." },
    }[kind];
    setBlocks(bs => {
      const i = bs.findIndex(b => b.id === id);
      const next = [...bs];
      next.splice(i + 1, 0, tpl);
      return next;
    });
    setActive(nid);
    setShowInsert(null);
  }

  const blockCount = blocks.length;
  const words = blocks.reduce((n,b) => n + (b.text || "").split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="page-enter">
      <div className="px-10 pt-7 flex items-center gap-3 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
        <button onClick={onBack} className="flex items-center gap-1.5 hover:text-[color:var(--ink)]">
          <Icons.Chevron size={12} stroke="currentColor" className="rotate-180" /> Meldungen
        </button>
        <span>/</span>
        <span style={{ color: "var(--ink)" }}>Block-Editor</span>
      </div>

      <div className="px-10 pt-4 pb-14">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Pill tone={publishMode === "now" ? "forest" : publishMode === "scheduled" ? "ochre" : "mute"}>
              {publishMode === "now" ? "Veröffentlicht" : publishMode === "scheduled" ? "Geplant" : "Entwurf"}
            </Pill>
            <span className="text-[11.5px] font-mono" style={{ color: "var(--ink-4)" }}>
              {blockCount} Blöcke · {words} Wörter · gespeichert vor 12 Sek.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button kind="ghost" leading={<Icons.Eye size={13} />} size="sm" onClick={() => onToast("Vorschau geöffnet.")}>Vorschau</Button>
            <Button kind="ghost" size="sm" onClick={() => onToast("Entwurf gespeichert.")}>Entwurf speichern</Button>
            <Button kind="primary" size="sm" onClick={() => onToast("Meldung veröffentlicht.")}>Veröffentlichen</Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <Card padded={false}>
              {/* Title + teaser */}
              <div className="p-8 pb-6">
                <input value={title} onChange={e => setTitle(e.target.value)} className="font-display text-[38px] w-full bg-transparent outline-none leading-[1.08]" style={{ letterSpacing: "-0.02em" }} />
                <input value={short} onChange={e => setShort(e.target.value)} placeholder="Teaser…" className="mt-3 w-full bg-transparent outline-none text-[15px]" style={{ color: "var(--ink-2)" }} />
              </div>

              <div className="px-8 pb-8">
                {blocks.map((b, i) => (
                  <React.Fragment key={b.id}>
                    <BlockRow b={b} active={active === b.id} onActivate={() => setActive(b.id)} onUpdate={(patch) => update(b.id, patch)} onRemove={() => remove(b.id)} onMove={(d) => move(b.id, d)} />
                    <BlockInsert visible={showInsert === b.id} onToggle={() => setShowInsert(s => s === b.id ? null : b.id)} onInsert={(kind) => insertAfter(b.id, kind)} />
                  </React.Fragment>
                ))}
              </div>
            </Card>
          </div>

          {/* Right panel */}
          <div className="col-span-4 space-y-5">
            <Card padded={false}>
              <div className="px-5 py-3 rule-b caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Block-Inspektor</div>
              <div className="p-5">
                {(() => {
                  const b = blocks.find(x => x.id === active);
                  if (!b) return <div className="text-[12.5px]" style={{ color: "var(--ink-3)" }}>Block anklicken…</div>;
                  return <BlockInspector b={b} onUpdate={(p) => update(b.id, p)} />;
                })()}
              </div>
            </Card>

            <Card padded={false}>
              <div className="px-5 py-3 rule-b caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Veröffentlichung</div>
              <div className="p-5 space-y-3">
                {[
                  { k: "draft", l: "Entwurf", h: "Intern sichtbar." },
                  { k: "scheduled", l: "Geplant", h: "25. April 2026, 18:00" },
                  { k: "now", l: "Jetzt live", h: "Startseite." },
                ].map(o => (
                  <label key={o.k} className="flex items-start gap-3 cursor-pointer">
                    <div className="w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center" style={{ border: `1.5px solid ${publishMode === o.k ? "var(--forest)" : "var(--rule-2)"}` }}>
                      {publishMode === o.k && <div className="w-2 h-2 rounded-full" style={{ background: "var(--forest)" }} />}
                    </div>
                    <input type="radio" checked={publishMode === o.k} onChange={() => setPublishMode(o.k)} className="hidden" />
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">{o.l}</div>
                      <div className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-3)" }}>{o.h}</div>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            <Card padded={false}>
              <div className="px-5 py-3 rule-b caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Metadaten</div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] caps block mb-1.5" style={{ color: "var(--ink-3)" }}>Tag</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Fußball", "Jugend", "Leichtathletik", "Verein", "Sponsoring"].map(t => (
                      <button key={t} onClick={() => setTag(t)} className="text-[11.5px] px-2.5 h-7 rounded-full" style={{ background: tag === t ? "var(--forest)" : "var(--paper-3)", color: tag === t ? "#fff" : "var(--ink-2)" }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] caps block mb-1.5" style={{ color: "var(--ink-3)" }}>Slug</label>
                  <div className="flex items-center gap-1 cs-input font-mono text-[12px]" style={{ padding: "7px 10px" }}>
                    <span style={{ color: "var(--ink-4)" }}>/news/</span>
                    <input defaultValue={item?.slug || "kreisligaderby-2-1"} className="flex-1 bg-transparent outline-none" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockRow({ b, active, onActivate, onUpdate, onRemove, onMove }) {
  return (
    <div onClick={onActivate} className="group relative py-2 -mx-3 px-3 rounded-md cursor-text" style={{ background: active ? "oklch(0.62 0.22 290 / 0.05)" : "transparent" }}>
      {/* Block chrome */}
      <div className="absolute left-[-42px] top-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
        <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--paper-3)", border: "1px solid var(--rule-2)" }}><span style={{ fontSize: 10, color: "var(--ink-2)" }}>▲</span></button>
        <button onClick={(e) => { e.stopPropagation(); onMove(1); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--paper-3)", border: "1px solid var(--rule-2)" }}><span style={{ fontSize: 10, color: "var(--ink-2)" }}>▼</span></button>
      </div>
      <div className="absolute right-[-36px] top-2 opacity-0 group-hover:opacity-100 transition">
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--paper-3)", border: "1px solid var(--rule-2)" }}>
          <Icons.Trash size={11} stroke="var(--rust)" />
        </button>
      </div>
      {active && <div className="absolute left-[-8px] top-2 bottom-2 w-0.5 rounded-full" style={{ background: "var(--forest)", boxShadow: "0 0 8px var(--glow)" }} />}
      <BlockBody b={b} onUpdate={onUpdate} />
      <div className="absolute -left-8 top-3 caps text-[9px] font-mono opacity-0 group-hover:opacity-100 transition" style={{ color: "var(--ink-4)" }}>{b.kind.slice(0,3)}</div>
    </div>
  );
}

function BlockBody({ b, onUpdate }) {
  if (b.kind === "heading") {
    const size = b.level === 1 ? "text-[34px]" : "text-[24px]";
    return <input value={b.text} onChange={e => onUpdate({ text: e.target.value })} className={`font-display ${size} w-full bg-transparent outline-none leading-tight`} style={{ letterSpacing: "-0.015em" }} />;
  }
  if (b.kind === "lead") {
    return <textarea value={b.text} onChange={e => onUpdate({ text: e.target.value })} rows={2} className="w-full bg-transparent outline-none resize-none text-[17px] leading-[1.5]" style={{ color: "var(--ink-2)", fontFamily: "Newsreader, serif" }} />;
  }
  if (b.kind === "paragraph") {
    return <textarea value={b.text} onChange={e => onUpdate({ text: e.target.value })} rows={Math.max(3, Math.ceil(b.text.length / 70))} className="w-full bg-transparent outline-none resize-none text-[15px] leading-[1.65]" style={{ fontFamily: "Newsreader, serif" }} />;
  }
  if (b.kind === "image") {
    return (
      <div>
        <div className="aspect-[16/9] rounded-md stripes-forest flex items-center justify-center" style={{ border: "1px dashed var(--rule-2)" }}>
          <div className="text-center">
            <Icons.Image size={22} stroke="var(--forest-2)" />
            <div className="mt-2 text-[12px] font-medium" style={{ color: "var(--forest-2)" }}>Bild aus Mediathek wählen</div>
          </div>
        </div>
        <input value={b.caption} onChange={e => onUpdate({ caption: e.target.value })} placeholder="Bildunterschrift…" className="mt-2 w-full bg-transparent outline-none text-[12.5px] italic" style={{ color: "var(--ink-2)" }} />
        <input value={b.credit} onChange={e => onUpdate({ credit: e.target.value })} placeholder="Bildnachweis…" className="mt-1 w-full bg-transparent outline-none text-[11px] font-mono" style={{ color: "var(--ink-3)" }} />
      </div>
    );
  }
  if (b.kind === "quote") {
    return (
      <div className="pl-5 py-1" style={{ borderLeft: "3px solid var(--rust)" }}>
        <textarea value={b.text} onChange={e => onUpdate({ text: e.target.value })} rows={2} className="w-full bg-transparent outline-none resize-none font-display text-[22px] leading-[1.35] italic" />
        <input value={b.attr} onChange={e => onUpdate({ attr: e.target.value })} className="mt-2 w-full bg-transparent outline-none text-[12px] font-mono" style={{ color: "var(--ink-3)" }} />
      </div>
    );
  }
  if (b.kind === "callout") {
    return (
      <div className="rounded-md p-4 flex gap-3 items-start" style={{ background: "oklch(0.62 0.22 290 / 0.1)", border: "1px solid oklch(0.62 0.22 290 / 0.3)" }}>
        <div className="w-1 rounded-full self-stretch" style={{ background: "var(--forest-2)", boxShadow: "0 0 8px var(--glow)" }} />
        <textarea value={b.text} onChange={e => onUpdate({ text: e.target.value })} rows={1} className="flex-1 bg-transparent outline-none resize-none text-[13.5px] font-medium" />
      </div>
    );
  }
  if (b.kind === "stats") {
    return (
      <div className="rounded-md p-4" style={{ background: "var(--paper-3)", border: "1px solid var(--rule)" }}>
        <div className="flex items-center justify-between mb-3 text-[11px] caps" style={{ color: "var(--ink-3)" }}>
          <span>Heim</span><span>Statistik</span><span>Gast</span>
        </div>
        {b.rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr_40px] gap-2 items-center py-1.5" style={{ borderTop: i > 0 ? "1px dashed var(--rule)" : "none" }}>
            <div className="font-mono text-[13px] text-right tabular-nums">{r.a}</div>
            <div>
              <div className="text-[11px] text-center mb-1" style={{ color: "var(--ink-2)" }}>{r.l}</div>
              <div className="flex gap-1 h-1.5">
                <div className="flex-1 rounded-full overflow-hidden flex justify-end" style={{ background: "var(--paper-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(r.a / (r.a + r.b)) * 100}%`, background: "var(--forest-2)" }} />
                </div>
                <div className="flex-1 rounded-full overflow-hidden" style={{ background: "var(--paper-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(r.b / (r.a + r.b)) * 100}%`, background: "var(--rust)" }} />
                </div>
              </div>
            </div>
            <div className="font-mono text-[13px] tabular-nums">{r.b}</div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function BlockInsert({ visible, onToggle, onInsert }) {
  const options = [
    { k: "paragraph", l: "Absatz", i: "List" },
    { k: "heading", l: "Überschrift", i: "Heading" },
    { k: "image", l: "Bild", i: "Image" },
    { k: "quote", l: "Zitat", i: "Italic" },
    { k: "stats", l: "Statistik", i: "Sliders" },
    { k: "callout", l: "Hinweiskasten", i: "Tag" },
  ];
  return (
    <div className="relative group h-3 flex items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: "transparent" }} />
      <button onClick={onToggle} className="absolute -left-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center transition" style={{ background: visible ? "var(--forest)" : "var(--paper-3)", border: "1px solid var(--rule-2)" }}>
        <Icons.Plus size={11} stroke={visible ? "#fff" : "var(--ink-2)"} />
      </button>
      {visible && (
        <div className="absolute left-0 top-full z-10 mt-1 p-1.5 rounded-md flex gap-1" style={{ background: "var(--paper-3)", border: "1px solid var(--rule-2)", boxShadow: "0 10px 30px -10px rgba(0,0,0,.6)" }}>
          {options.map(o => (
            <button key={o.k} onClick={() => onInsert(o.k)} className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] hover:bg-[color:var(--paper-2)]">
              {React.createElement(Icons[o.i], { size: 12, stroke: "var(--ink-2)" })}
              {o.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockInspector({ b, onUpdate }) {
  return (
    <div className="space-y-3 text-[12.5px]">
      <div className="flex items-center justify-between">
        <span className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>Typ</span>
        <span className="font-mono">{b.kind}</span>
      </div>
      {b.kind === "heading" && (
        <div>
          <div className="caps text-[10px] mb-1.5" style={{ color: "var(--ink-3)" }}>Ebene</div>
          <div className="grid grid-cols-3 gap-1">
            {[1,2,3].map(l => (
              <button key={l} onClick={() => onUpdate({ level: l })} className="h-8 rounded-md text-[12px]" style={{ background: b.level === l ? "var(--forest)" : "var(--paper-3)", color: b.level === l ? "#fff" : "var(--ink-2)", border: "1px solid var(--rule)" }}>H{l}</button>
            ))}
          </div>
        </div>
      )}
      {b.kind === "callout" && (
        <div>
          <div className="caps text-[10px] mb-1.5" style={{ color: "var(--ink-3)" }}>Farbton</div>
          <div className="grid grid-cols-3 gap-1">
            {["forest","rust","ochre"].map(t => (
              <button key={t} onClick={() => onUpdate({ tone: t })} className="h-8 rounded-md text-[11px]" style={{ background: `var(--${t})`, color: "#fff", opacity: b.tone === t ? 1 : 0.4 }}>{t}</button>
            ))}
          </div>
        </div>
      )}
      {b.kind === "image" && (
        <Button kind="ghost" size="sm" className="w-full" leading={<Icons.Media size={12} />}>Aus Mediathek</Button>
      )}
      <div className="pt-3 rule-t text-[11px]" style={{ color: "var(--ink-3)" }}>
        Ziehen zum Sortieren · ⌘ ⏎ fügt Block darunter ein
      </div>
    </div>
  );
}

window.NewsEditor = NewsEditor;
