function VorstandScreen({ onToast }) {
  const [members, setMembers] = React.useState(VORSTAND_DATA);
  const [filter, setFilter] = React.useState("active");
  const visible = members.filter(m => m.status === filter);
  const [dragId, setDragId] = React.useState(null);

  function onDrop(targetId) {
    if (!dragId || dragId === targetId) return;
    const next = [...members];
    const from = next.findIndex(x => x.id === dragId);
    const to = next.findIndex(x => x.id === targetId);
    next.splice(to, 0, next.splice(from, 1)[0]);
    setMembers(next); setDragId(null);
    onToast("Reihenfolge gespeichert.");
  }

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Inhalte · Vorstand"
        title="Vorstand & Geschäftsstelle"
        subtitle="Kontaktpersonen für Mitglieder, Presse und Behörden. Die Reihenfolge hier bestimmt die Anzeige auf der Website — ziehen zum Umsortieren."
        right={<>
          <Button kind="ghost" leading={<Icons.Upload size={13} />}>CSV importieren</Button>
          <Button kind="primary" leading={<Icons.Plus size={14} />} onClick={() => onToast("Dialog geöffnet.")}>Mitglied hinzufügen</Button>
        </>}
      />

      <div className="px-10 pb-14">
        <div className="flex items-center gap-1 mb-5 rule-b">
          {[
            { k: "active", l: "Aktiv", n: members.filter(m=>m.status==="active").length },
            { k: "hidden", l: "Verborgen", n: members.filter(m=>m.status==="hidden").length },
            { k: "archived", l: "Ehemalig", n: 0 },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} className="relative px-3 h-10 text-[13px] flex items-center gap-2" style={{ color: filter === f.k ? "var(--ink)" : "var(--ink-3)" }}>
              {f.l}
              <span className="font-mono text-[10.5px]" style={{ color: "var(--ink-4)" }}>{f.n}</span>
              {filter === f.k && <span className="absolute left-0 right-0 bottom-[-1px] h-[2px]" style={{ background: "var(--forest)", boxShadow: "0 0 12px var(--glow)" }} />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-4">
          {visible.map(m => (
            <div key={m.id}
              draggable
              onDragStart={() => setDragId(m.id)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(m.id)}
              className="group relative"
              style={{ opacity: dragId === m.id ? .4 : 1 }}
            >
              <Card padded={false} className="overflow-hidden">
                {/* Portrait */}
                <div className="aspect-[4/5] relative flex items-end justify-center overflow-hidden" style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${m.color} 40%, var(--paper-3)) 0%, var(--paper-3) 100%)` }}>
                  <div className="absolute inset-0 stripes opacity-30" />
                  <div className="absolute top-3 left-3">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition" style={{ background: "var(--paper-2)", border: "1px solid var(--rule-2)" }}>
                      <Icons.Drag size={11} stroke="var(--ink-3)" />
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {m.status === "active" && <Pill tone="forest">Aktiv</Pill>}
                    {m.status === "hidden" && <Pill tone="ochre">Verborgen</Pill>}
                  </div>
                  <div className="relative w-full h-full flex items-end justify-center pb-6">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center font-display text-[36px]" style={{ background: m.color, color: "#fff", boxShadow: `0 0 30px color-mix(in oklab, ${m.color} 60%, transparent)` }}>{m.initials}</div>
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <div className="caps text-[9.5px]" style={{ color: "var(--ink-3)" }}>{m.role}</div>
                  <div className="font-display text-[19px] mt-1 leading-tight" style={{ textWrap: "balance" }}>{m.name}</div>
                  <div className="mt-3 space-y-1 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                    {m.email ? <div className="truncate font-mono">{m.email}</div> : <div style={{ color: "var(--ink-4)" }}>— E-Mail fehlt</div>}
                    {m.phone ? <div className="font-mono">{m.phone}</div> : <div style={{ color: "var(--ink-4)" }}>— Telefon</div>}
                  </div>
                  <div className="mt-4 flex gap-1 pt-3 rule-t">
                    <button className="text-[11.5px] px-2 h-7 rounded-sm flex-1" style={{ color: "var(--ink-2)" }}>Bearbeiten</button>
                    <button className="text-[11.5px] px-2 h-7 rounded-sm" style={{ color: "var(--ink-3)" }}>⋯</button>
                  </div>
                </div>
              </Card>
            </div>
          ))}

          {/* Add card */}
          <button onClick={() => onToast("Dialog geöffnet.")} className="aspect-auto flex flex-col items-center justify-center gap-2 rounded-lg p-8" style={{ border: "1.5px dashed var(--rule-2)", color: "var(--ink-3)", background: "var(--paper-2)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--paper-3)" }}>
              <Icons.Plus size={20} stroke="var(--ink-2)" />
            </div>
            <div className="text-[13px] font-medium mt-2" style={{ color: "var(--ink)" }}>Mitglied hinzufügen</div>
            <div className="text-[11px] text-center" style={{ textWrap: "balance" }}>Name, Rolle, Portrait & Kontakt — erscheint auf /vorstand.</div>
          </button>
        </div>
      </div>
    </div>
  );
}

window.VorstandScreen = VorstandScreen;
