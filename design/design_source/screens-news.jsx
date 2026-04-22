function NewsScreen({ onOpen }) {
  const [filter, setFilter] = React.useState("all");
  const FILTERS = [
    { k: "all", l: "Alle", n: NEWS_DATA.length },
    { k: "draft", l: "Entwurf", n: NEWS_DATA.filter(x=>x.status==="draft").length },
    { k: "scheduled", l: "Geplant", n: NEWS_DATA.filter(x=>x.status==="scheduled").length },
    { k: "published", l: "Veröffentlicht", n: NEWS_DATA.filter(x=>x.status==="published").length },
    { k: "withdrawn", l: "Zurückgezogen", n: NEWS_DATA.filter(x=>x.status==="withdrawn").length },
  ];
  const items = filter === "all" ? NEWS_DATA : NEWS_DATA.filter(n => n.status === filter);
  const statusLabel = { published: "Veröffentlicht", scheduled: "Geplant", draft: "Entwurf", withdrawn: "Zurückgezogen", deleted: "Papierkorb" };
  const statusTone = { published: "forest", scheduled: "ochre", draft: "mute", withdrawn: "neutral", deleted: "rust" };

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Inhalte · News"
        title="Meldungen"
        subtitle="Alles, was auf der Startseite, in der News-Liste und im RSS-Feed erscheint. Entwürfe sind nur für Redakteur·innen sichtbar."
        right={<>
          <Button kind="ghost" leading={<Icons.Calendar size={14} />}>Redaktionsplan</Button>
          <Button kind="primary" leading={<Icons.Plus size={14} />} onClick={() => onOpen(NEWS_DATA[0])}>Neue Meldung</Button>
        </>}
      />

      <div className="px-10 pb-14">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 rule-b pb-0">
          {FILTERS.map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} className="relative px-3 h-10 text-[13px] flex items-center gap-2" style={{ color: filter === f.k ? "var(--ink)" : "var(--ink-3)" }}>
              {f.l}
              <span className="font-mono text-[10.5px]" style={{ color: "var(--ink-4)" }}>{f.n}</span>
              {filter === f.k && <span className="absolute left-0 right-0 bottom-[-1px] h-[2px]" style={{ background: "var(--forest)", boxShadow: "0 0 12px var(--glow)" }} />}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2 h-9 px-3 rounded-md" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <Icons.Search size={13} stroke="var(--ink-3)" />
            <input placeholder="In Meldungen suchen…" className="bg-transparent outline-none text-[12px] w-52" />
          </div>
        </div>

        {/* Table */}
        <Card padded={false}>
          <div className="grid grid-cols-[80px_1fr_140px_120px_140px_90px] gap-4 px-5 py-3 caps text-[10px] rule-b" style={{ color: "var(--ink-3)" }}>
            <div></div>
            <div>Titel</div>
            <div>Tag</div>
            <div>Status</div>
            <div>Datum</div>
            <div className="text-right">Aufrufe</div>
          </div>
          {items.map((n, i) => (
            <div key={n.id} onClick={() => onOpen(n)} className="grid grid-cols-[80px_1fr_140px_120px_140px_90px] gap-4 px-5 py-4 items-center row-hover cursor-pointer" style={{ borderTop: i ? "1px solid var(--rule)" : "none" }}>
              <div className="w-16 h-12 rounded-sm stripes" style={{ background: "var(--paper-2)" }} />
              <div>
                <div className="font-medium text-[14px] leading-snug">{n.title}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: "var(--ink-3)" }}>{n.short}</div>
              </div>
              <div className="text-[12.5px]" style={{ color: "var(--ink-2)" }}>{n.tag}</div>
              <div><Pill tone={statusTone[n.status]}>{statusLabel[n.status]}</Pill></div>
              <div className="font-mono text-[11.5px]" style={{ color: "var(--ink-3)" }}>{n.publishAt || "—"}</div>
              <div className="text-right font-mono text-[12px]" style={{ color: n.views > 0 ? "var(--ink)" : "var(--ink-4)" }}>{n.views > 0 ? n.views.toLocaleString("de") : "—"}</div>
            </div>
          ))}
        </Card>

        <div className="mt-4 flex items-center justify-between text-[12px]" style={{ color: "var(--ink-3)" }}>
          <span>{items.length} von {NEWS_DATA.length} Meldungen</span>
          <div className="flex items-center gap-1">
            <button className="h-7 w-7 rounded-md flex items-center justify-center" style={{ border: "1px solid var(--rule)" }}>‹</button>
            <button className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: "var(--forest)", color: "#fff" }}>1</button>
            <button className="h-7 w-7 rounded-md flex items-center justify-center" style={{ border: "1px solid var(--rule)" }}>2</button>
            <button className="h-7 w-7 rounded-md flex items-center justify-center" style={{ border: "1px solid var(--rule)" }}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// NewsEditor moved to screens-news-editor.jsx

window.NewsScreen = NewsScreen;
