function SponsorsScreen({ onToast }) {
  const [sponsors, setSponsors] = React.useState(SPONSORS_DATA);
  const [editing, setEditing] = React.useState(null);
  const [dragId, setDragId] = React.useState(null);

  const active = sponsors.filter(s => s.status === "active");
  const paused = sponsors.filter(s => s.status === "paused");
  const totalWeight = active.reduce((s, x) => s + x.weight, 0);

  function setWeight(id, w) {
    setSponsors(s => s.map(x => x.id === id ? { ...x, weight: Math.max(0, Math.min(10, w)) } : x));
  }

  const tierTone = { "Hauptsponsor": "rust", "Premium": "forest", "Standard": "plum", "Partner": "mute" };

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Inhalte · Sponsoren"
        title="Sponsoren & Partner"
        subtitle={`Jeder aktive Sponsor bekommt ein Gewicht zwischen 0 und 10. Je höher, desto öfter erscheint sein Logo oben — in der Galerie, im Footer, auf der Startseite.`}
        right={<>
          <Button kind="ghost" leading={<Icons.Eye size={14} />}>Galerie-Vorschau</Button>
          <Button kind="primary" leading={<Icons.Plus size={14} />} onClick={() => setEditing({ _new: true })}>Sponsor anlegen</Button>
        </>}
      />

      <div className="px-10 pb-14">
        {/* Weight distribution bar */}
        <Card padded={false} className="mb-8">
          <div className="px-5 py-4 rule-b flex items-center justify-between">
            <div>
              <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>Gewichtungsverteilung</div>
              <div className="font-display text-[20px] mt-0.5">So sieht ein·e Besucher·in die Logoreihe.</div>
            </div>
            <span className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>{totalWeight} Punkte · {active.length} aktiv</span>
          </div>
          <div className="px-5 py-5">
            <div className="flex h-10 rounded-sm overflow-hidden" style={{ border: "1px solid var(--rule)" }}>
              {active.map((s, i) => {
                const pct = (s.weight / totalWeight) * 100;
                const colors = ["var(--forest)", "var(--rust)", "var(--plum)", "var(--ochre)", "var(--moss)", "var(--forest-2)", "var(--rust-2)"];
                return (
                  <div key={s.id} className="relative group" style={{ width: `${pct}%`, background: colors[i % colors.length], borderRight: i < active.length-1 ? "1px solid var(--paper)" : "none" }}>
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                      <span className="text-[10.5px] font-medium whitespace-nowrap px-1" style={{ color: "var(--paper)" }}>{pct > 6 ? s.name.split(" ")[0] : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: "var(--ink-3)" }}>
              <span>Die Reihenfolge wird bei jedem Seitenaufruf neu gemischt — gewichtet nach Punktzahl.</span>
              <span className="font-mono">shuffleTopSponsors(8)</span>
            </div>
          </div>
        </Card>

        {/* Table + editor split */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <Card padded={false}>
              <div className="flex items-center justify-between px-5 py-4 rule-b">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[20px]">Aktive Sponsoren</span>
                  <span className="font-mono text-[11px]" style={{ color: "var(--ink-4)" }}>{active.length}</span>
                </div>
                <div className="flex gap-1 text-[11.5px]">
                  <button className="px-2.5 h-7 rounded-full" style={{ background: "var(--forest)", color: "#fff", boxShadow: "0 0 16px var(--glow)" }}>Aktiv</button>
                  <button className="px-2.5 h-7 rounded-full" style={{ color: "var(--ink-3)" }}>Pausiert · {paused.length}</button>
                  <button className="px-2.5 h-7 rounded-full" style={{ color: "var(--ink-3)" }}>Archiv</button>
                </div>
              </div>

              <div className="grid grid-cols-[24px_56px_1fr_100px_180px_40px] gap-3 px-5 py-2.5 caps text-[10px] rule-b" style={{ color: "var(--ink-3)", background: "var(--paper-2)" }}>
                <div></div>
                <div>Logo</div>
                <div>Sponsor</div>
                <div>Tier</div>
                <div>Gewicht</div>
                <div></div>
              </div>

              {active.map((s, i) => (
                <div key={s.id}
                  draggable
                  onDragStart={() => setDragId(s.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (!dragId || dragId === s.id) return;
                    const next = [...sponsors];
                    const from = next.findIndex(x => x.id === dragId);
                    const to = next.findIndex(x => x.id === s.id);
                    next.splice(to, 0, next.splice(from, 1)[0]);
                    setSponsors(next); setDragId(null);
                  }}
                  className={`grid grid-cols-[24px_56px_1fr_100px_180px_40px] gap-3 px-5 py-3.5 items-center row-hover ${editing?.id === s.id ? "bg-[color:var(--paper-2)]" : ""}`}
                  style={{ borderTop: i ? "1px solid var(--rule)" : "none", opacity: dragId === s.id ? .4 : 1 }}
                  onClick={() => setEditing(s)}
                >
                  <div className="cursor-grab"><Icons.Drag size={14} stroke="var(--ink-4)" /></div>
                  <div className="w-12 h-9 rounded-md flex items-center justify-center font-display text-[11px]" style={{ background: s.palette === "transparent" ? "var(--paper-3)" : s.palette === "warm-neutral" ? "oklch(0.88 0.05 80)" : "oklch(0.86 0.04 240)", color: "#1a1a22" }}>
                    {s.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="text-[13.5px] font-medium leading-tight">{s.name}</div>
                    <div className="text-[11px] mt-0.5 font-mono" style={{ color: "var(--ink-3)" }}>{s.url} · seit {s.since}</div>
                  </div>
                  <div><Pill tone={tierTone[s.tier]}>{s.tier}</Pill></div>
                  <div className="flex items-center gap-2.5" onClick={e => e.stopPropagation()}>
                    <input type="range" min={0} max={10} value={s.weight} onChange={e => setWeight(s.id, +e.target.value)} className="flex-1" style={{ accentColor: "var(--forest)" }} />
                    <span className="font-mono text-[12px] w-6 text-right">{s.weight}</span>
                  </div>
                  <div className="text-right"><Icons.Chevron size={13} stroke="var(--ink-3)" /></div>
                </div>
              ))}
            </Card>
          </div>

          {/* Detail panel */}
          <div className="col-span-4">
            {editing ? (
              <Card padded={false} className="sticky top-[80px]">
                <div className="px-5 py-4 rule-b flex items-center justify-between">
                  <div className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>{editing._new ? "Neuer Sponsor" : "Details"}</div>
                  <button onClick={() => setEditing(null)}><Icons.X size={14} stroke="var(--ink-3)" /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="aspect-[3/2] rounded-md stripes flex items-center justify-center" style={{ border: "1px dashed var(--rule-2)", background: "var(--paper-3)" }}>
                    <div className="text-center">
                      <Icons.Upload size={18} stroke="var(--ink-3)" />
                      <div className="text-[11.5px] mt-1.5" style={{ color: "var(--ink-3)" }}>Logo (SVG bevorzugt)</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] caps block mb-1" style={{ color: "var(--ink-3)" }}>Name</label>
                    <input className="cs-input" defaultValue={editing.name || ""} placeholder="Firmenname" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] caps block mb-1" style={{ color: "var(--ink-3)" }}>Tier</label>
                      <select className="cs-input">
                        {["Hauptsponsor", "Premium", "Standard", "Partner"].map(t => <option key={t} selected={editing.tier === t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] caps block mb-1" style={{ color: "var(--ink-3)" }}>Gewicht</label>
                      <input className="cs-input font-mono" defaultValue={editing.weight ?? 3} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] caps block mb-1" style={{ color: "var(--ink-3)" }}>Link-URL</label>
                    <input className="cs-input font-mono text-[11.5px]" defaultValue={editing.url ? `https://${editing.url}` : ""} placeholder="https://…" />
                  </div>
                  <div>
                    <label className="text-[11px] caps block mb-1" style={{ color: "var(--ink-3)" }}>Kartenhintergrund</label>
                    <div className="flex gap-1.5">
                      {[
                        { k: "transparent", l: "Transparent", bg: "var(--paper-3)", fg: "var(--ink-2)" },
                        { k: "warm-neutral", l: "Warm", bg: "oklch(0.88 0.05 80)", fg: "#1a1a22" },
                        { k: "cool-neutral", l: "Kühl", bg: "oklch(0.86 0.04 240)", fg: "#1a1a22" },
                      ].map(p => (
                        <button key={p.k} className="flex-1 h-9 rounded-md text-[11px]" style={{ background: p.bg, border: `1px solid ${editing.palette === p.k ? "var(--forest)" : "var(--rule)"}`, color: p.fg, boxShadow: editing.palette === p.k ? "0 0 0 2px var(--glow)" : "none" }}>{p.l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] caps block mb-1" style={{ color: "var(--ink-3)" }}>Aktiv ab</label>
                      <input className="cs-input font-mono text-[12px]" defaultValue="01.01.2024" />
                    </div>
                    <div>
                      <label className="text-[11px] caps block mb-1" style={{ color: "var(--ink-3)" }}>Läuft bis</label>
                      <input className="cs-input font-mono text-[12px]" defaultValue="31.12.2026" />
                    </div>
                  </div>
                  <div className="pt-3 rule-t flex items-center gap-2">
                    <Button kind="primary" size="sm" onClick={() => { onToast("Änderungen gespeichert."); setEditing(null); }}>Speichern</Button>
                    <Button kind="ghost" size="sm">Pausieren</Button>
                    <div className="flex-1" />
                    <button className="w-8 h-8 rounded-md flex items-center justify-center" style={{ border: "1px solid var(--rule)" }}><Icons.Trash size={13} stroke="var(--rust)" /></button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card padded={false} className="sticky top-[80px]">
                <div className="p-8 text-center">
                  <div className="w-14 h-14 rounded-md mx-auto mb-4 stripes-forest flex items-center justify-center" style={{ boxShadow: "0 0 30px var(--glow)" }}>
                    <Icons.Sponsors size={22} stroke="var(--forest)" />
                  </div>
                  <div className="font-display text-[18px]">Details ansehen</div>
                  <div className="text-[12px] mt-1" style={{ color: "var(--ink-3)", textWrap: "pretty" }}>Wähle einen Sponsor aus der Liste, um Logo, Laufzeit und Gewichtung zu bearbeiten.</div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.SponsorsScreen = SponsorsScreen;
