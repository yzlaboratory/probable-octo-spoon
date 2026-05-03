import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const NAV: Array<{ to: string; label: string }> = [
  { to: "/", label: "Start" },
  { to: "/news", label: "Meldungen" },
  { to: "/team", label: "Mannschaften" },
  { to: "/sponsors", label: "Sponsoren" },
  { to: "/contact", label: "Kontakt" },
];

function navStyle(isActive: boolean): React.CSSProperties {
  return {
    color: isActive ? "var(--p-ink)" : "var(--p-ink-2)",
    fontWeight: isActive ? 600 : 400,
    borderBottom: isActive
      ? "2px solid var(--p-accent)"
      : "2px solid transparent",
    paddingBottom: 4,
  };
}

export default function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="public-header"
      style={{ borderBottom: "1px solid var(--p-rule)", background: "var(--p-paper)" }}
    >
      <div
        className="mx-auto flex w-full max-w-6xl items-center px-6 py-4"
        style={{ gap: 24 }}
      >
        <Link
          to="/"
          className="flex items-center gap-3"
          style={{ color: "var(--p-ink)", textDecoration: "none" }}
          aria-label="Startseite"
        >
          <span
            className="font-display"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "var(--p-primary)",
              color: "var(--p-paper)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              letterSpacing: "-0.02em",
            }}
          >
            SVA
          </span>
          <span className="leading-tight">
            <span
              className="font-display"
              style={{ display: "block", fontSize: 18, letterSpacing: "-0.02em" }}
            >
              SV Alemannia
            </span>
            <span
              className="caps"
              style={{
                display: "block",
                fontSize: 10.5,
                color: "var(--p-ink-3)",
                letterSpacing: "0.16em",
              }}
            >
              Thalexweiler · 1947
            </span>
          </span>
        </Link>

        <nav
          className="public-nav public-only-desktop-flex items-center"
          style={{ gap: 20, fontSize: 13, color: "var(--p-ink-2)", marginLeft: 24 }}
          aria-label="Hauptnavigation"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => navStyle(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <Link
          to="/admin"
          className="public-only-desktop"
          style={{
            fontSize: 12,
            color: "var(--p-ink-3)",
            textDecoration: "none",
            letterSpacing: "0.05em",
          }}
        >
          Login
        </Link>

        <Link to="/contact" className="p-btn p-btn-primary public-only-desktop">
          Mitglied werden
        </Link>

        <button
          type="button"
          className="public-only-mobile"
          aria-label="Menü öffnen"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            width: 40,
            height: 40,
            background: "transparent",
            border: "1px solid var(--p-rule)",
            borderRadius: 6,
            color: "var(--p-ink)",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div
          className="public-only-mobile"
          style={{
            borderTop: "1px solid var(--p-rule)",
            background: "var(--p-paper)",
            display: "block",
          }}
        >
          <nav
            className="mx-auto flex max-w-6xl flex-col px-6 py-4"
            style={{ gap: 12 }}
            aria-label="Mobile Hauptnavigation"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  color: isActive ? "var(--p-ink)" : "var(--p-ink-2)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 15,
                  textDecoration: "none",
                })}
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              onClick={() => setMenuOpen(false)}
              className="p-btn p-btn-primary mt-2"
              style={{ alignSelf: "flex-start" }}
            >
              Mitglied werden
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
