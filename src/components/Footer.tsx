import { useMemo } from "react";
import { Link } from "react-router-dom";
import { shuffleSponsors, usePublicSponsors } from "../utilities/publicData";
import logo from "../assets/logo.svg";

export default function Footer() {
  const allSponsors = usePublicSponsors();
  const sponsors = useMemo(
    () => (allSponsors ? shuffleSponsors(allSponsors) : []),
    [allSponsors],
  );
  return (
    <footer
      className="rule-t mt-20 flex w-full flex-col gap-10 px-6 pt-12 pb-10 md:gap-14 md:px-20 md:pt-16"
      style={{
        background:
          "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--paper-2) 80%, transparent))",
        color: "var(--ink-2)",
      }}
    >
      <div className="flex flex-col gap-3">
        <span className="caps text-[10.5px]" style={{ color: "var(--ink-3)" }}>
          Partner & Förderer
        </span>
        <div className="allsponsors flex w-full flex-row flex-wrap justify-start gap-2 md:gap-3">
          {sponsors.map((sponsor, index) => {
            if (sponsor.ImageUrl !== logo) {
              return (
                <div
                  key={index}
                  className="flex w-24 items-center justify-center rounded-md px-3 py-2 transition-colors duration-200 lg:w-max lg:px-4 lg:py-3"
                  style={{
                    background: "var(--paper-2)",
                    border: "1px solid var(--rule)",
                  }}
                >
                  <img
                    src={sponsor.ImageUrl}
                    alt="Portrait"
                    className={`h-5 w-max object-contain lg:h-9 ${
                      sponsor.hasBackground
                        ? "grayscale"
                        : "opacity-80 brightness-0 invert"
                    }`}
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="cs-focus inline-flex items-center gap-2.5 select-none"
            style={{ color: "var(--ink)" }}
          >
            <img
              src={logo}
              alt=""
              className="h-8 w-8 rounded-md"
              style={{ boxShadow: "0 0 14px var(--glow)" }}
            />
            <span className="flex flex-col leading-[1.05]">
              <span className="text-[12px] font-semibold tracking-[0.04em]">
                SVALEMANNIA
              </span>
              <span
                className="text-[10px] tracking-[0.18em]"
                style={{ color: "var(--ink-3)" }}
              >
                THALEXWEILER
              </span>
            </span>
          </Link>
          <p
            className="text-[12.5px] leading-[1.55]"
            style={{ color: "var(--ink-3)" }}
          >
            Der Sportverein für Thalexweiler — seit Generationen.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span
            className="caps text-[10.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            Adresse
          </span>
          <div
            className="informationcontainer flex flex-col text-[13px] leading-[1.6]"
            style={{ color: "var(--ink-2)" }}
          >
            <span>SV Alemannia Thalexweiler</span>
            <span>Alemaniastra&szlig;e 21</span>
            <span>66822 Lebach</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span
            className="caps text-[10.5px]"
            style={{ color: "var(--ink-3)" }}
          >
            Navigation
          </span>
          <nav
            className="flex flex-col text-[13px] leading-[1.8]"
            aria-label="Footer-Navigation"
          >
            <Link
              to="/"
              className="cs-focus hover:underline"
              style={{ color: "var(--ink-2)" }}
            >
              Startseite
            </Link>
            <Link
              to="/spiele"
              className="cs-focus hover:underline"
              style={{ color: "var(--ink-2)" }}
            >
              Spiele
            </Link>
            <Link
              to="/training"
              className="cs-focus hover:underline"
              style={{ color: "var(--ink-2)" }}
            >
              Training
            </Link>
            <a
              className="cs-focus hover:underline"
              href="https://www.instagram.com/sgthalexweileraschbach/"
              style={{ color: "var(--ink-2)" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            <Link
              to="/Impressum"
              className="cs-focus hover:underline"
              style={{ color: "var(--ink-2)" }}
            >
              Impressum
            </Link>
            <Link
              to="/Datenschutzerklaerung"
              className="cs-focus hover:underline"
              style={{ color: "var(--ink-2)" }}
            >
              Datenschutzerkl&auml;rung
            </Link>
          </nav>
        </div>
      </div>

      <div
        className="rule-t flex flex-col items-start justify-between gap-2 pt-6 text-[11px] md:flex-row md:items-center"
        style={{ color: "var(--ink-3)" }}
      >
        <span>&copy; 2025 SV Thalexweiler</span>
        <span className="font-mono">svthalexweiler.de</span>
      </div>
    </footer>
  );
}
