// Members screen

function MembersScreen({ onToast }) {
  const [q, setQ] = React.useState("");
  const [section, setSection] = React.useState("all");
  const [dues, setDues] = React.useState("all");
  const [selected, setSelected] = React.useState(null);
  const [sort, setSort] = React.useState("since");

  const sections = ["all", ...new Set(MEMBERS_DATA.map(m => m.section))];

  const list = MEMBERS_DATA
    .filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.mnum.toLowerCase().includes(q.toLowerCase()))
    .filter(m => section === "all" || m.section === section)
    .filter(m => dues === "all" || m.dues === dues)
    .sort((a,b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "num" ? a.mnum.localeCompare(b.mnum) : b.since.localeCompare(a.since));

  const stats = {
    total: MEMBERS_DATA.length,
    active: MEMBERS_DATA.filter(m => m.status === "active").length,
    overdue: MEMBERS_DATA.filter(m => m.dues === "overdue").length,
    newThisYear: 3,
  };

  const duesMap = {
    paid:    { l: "Bezahlt",    tone: "forest" },
    pending: { l: "Offen",      tone: "ochre" },
    overdue: { l: "Überfällig", tone: "rust" },
    exempt:  { l: "Beitragsfrei", tone: "plum" },
  };

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Inhalte · Mitglieder"
        title="Mitgliederverzeichnis."
        subtitle="Stammdaten, Beiträge und Sparten-Zuordnung. Nur intern — niemals auf der öffentlichen Website."
        right={<>
          <Button kind="ghost" leading={<Icons.External size={13} />}>CSV Export</Button>
          <Button kind="primary" leading={<Icons.Plus size={13} />} onClick={() => onToast("Neues Mitglied erfassen.")}>Neu</Button>
        </>}
      />

      <div className="px-10">
        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { k: "Mitglieder gesamt", v: stats.total, s: "inkl. passiv & ehren" },
            { k: "Aktiv", v: stats.active, s: "zahlende Aktive" },
            { k: "Überfällige Beiträge", v: stats.overdue, s: "automatische Mahnung Fr.", accent: "rust" },
            { k: "Neuzugänge 2026", v: stats.newThisYear, s: "seit 01.01." },
          ].map((s, i) => (
            <Card key={i} padded={false} className="p-4 relative overflow-hidden">
              <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>{s.k}</div>
              <div className="font-display text-[32px] leading-none mt-1.5" style={{ color: s.accent === "rust" ? "var(--rust)" : "var(--ink)" }}>{s.v}</div>
              <div className="text-[11.5px] mt-1.5" style={{ color: "var(--ink-3)" }}>{s.s}</div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 h-10 px-3 rounded-md" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            <Icons.Search size={14} stroke="var(--ink-3)" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Suche nach Name oder Mitgliedsnummer…" className="flex-1 bg-transparent outline-none text-[13px]" />
            {q && <button onClick={() => setQ("")}><Icons.X size={12} stroke="var(--ink-3)" /></button>}
          </div>
          <select value={section} onChange={e => setSection(e.target.value)} className="cs-input" style={{ width: 200 }}>
            {sections.map(s => <option key={s} value={s}>{s === "all" ? "Alle Sparten" : s}</option>)}
          </select>
          <select value={dues} onChange={e => setDues(e.target.value)} className="cs-input" style={{ width: 180 }}>
            <option value="all">Alle Beitragsstati</option>
            <option value="paid">Bezahlt</option>
            <option value="pending">Offen</option>
            <option value="overdue">Überfällig</option>
            <option value="exempt">Beitragsfrei</option>
          </select>
        </div>

        {/* Table */}
        <div className="grid grid-cols-[1fr_340px] gap-6 pb-10">
          <Card padded={false}>
            <div className="grid grid-cols-[44px_160px_1fr_1fr_110px_80px_36px] gap-3 px-4 py-2.5 caps text-[10px]" style={{ color: "var(--ink-3)", borderBottom: "1px solid var(--rule)", background: "var(--paper-3)" }}>
              <div />
              <button onClick={() => setSort("num")} className="text-left hover:text-[color:var(--ink)]">Nr.</button>
              <button onClick={() => setSort("name")} className="text-left hover:text-[color:var(--ink)]">Name</button>
              <div>Sparte</div>
              <div>Beitrag</div>
              <button onClick={() => setSort("since")} className="text-left hover:text-[color:var(--ink)]">Seit</button>
              <div />
            </div>
            {list.map(m => (
              <div key={m.id} onClick={() => setSelected(m)} className="row-hover grid grid-cols-[44px_160px_1fr_1fr_110px_80px_36px] gap-3 px-4 py-2.5 items-center cursor-pointer" style={{ borderBottom: "1px solid var(--rule)", background: selected?.id === m.id ? "var(--paper-3)" : "transparent" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium" style={{ background: `oklch(0.45 0.1 ${m.hue})`, color: "#fff" }}>{m.initials}</div>
                <div className="font-mono text-[11.5px] tabular-nums" style={{ color: "var(--ink-2)" }}>{m.mnum}</div>
                <div className="text-[13px] font-medium truncate">{m.name}</div>
                <div className="text-[12.5px]" style={{ color: "var(--ink-2)" }}>{m.section}</div>
                <Pill tone={duesMap[m.dues].tone}>{duesMap[m.dues].l}</Pill>
                <div className="font-mono text-[11.5px] tabular-nums" style={{ color: "var(--ink-3)" }}>{m.since.split("-")[0]}</div>
                <Icons.Chevron size={12} stroke="var(--ink-3)" />
              </div>
            ))}
            <div className="px-4 py-3 flex items-center justify-between text-[11.5px]" style={{ color: "var(--ink-3)" }}>
              <span>Zeige {list.length} von {MEMBERS_DATA.length}</span>
              <span className="font-mono">Seite 1 / 1</span>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {selected ? (
              <Card>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-medium" style={{ background: `oklch(0.45 0.1 ${selected.hue})`, color: "#fff" }}>{selected.initials}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[20px] leading-tight">{selected.name}</h3>
                    <div className="font-mono text-[11.5px] mt-0.5" style={{ color: "var(--ink-3)" }}>{selected.mnum}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-[13px]">
                  <Row l="Sparte" v={selected.section} />
                  <Row l="Status" v={<Pill tone={selected.status === "active" ? "forest" : selected.status === "honor" ? "ochre" : "mute"}>{selected.status === "active" ? "Aktiv" : selected.status === "honor" ? "Ehrenmitglied" : "Passiv"}</Pill>} />
                  <Row l="Beitrag" v={<Pill tone={duesMap[selected.dues].tone}>{duesMap[selected.dues].l}</Pill>} />
                  <Row l="Mitglied seit" v={selected.since} mono />
                  <Row l="Alter" v={`${selected.age} Jahre`} />
                  <Row l="E-Mail" v={selected.email || <span style={{ color: "var(--ink-4)" }}>—</span>} />
                </div>
                <div className="mt-4 pt-4 rule-t flex gap-2">
                  <Button kind="primary" size="sm" className="flex-1" onClick={() => onToast("Profil bearbeiten.")}>Bearbeiten</Button>
                  <Button kind="ghost" size="sm" onClick={() => onToast("E-Mail vorbereitet.")}><Icons.External size={12} /></Button>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>Kein Mitglied ausgewählt</div>
                <p className="text-[13px] mt-2" style={{ color: "var(--ink-2)" }}>Zeile anklicken für Details.</p>
              </Card>
            )}

            <Card>
              <div className="caps text-[10px] mb-3" style={{ color: "var(--ink-3)" }}>Schutz & Datenschutz</div>
              <p className="text-[12.5px]" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>Alle Mitgliederdaten sind privat. Diese Ansicht ist rollen­basiert sichtbar für Kassen­wartin und Vorstand.</p>
              <div className="mt-3 flex items-center gap-2 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                <Icons.EyeOff size={13} />
                <span>Öffentliche Website: keine persönlichen Daten</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5" style={{ borderBottom: "1px dashed var(--rule)" }}>
      <span className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>{l}</span>
      <span className={mono ? "font-mono tabular-nums text-[12.5px]" : "text-[12.5px]"} style={{ color: "var(--ink)" }}>{v}</span>
    </div>
  );
}

window.MembersScreen = MembersScreen;
