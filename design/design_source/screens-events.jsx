// Events screen — calendar + agenda

function EventsScreen({ onToast }) {
  const [view, setView] = React.useState("month"); // month, week, agenda
  const [cursor, setCursor] = React.useState(new Date(2026, 3, 25)); // April 25
  const [selected, setSelected] = React.useState(null);
  const [kindFilter, setKindFilter] = React.useState("all");

  const eventsByDate = React.useMemo(() => {
    const m = {};
    EVENTS_DATA.forEach(e => { (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }, []);

  const filtered = kindFilter === "all" ? EVENTS_DATA : EVENTS_DATA.filter(e => e.kind === kindFilter);

  const kinds = {
    spiel:    { l: "Spiel",    color: "var(--rust)",   bg: "oklch(0.72 0.19 25 / 0.15)" },
    training: { l: "Training", color: "var(--forest-2)", bg: "oklch(0.62 0.22 290 / 0.15)" },
    verein:   { l: "Verein",   color: "var(--ochre)",  bg: "oklch(0.78 0.16 85 / 0.15)" },
  };

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="Inhalte · Termine & Kalender"
        title="Termine & Kalender."
        subtitle="Ein Kalender, der das ganze Vereinsleben bündelt — öffentlich anzeigbar, per ICS abonnierbar, mit Teilnehmerverwaltung."
        right={<>
          <Button kind="ghost" leading={<Icons.Calendar size={13} />}>ICS Export</Button>
          <Button kind="primary" leading={<Icons.Plus size={13} />} onClick={() => onToast("Neuer Termin: Dialog geöffnet.")}>Neuer Termin</Button>
        </>}
      />

      <div className="px-10">
        {/* View toggle + filters */}
        <div className="flex items-center gap-4 mb-5 rule-b pb-4">
          <div className="flex items-center rounded-md p-0.5" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
            {[["month","Monat"],["week","Woche"],["agenda","Agenda"]].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} className="px-3 h-8 text-[12.5px] rounded-md transition" style={{ background: view === k ? "var(--forest)" : "transparent", color: view === k ? "#fff" : "var(--ink-2)", boxShadow: view === k ? "0 0 12px var(--glow)" : "none" }}>{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ border: "1px solid var(--rule)" }}>‹</button>
            <button onClick={() => setCursor(new Date(2026, 3, 25))} className="px-3 h-8 rounded-md text-[12.5px]" style={{ border: "1px solid var(--rule)", background: "var(--paper-2)" }}>Heute</button>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="w-8 h-8 rounded-md flex items-center justify-center" style={{ border: "1px solid var(--rule)" }}>›</button>
          </div>
          <div className="font-display text-[22px] leading-none" style={{ minWidth: 240 }}>
            {cursor.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {["all","spiel","training","verein"].map(k => (
              <button key={k} onClick={() => setKindFilter(k)} className="h-7 px-2.5 rounded-full text-[11.5px] flex items-center gap-1.5" style={{ background: kindFilter === k ? "var(--paper-3)" : "transparent", border: `1px solid ${kindFilter === k ? "var(--rule-2)" : "transparent"}`, color: "var(--ink-2)" }}>
                {k !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: kinds[k].color }} />}
                {k === "all" ? "Alle" : kinds[k].l}
              </button>
            ))}
          </div>
        </div>

        {view === "month" && (
          <div className="grid grid-cols-[1fr_340px] gap-6 pb-10">
            <MonthGrid cursor={cursor} eventsByDate={eventsByDate} kinds={kinds} kindFilter={kindFilter} onSelect={setSelected} selected={selected} />
            <EventSidePanel selected={selected} filtered={filtered} kinds={kinds} onToast={onToast} />
          </div>
        )}

        {view === "week" && <WeekView cursor={cursor} events={filtered} kinds={kinds} />}

        {view === "agenda" && <AgendaView events={filtered} kinds={kinds} onSelect={setSelected} />}
      </div>
    </div>
  );
}

function MonthGrid({ cursor, eventsByDate, kinds, kindFilter, onSelect, selected }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push({ d: prevDays - startOffset + 1 + i, out: true, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ d, out: false, date: iso });
  }
  while (cells.length % 7 !== 0) cells.push({ d: cells.length - (startOffset + daysInMonth) + 1, out: true, date: null });

  const today = "2026-04-16"; // demo

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
      <div className="grid grid-cols-7 caps text-[10px] py-2.5" style={{ background: "var(--paper-3)", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)" }}>
        {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d => <div key={d} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(108px, auto)" }}>
        {cells.map((c, i) => {
          const evs = c.date ? (eventsByDate[c.date] || []) : [];
          const shown = kindFilter === "all" ? evs : evs.filter(e => e.kind === kindFilter);
          const isToday = c.date === today;
          const isSelected = selected && c.date === selected.date;
          return (
            <div key={i} onClick={() => shown[0] && onSelect(shown[0])} className="relative p-2 cursor-pointer transition" style={{ borderRight: (i+1) % 7 !== 0 ? "1px solid var(--rule)" : "none", borderBottom: i < cells.length - 7 ? "1px solid var(--rule)" : "none", background: isSelected ? "var(--paper-3)" : "transparent", opacity: c.out ? .35 : 1 }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`font-mono text-[11.5px] tabular-nums ${isToday ? "text-white" : ""}`} style={{ color: isToday ? "#fff" : "var(--ink-2)", background: isToday ? "var(--rust)" : "transparent", padding: isToday ? "1px 6px" : 0, borderRadius: 6, boxShadow: isToday ? "0 0 12px oklch(0.72 0.19 25 / 0.4)" : "none" }}>{c.d}</span>
                {shown.length > 2 && <span className="text-[10px]" style={{ color: "var(--ink-4)" }}>+{shown.length - 2}</span>}
              </div>
              <div className="flex flex-col gap-1">
                {shown.slice(0, 2).map(e => (
                  <div key={e.id} className="text-[11px] px-1.5 py-0.5 rounded-sm leading-tight truncate" style={{ background: kinds[e.kind].bg, color: "var(--ink)", borderLeft: `2px solid ${kinds[e.kind].color}` }}>
                    <span className="font-mono tabular-nums mr-1" style={{ color: "var(--ink-3)" }}>{e.time}</span>
                    {e.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventSidePanel({ selected, filtered, kinds, onToast }) {
  const upcoming = filtered.filter(e => e.date >= "2026-04-16").slice(0, 6);
  return (
    <div className="flex flex-col gap-4">
      {selected ? (
        <Card>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="caps text-[10px]" style={{ color: kinds[selected.kind].color }}>{kinds[selected.kind].l}</div>
              <h3 className="font-display text-[22px] leading-tight mt-1">{selected.title}</h3>
            </div>
            {selected.status === "draft" && <Pill tone="ochre">Entwurf</Pill>}
            {selected.status === "published" && <Pill tone="forest">Öffentlich</Pill>}
            {selected.status === "scheduled" && <Pill tone="rust">Geplant</Pill>}
          </div>
          <div className="text-[13px] space-y-2" style={{ color: "var(--ink-2)" }}>
            <div className="flex items-center gap-2"><Icons.Calendar size={13} stroke="var(--ink-3)" /><span className="font-mono tabular-nums">{new Date(selected.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })} · {selected.time}</span></div>
            <div className="flex items-center gap-2"><Icons.Globe size={13} stroke="var(--ink-3)" /><span>{selected.location}</span></div>
            <div className="flex items-center gap-2"><Icons.Vorstand size={13} stroke="var(--ink-3)" /><span>Verantwortlich: {selected.lead}</span></div>
          </div>
          <p className="text-[13px] mt-3 pt-3 rule-t" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>{selected.desc}</p>
          {selected.capacity > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11.5px] mb-1.5">
                <span style={{ color: "var(--ink-3)" }}>Anmeldungen</span>
                <span className="font-mono tabular-nums">{selected.attendees} / {selected.capacity}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--paper-3)" }}>
                <div className="h-full" style={{ width: `${(selected.attendees / selected.capacity) * 100}%`, background: kinds[selected.kind].color, boxShadow: `0 0 8px ${kinds[selected.kind].color}` }} />
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button kind="primary" size="sm" className="flex-1" onClick={() => onToast("Bearbeiten geöffnet.")}>Bearbeiten</Button>
            <Button kind="ghost" size="sm" onClick={() => onToast("Teilnehmerliste exportiert.")}>Teilnehmer</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>Auswahl</div>
          <p className="text-[13px] mt-2" style={{ color: "var(--ink-2)" }}>Termin anklicken für Details.</p>
        </Card>
      )}

      <Card padded={false} className="p-5">
        <div className="caps text-[10px] mb-3" style={{ color: "var(--ink-3)" }}>Nächste Termine</div>
        <div className="flex flex-col gap-2.5">
          {upcoming.map(e => (
            <div key={e.id} className="flex gap-3 pb-2.5" style={{ borderBottom: "1px dashed var(--rule)" }}>
              <div className="w-10 text-center py-1 rounded-md flex-shrink-0" style={{ background: kinds[e.kind].bg, borderLeft: `2px solid ${kinds[e.kind].color}` }}>
                <div className="caps text-[9px]" style={{ color: "var(--ink-3)" }}>{new Date(e.date).toLocaleDateString("de-DE", { month: "short" }).replace(".","")}</div>
                <div className="font-display text-[18px] leading-none">{new Date(e.date).getDate()}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium truncate">{e.title}</div>
                <div className="text-[11px] font-mono tabular-nums" style={{ color: "var(--ink-3)" }}>{e.time} · {e.location}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function WeekView({ cursor, events, kinds }) {
  // Week of April 20–26, 2026 (demo fixed)
  const weekDates = ["2026-04-20","2026-04-21","2026-04-22","2026-04-23","2026-04-24","2026-04-25","2026-04-26"];
  const hours = [8,10,12,14,16,18,20];

  return (
    <div className="rounded-lg overflow-hidden pb-10" style={{ border: "1px solid var(--rule)", background: "var(--paper-2)" }}>
      <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ borderBottom: "1px solid var(--rule)", background: "var(--paper-3)" }}>
        <div />
        {weekDates.map(d => (
          <div key={d} className="py-2.5 text-center">
            <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>{new Date(d).toLocaleDateString("de-DE", { weekday: "short" })}</div>
            <div className="font-display text-[18px] leading-none mt-0.5">{new Date(d).getDate()}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[56px_repeat(7,1fr)] relative" style={{ height: 520 }}>
        <div className="flex flex-col justify-between py-1 text-[10px] font-mono tabular-nums pr-2 text-right" style={{ color: "var(--ink-4)" }}>
          {hours.map(h => <div key={h} style={{ height: 520 / hours.length }}>{String(h).padStart(2,"0")}:00</div>)}
        </div>
        {weekDates.map((d, di) => {
          const dayEvents = events.filter(e => e.date === d);
          return (
            <div key={d} className="relative" style={{ borderLeft: "1px solid var(--rule)" }}>
              {hours.map(h => <div key={h} style={{ height: 520 / hours.length, borderBottom: "1px dashed var(--rule)" }} />)}
              {dayEvents.map(e => {
                const [hh, mm] = e.time.split(":").map(Number);
                const startHour = hh + mm/60;
                const top = ((startHour - 8) / 12) * 520;
                const height = (e.dur / 60 / 12) * 520;
                return (
                  <div key={e.id} className="absolute left-1 right-1 rounded-md p-1.5 text-[11px] leading-tight overflow-hidden" style={{ top, height: Math.max(height, 28), background: kinds[e.kind].bg, borderLeft: `2px solid ${kinds[e.kind].color}` }}>
                    <div className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>{e.time}</div>
                    <div className="font-medium truncate">{e.title}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaView({ events, kinds, onSelect }) {
  const grouped = React.useMemo(() => {
    const m = {};
    events.forEach(e => { (m[e.date] = m[e.date] || []).push(e); });
    return Object.entries(m).sort();
  }, [events]);

  return (
    <div className="pb-10 max-w-3xl">
      {grouped.map(([date, evs]) => (
        <div key={date} className="grid grid-cols-[120px_1fr] gap-6 py-4 rule-b">
          <div className="text-right">
            <div className="font-display text-[28px] leading-none">{new Date(date).getDate()}</div>
            <div className="caps text-[10px] mt-1" style={{ color: "var(--ink-3)" }}>{new Date(date).toLocaleDateString("de-DE", { month: "short", weekday: "long" })}</div>
          </div>
          <div className="flex flex-col gap-2">
            {evs.map(e => (
              <button key={e.id} onClick={() => onSelect(e)} className="text-left p-3 rounded-md flex items-center gap-3 transition hover:bg-[color:var(--paper-3)]" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
                <div className="w-1 h-10 rounded-full" style={{ background: kinds[e.kind].color, boxShadow: `0 0 8px ${kinds[e.kind].color}` }} />
                <div className="font-mono text-[11.5px] tabular-nums w-12" style={{ color: "var(--ink-2)" }}>{e.time}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium truncate">{e.title}</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>{e.location} · {e.lead}</div>
                </div>
                <Pill tone={e.status === "draft" ? "ochre" : e.status === "scheduled" ? "rust" : "forest"}>
                  {e.status === "draft" ? "Entwurf" : e.status === "scheduled" ? "Geplant" : "Öffentlich"}
                </Pill>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

window.EventsScreen = EventsScreen;
