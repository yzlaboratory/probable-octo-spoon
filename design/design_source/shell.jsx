// Shell: sidebar, topbar, breadcrumb, page frame.

const NAV = [
  { id: "dashboard", label: "Übersicht", icon: "Dashboard" },
  { id: "news",      label: "News",      icon: "News",     count: 4 },
  { id: "events",    label: "Termine",   icon: "Schedule", count: 9 },
  { id: "media",     label: "Mediathek", icon: "Media",    count: 12 },
  { id: "sponsors",  label: "Sponsoren", icon: "Sponsors", count: 10 },
  { id: "vorstand",  label: "Vorstand",  icon: "Vorstand" },
  { id: "members",   label: "Mitglieder", icon: "Vorstand", count: 12 },
  { id: "public",    label: "Website-Vorschau", icon: "Globe" },
  { id: "theme",     label: "Erscheinungsbild", icon: "Theme" },
  { id: "settings",  label: "Einstellungen",   icon: "Settings", dim: true },
];

function Sidebar({ current, onNav }) {
  return (
    <aside className="w-[248px] shrink-0 h-screen sticky top-0 flex flex-col z-10" style={{ background: "color-mix(in oklab, var(--paper-2) 70%, transparent)", borderRight: "1px solid var(--rule)", backdropFilter: "blur(20px)" }}>
      <div className="px-5 py-5 rule-b">
        <Wordmark />
      </div>

      {/* Club switcher */}
      <div className="px-4 pt-4 pb-3">
        <div className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>Verein</div>
        <button className="mt-1.5 w-full flex items-center gap-2.5 p-2 -mx-2 rounded-md cs-focus hover:bg-[color:var(--paper-3)] transition" style={{ color: "var(--ink)" }}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center font-display text-[13px]" style={{ background: "linear-gradient(135deg, var(--forest), var(--plum))", color: "#fff", boxShadow: "0 0 16px var(--glow)" }}>GW</div>
          <div className="flex-1 text-left leading-tight">
            <div className="text-[13px] font-medium">{CLUB.short}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>{CLUB.domain}</div>
          </div>
          <Icons.Down size={14} stroke="var(--ink-3)" />
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 overflow-auto">
        <div className="caps text-[10px] px-3 pt-2 pb-2" style={{ color: "var(--ink-3)" }}>Inhalte</div>
        <div className="flex flex-col gap-0.5">
          {NAV.slice(0, 7).map(n => (
            <div key={n.id} onClick={() => !n.dim && onNav(n.id)} className={`nav-item ${current === n.id ? "active" : ""} ${n.dim ? "opacity-50" : ""}`}>
              {React.createElement(Icons[n.icon], { className: "nav-icon" })}
              <span className="flex-1">{n.label}</span>
              {n.count != null && <span className="font-mono text-[11px]" style={{ color: current === n.id ? "var(--paper-3)" : "var(--ink-3)" }}>{n.count}</span>}
              {n.dim && <span className="text-[10px] caps" style={{ color: "var(--ink-4)" }}>bald</span>}
            </div>
          ))}
        </div>

        <div className="caps text-[10px] px-3 pt-5 pb-2" style={{ color: "var(--ink-3)" }}>Konfiguration</div>
        <div className="flex flex-col gap-0.5">
          {NAV.slice(7).map(n => (
            <div key={n.id} onClick={() => !n.dim && onNav(n.id)} className={`nav-item ${current === n.id ? "active" : ""} ${n.dim ? "opacity-50" : ""}`}>
              {React.createElement(Icons[n.icon], { className: "nav-icon" })}
              <span className="flex-1">{n.label}</span>
              {n.dim && <span className="text-[10px] caps" style={{ color: "var(--ink-4)" }}>bald</span>}
            </div>
          ))}
        </div>
      </nav>

      {/* Footer card: seasonal / status */}
      <div className="p-3 rule-t">
        <div className="rounded-lg p-3 relative overflow-hidden" style={{ background: "var(--paper-3)", border: "1px solid var(--rule-2)" }}>
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 100% 0%, var(--glow), transparent 60%)" }} />
          <div className="flex items-center gap-1.5">
            <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--rust)" }} />
            <span className="caps text-[10px]" style={{ color: "var(--ink-3)" }}>Saison 2025 / 26</span>
          </div>
          <div className="font-display text-[17px] mt-1 leading-tight relative">Rückrunde läuft</div>
          <div className="text-[11px] mt-0.5 relative" style={{ color: "var(--ink-3)" }}>Noch 7 Spieltage bis zur Sommerpause.</div>
        </div>
        <div className="flex items-center justify-between mt-3 px-1 text-[11px]" style={{ color: "var(--ink-3)" }}>
          <span>v2.8.1 · clubsoft</span>
          <a className="underline decoration-dotted">Hilfe</a>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, onSearch }) {
  return (
    <header className="h-[60px] sticky top-0 z-20 flex items-center px-8 gap-6 rule-b" style={{ background: "color-mix(in oklab, var(--paper) 70%, transparent)", backdropFilter: "blur(16px)" }}>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--ink-3)" }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: "var(--ink-4)" }}>/</span>}
            <span style={{ color: i === crumbs.length - 1 ? "var(--ink)" : "var(--ink-3)" }}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="flex items-center gap-2 w-[280px] h-9 px-3 rounded-md" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
        <Icons.Search size={14} stroke="var(--ink-3)" />
        <input placeholder="Suchen — Meldungen, Personen…" className="flex-1 bg-transparent outline-none text-[12.5px] placeholder:text-[color:var(--ink-4)]" />
        <kbd>⌘K</kbd>
      </div>

      {/* View site */}
      <a href="#" className="flex items-center gap-1.5 text-[12.5px] cs-focus" style={{ color: "var(--ink-2)" }}>
        <Icons.External size={13} />
        Website ansehen
      </a>

      <div className="w-px h-5" style={{ background: "var(--rule-2)" }} />

      <button className="relative cs-focus">
        <Icons.Bell size={17} stroke="var(--ink-2)" />
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--rust)" }} />
      </button>

      {/* User */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-[11px]" style={{ background: "linear-gradient(135deg, var(--rust), var(--plum))", color: "#fff" }}>MK</div>
        <div className="leading-tight">
          <div className="text-[12.5px] font-medium">Michael K.</div>
          <div className="text-[10.5px]" style={{ color: "var(--ink-3)" }}>Redakteur</div>
        </div>
      </div>
    </header>
  );
}

function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="px-10 pt-10 pb-6">
      {eyebrow && <div className="caps text-[10.5px] mb-3" style={{ color: "var(--rust)" }}>{eyebrow}</div>}
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1 max-w-[640px]">
          <h1 className="font-display text-[44px] leading-[1.05]" style={{ letterSpacing: "-0.015em" }}>{title}</h1>
          {subtitle && <p className="mt-3 text-[14.5px]" style={{ color: "var(--ink-2)", textWrap: "pretty" }}>{subtitle}</p>}
        </div>
        {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
      </div>
    </div>
  );
}

function Card({ children, className = "", style = {}, as = "div", padded = true, ...rest }) {
  const Tag = as;
  return (
    <Tag {...rest} className={`${padded ? "p-5" : ""} ${className}`} style={{ background: "var(--paper-2)", border: "1px solid var(--rule)", borderRadius: 10, ...style }}>
      {children}
    </Tag>
  );
}

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral:  { bg: "var(--paper-3)", fg: "var(--ink-2)", dot: "var(--ink-3)" },
    forest:   { bg: "oklch(0.62 0.22 290 / 0.15)", fg: "oklch(0.8 0.18 290)", dot: "var(--forest)" },
    rust:     { bg: "oklch(0.72 0.19 25 / 0.15)", fg: "oklch(0.82 0.16 25)", dot: "var(--rust)" },
    ochre:    { bg: "oklch(0.78 0.16 85 / 0.15)", fg: "oklch(0.86 0.14 85)", dot: "var(--ochre)" },
    plum:     { bg: "oklch(0.58 0.22 330 / 0.18)", fg: "oklch(0.78 0.2 330)", dot: "var(--plum)" },
    mute:     { bg: "transparent", fg: "var(--ink-3)", dot: "var(--ink-4)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span className="chip" style={{ background: t.bg, color: t.fg, border: tone === "mute" ? "1px solid var(--rule-2)" : "none" }}>
      <span className="chip-dot" style={{ background: t.dot }} />
      {children}
    </span>
  );
}

function Button({ children, kind = "ghost", size = "md", leading, trailing, ...rest }) {
  const sizes = { sm: "h-8 px-3 text-[12px]", md: "h-9 px-4 text-[13px]", lg: "h-10 px-5 text-[13.5px]" };
  return (
    <button {...rest} className={`btn-${kind} inline-flex items-center gap-2 ${sizes[size]} rounded-md font-medium cs-focus ${rest.className || ""}`} style={{ borderRadius: 8, ...(rest.style||{}) }}>
      {leading}{children}{trailing}
    </button>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.PageHeader = PageHeader;
window.Card = Card;
window.Pill = Pill;
window.Button = Button;
