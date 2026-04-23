function App() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem("cs_state") || "{}"); } catch { return {}; } })();
  const [screen, setScreen] = React.useState(saved.screen || "dashboard");
  const [editing, setEditing] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [themeKey, setThemeKey] = React.useState(saved.themeKey || "editorial");
  const [density, setDensity] = React.useState(saved.density ?? 1);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  // Tweak defaults (persisted)
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "rust",
    "sidebar": "paper"
  }/*EDITMODE-END*/;
  const [tweaks, setTweaks] = React.useState({ ...TWEAK_DEFAULTS, ...(saved.tweaks || {}) });

  // persist
  React.useEffect(() => {
    localStorage.setItem("cs_state", JSON.stringify({ screen, themeKey, density, tweaks }));
  }, [screen, themeKey, density, tweaks]);

  // Toast auto-dismiss
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Apply tweaks to :root
  React.useEffect(() => {
    const accents = {
      rust:   { a: "#b5401b", a2: "#d25a2e" },
      navy:   { a: "#1a3a66", a2: "#2d528e" },
      ochre:  { a: "#c89a2a", a2: "#e0b848" },
      plum:   { a: "#6b3a5a", a2: "#8a4e76" },
    };
    const a = accents[tweaks.accent] || accents.rust;
    document.documentElement.style.setProperty("--rust", a.a);
    document.documentElement.style.setProperty("--rust-2", a.a2);
  }, [tweaks.accent]);

  // Edit mode protocol
  React.useEffect(() => {
    function onMsg(e) {
      const d = e.data;
      if (!d || !d.type) return;
      if (d.type === "__activate_edit_mode") setTweaksOpen(true);
      else if (d.type === "__deactivate_edit_mode") setTweaksOpen(false);
    }
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function setTweak(k, v) {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
  }

  const crumbs = {
    dashboard: ["Clubsoft", CLUB.short, "Übersicht"],
    news: editing ? ["Clubsoft", CLUB.short, "News", "Bearbeiten"] : ["Clubsoft", CLUB.short, "News"],
    events: ["Clubsoft", CLUB.short, "Termine & Kalender"],
    media: ["Clubsoft", CLUB.short, "Mediathek"],
    sponsors: ["Clubsoft", CLUB.short, "Sponsoren"],
    vorstand: ["Clubsoft", CLUB.short, "Vorstand"],
    members: ["Clubsoft", CLUB.short, "Mitglieder"],
    public: ["Clubsoft", CLUB.short, "Website-Vorschau"],
    theme: ["Clubsoft", CLUB.short, "Erscheinungsbild"],
  }[screen] || ["Clubsoft"];

  function nav(s) { setEditing(null); setScreen(s); }

  return (
    <div className="flex min-h-screen relative" style={{ background: "var(--paper)" }}>
      <Sidebar current={screen} onNav={nav} />
      <main className="flex-1 min-w-0 relative">
        <Topbar crumbs={crumbs} />
        {screen === "dashboard" && <DashboardScreen />}
        {screen === "news" && !editing && <NewsScreen onOpen={(n) => setEditing(n)} />}
        {screen === "news" && editing && <NewsEditor item={editing} onBack={() => setEditing(null)} onToast={setToast} />}
        {screen === "events" && <EventsScreen onToast={setToast} />}
        {screen === "media" && <MediaScreen onToast={setToast} />}
        {screen === "sponsors" && <SponsorsScreen onToast={setToast} />}
        {screen === "vorstand" && <VorstandScreen onToast={setToast} />}
        {screen === "members" && <MembersScreen onToast={setToast} />}
        {screen === "public" && <PublicWebsiteScreen onToast={setToast} themeKey={themeKey} density={density} />}
        {screen === "theme" && <ThemeScreen themeKey={themeKey} setThemeKey={setThemeKey} density={density} setDensity={setDensity} onToast={setToast} />}
      </main>

      {toast && (
        <div className="toast">
          <Icons.Check size={14} stroke="var(--paper)" />
          {toast}
        </div>
      )}

      {/* Tweaks */}
      <div className={`tweaks ${tweaksOpen ? "open" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-[15px]" style={{ color: "var(--paper)" }}>Tweaks</div>
          <button onClick={() => setTweaksOpen(false)}><Icons.X size={13} stroke="var(--paper-3)" /></button>
        </div>
        <div className="text-[10.5px] mb-2" style={{ color: "var(--ink-4)" }}>Schnelle Variationen der Benutzeroberfläche.</div>
        <label>
          <span>Akzentfarbe</span>
          <select value={tweaks.accent} onChange={e => setTweak("accent", e.target.value)}>
            <option value="rust">Rost</option>
            <option value="navy">Navy</option>
            <option value="ochre">Ocker</option>
            <option value="plum">Pflaume</option>
          </select>
        </label>
        <label>
          <span>Schnellsprung</span>
          <select value={screen} onChange={e => nav(e.target.value)}>
            <option value="dashboard">Übersicht</option>
            <option value="news">News</option>
            <option value="events">Termine</option>
            <option value="media">Mediathek</option>
            <option value="sponsors">Sponsoren</option>
            <option value="vorstand">Vorstand</option>
            <option value="members">Mitglieder</option>
            <option value="public">Website-Vorschau</option>
            <option value="theme">Erscheinungsbild</option>
          </select>
        </label>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
