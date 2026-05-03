import { Link, NavLink } from "react-router-dom";
import logo from "../assets/logo.svg";
import iglogo from "../assets/instagramwhite.svg";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Start", end: true },
  { to: "/spiele", label: "Spiele" },
  { to: "/training", label: "Training" },
];

export default function Header() {
  return (
    <header
      className="sticky top-0 z-30 w-full"
      style={{
        background: "color-mix(in oklab, var(--paper) 75%, transparent)",
        borderBottom: "1px solid var(--rule)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 md:px-8 lg:gap-8">
        {/* Wordmark */}
        <Link
          to="/"
          className="cs-focus flex items-center gap-3 select-none"
          style={{ color: "var(--ink)" }}
        >
          <img
            src={logo}
            alt="Club Logo."
            width="36"
            height="36"
            className="h-9 w-9 rounded-md"
            style={{ boxShadow: "0 0 18px var(--glow)" }}
          />
          <div className="flex flex-col leading-[1.05]">
            <span
              className="text-[12px] font-semibold tracking-[0.04em] md:text-[13px]"
              style={{ color: "var(--ink)" }}
            >
              SVALEMANNIA
            </span>
            <span
              className="text-[10px] tracking-[0.18em] md:text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              THALEXWEILER
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden flex-1 items-center gap-1 md:flex"
          aria-label="Hauptnavigation"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `navlink cs-focus ${isActive ? "active" : ""}`.trim()
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none md:gap-3">
          <a
            href="https://www.instagram.com/sgthalexweileraschbach/"
            target="_blank"
            rel="noopener noreferrer"
            className="cs-focus inline-flex h-9 w-9 items-center justify-center rounded-md"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--rule-2)",
            }}
            aria-label="Instagram"
          >
            <img src={iglogo} alt="" className="h-4 w-4" />
          </a>
          <Link
            to="/admin"
            className="btn-ghost cs-focus hidden h-9 items-center rounded-md px-4 text-[12.5px] font-medium lg:inline-flex"
          >
            LOGIN
          </Link>
        </div>
      </div>

      {/* Mobile nav row */}
      <nav
        className="flex w-full items-center gap-1 overflow-x-auto px-3 pb-2 md:hidden"
        aria-label="Hauptnavigation"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `navlink cs-focus shrink-0 ${isActive ? "active" : ""}`.trim()
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
