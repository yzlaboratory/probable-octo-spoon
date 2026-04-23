import { Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import * as Icons from "../ui/Icons";
import { breadcrumbsFor } from "./breadcrumbs";

function initials(email: string): string {
  // Use the local-part of the email — initials of the first two word-ish
  // chunks. Keeps the glyph short and readable for a wide range of addresses.
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[^a-z0-9]+/i).filter(Boolean);
  if (parts.length === 0) return email.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Topbar() {
  const { admin, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const crumbs = breadcrumbsFor(pathname);

  async function onLogout() {
    await logout();
    nav("/admin/login", { replace: true });
  }

  return (
    <header
      className="h-[60px] sticky top-0 z-20 flex items-center px-8 gap-6 rule-b"
      style={{
        background: "color-mix(in oklab, var(--paper) 70%, transparent)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Breadcrumbs */}
      <div
        className="flex items-center gap-2 text-[13px] min-w-0"
        style={{ color: "var(--ink-3)" }}
        aria-label="Breadcrumb"
      >
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span style={{ color: "var(--ink-4)" }} aria-hidden="true">
                /
              </span>
            )}
            <span
              className="truncate"
              style={{
                color:
                  i === crumbs.length - 1 ? "var(--ink)" : "var(--ink-3)",
              }}
            >
              {c}
            </span>
          </Fragment>
        ))}
      </div>

      <div className="flex-1" />

      {/* Stub search — ⌘K handler can land in a later phase */}
      <label
        className="hidden md:flex items-center gap-2 w-[260px] h-9 px-3 rounded-md cursor-text"
        style={{
          background: "var(--paper-2)",
          border: "1px solid var(--rule)",
        }}
      >
        <Icons.Search size={14} stroke="var(--ink-3)" />
        <input
          type="search"
          placeholder="Suchen…"
          className="flex-1 bg-transparent outline-none text-[12.5px]"
          style={{ color: "var(--ink)" }}
        />
        <kbd>⌘K</kbd>
      </label>

      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden lg:inline-flex items-center gap-1.5 text-[12.5px] cs-focus"
        style={{ color: "var(--ink-2)" }}
      >
        <Icons.External size={13} />
        Website ansehen
      </a>

      <div className="hidden md:block w-px h-5" style={{ background: "var(--rule-2)" }} />

      <button type="button" className="relative cs-focus" aria-label="Benachrichtigungen">
        <Icons.Bell size={17} stroke="var(--ink-2)" />
        <span
          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--accent)" }}
        />
      </button>

      {/* Avatar + logout */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-[11px]"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--tertiary))",
            color: "#fff",
          }}
          title={admin?.email ?? ""}
          aria-hidden="true"
        >
          {admin ? initials(admin.email) : "··"}
        </div>
        <div className="hidden lg:block leading-tight max-w-[160px]">
          <div
            className="text-[12.5px] font-medium truncate"
            style={{ color: "var(--ink)" }}
          >
            {admin?.email ?? ""}
          </div>
          <div
            className="text-[10.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            Redakteur
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="btn-ghost cs-focus ml-1 h-8 px-3 rounded-md text-[12px] font-medium"
          style={{ borderRadius: 8 }}
        >
          Abmelden
        </button>
      </div>
    </header>
  );
}
