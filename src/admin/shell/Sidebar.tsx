import { NavLink, useLocation } from "react-router-dom";
import * as Icons from "../ui/Icons";
import type { IconName } from "../ui/Icons";
import logo from "../../assets/logo.svg";
import { CLUB_SHORT, CLUB_DOMAIN, CLUB_NAME } from "./club";

interface NavEntry {
  id: string;
  label: string;
  icon: IconName;
  to?: string;
  count?: number;
  /** Feature not yet shipped. Renders at half opacity with a "bald" chip. */
  soon?: boolean;
}

const CONTENT_NAV: NavEntry[] = [
  { id: "dashboard", label: "Übersicht", icon: "Dashboard", to: "/admin" },
  { id: "news", label: "News", icon: "News", to: "/admin/news" },
  { id: "events", label: "Termine", icon: "Schedule", soon: true },
  { id: "media", label: "Mediathek", icon: "Media", to: "/admin/media" },
  {
    id: "sponsors",
    label: "Sponsoren",
    icon: "Sponsors",
    to: "/admin/sponsors",
  },
  {
    id: "vorstand",
    label: "Vorstand",
    icon: "Vorstand",
    to: "/admin/vorstand",
  },
  { id: "members", label: "Mitglieder", icon: "Vorstand", soon: true },
];

const CONFIG_NAV: NavEntry[] = [
  { id: "public", label: "Website-Vorschau", icon: "Globe", soon: true },
  {
    id: "theme",
    label: "Erscheinungsbild",
    icon: "Theme",
    to: "/admin/theme",
  },
  {
    id: "admins",
    label: "Administratoren",
    icon: "Vorstand",
    to: "/admin/admins",
  },
  { id: "settings", label: "Einstellungen", icon: "Settings", soon: true },
];

function NavItem({
  entry,
  activePath,
}: {
  entry: NavEntry;
  activePath: string;
}) {
  const IconComponent = Icons[entry.icon];
  // `/admin` is the dashboard root — it must match strictly so it doesn't
  // light up for every nested admin route. Any other entry uses prefix match
  // so deep paths (e.g. /admin/news/42) keep the parent crumb active.
  const active =
    entry.to !== undefined &&
    (entry.to === "/admin"
      ? activePath === "/admin" || activePath === "/admin/"
      : activePath.startsWith(entry.to));

  if (entry.soon) {
    return (
      <button
        type="button"
        disabled
        className="nav-item cursor-not-allowed opacity-50"
        aria-disabled="true"
      >
        <IconComponent className="nav-icon" />
        <span className="flex-1">{entry.label}</span>
        <span className="caps text-[10px]" style={{ color: "var(--ink-4)" }}>
          bald
        </span>
      </button>
    );
  }

  return (
    <NavLink
      to={entry.to!}
      className={`nav-item ${active ? "active" : ""}`.trim()}
      end={entry.to === "/admin"}
    >
      <IconComponent className="nav-icon" />
      <span className="flex-1">{entry.label}</span>
      {entry.count != null && (
        <span
          className="font-mono text-[11px]"
          style={{ color: active ? "var(--paper-3)" : "var(--ink-3)" }}
        >
          {entry.count}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside
      className="sticky top-0 z-10 flex h-screen w-[248px] shrink-0 flex-col"
      style={{
        background: "color-mix(in oklab, var(--paper-2) 70%, transparent)",
        borderRight: "1px solid var(--rule)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Club wordmark */}
      <div className="rule-b px-5 py-5">
        <div className="flex items-center gap-3 select-none">
          <img
            src={logo}
            alt=""
            className="h-9 w-9 rounded-md"
            style={{ boxShadow: "0 0 16px var(--glow)" }}
          />
          <div className="min-w-0 flex-1 leading-tight">
            <div
              className="font-display truncate text-[17px]"
              style={{ letterSpacing: "-0.02em", color: "var(--ink)" }}
              title={CLUB_NAME}
            >
              {CLUB_SHORT}
            </div>
            <div
              className="truncate text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              {CLUB_DOMAIN}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-auto px-3" aria-label="Hauptnavigation">
        <div
          className="caps px-3 pt-4 pb-2 text-[10px]"
          style={{ color: "var(--ink-3)" }}
        >
          Inhalte
        </div>
        <div className="flex flex-col gap-0.5">
          {CONTENT_NAV.map((n) => (
            <NavItem key={n.id} entry={n} activePath={pathname} />
          ))}
        </div>

        <div
          className="caps px-3 pt-5 pb-2 text-[10px]"
          style={{ color: "var(--ink-3)" }}
        >
          Konfiguration
        </div>
        <div className="flex flex-col gap-0.5">
          {CONFIG_NAV.map((n) => (
            <NavItem key={n.id} entry={n} activePath={pathname} />
          ))}
        </div>
      </nav>

      {/* Season card */}
      <div className="rule-t p-3">
        <div
          className="relative overflow-hidden rounded-lg p-3"
          style={{
            background: "var(--paper-3)",
            border: "1px solid var(--rule-2)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 100% 0%, var(--glow), transparent 60%)",
            }}
          />
          <div className="relative flex items-center gap-1.5">
            <span
              className="live-dot h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span
              className="caps text-[10px]"
              style={{ color: "var(--ink-3)" }}
            >
              Saison 2025 / 26
            </span>
          </div>
          <div
            className="font-display relative mt-1 text-[17px] leading-tight"
            style={{ color: "var(--ink)" }}
          >
            Rückrunde läuft
          </div>
          <div
            className="relative mt-0.5 text-[11px]"
            style={{ color: "var(--ink-3)" }}
          >
            Noch Spieltage bis zur Sommerpause.
          </div>
        </div>
        <div
          className="mt-3 flex items-center justify-between px-1 text-[11px]"
          style={{ color: "var(--ink-3)" }}
        >
          <span>admin · svthalexweiler</span>
        </div>
      </div>
    </aside>
  );
}
