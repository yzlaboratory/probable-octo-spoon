import { useMemo } from "react";
import { Link } from "react-router-dom";
import { shuffleSponsors } from "../utilities/sponsors";
import logo from "../assets/logo.svg";

export default function Footer() {
  const sponsors = useMemo(() => shuffleSponsors(), []);
  return (
    <div className="from-background to-dark-gray-750 border-b-primary flex min-h-[var(--container-2xl)] w-full max-w-full flex-col justify-end gap-8 border-b-8 bg-linear-to-b p-4 pb-8 text-lg text-neutral-400 lg:gap-16 lg:p-16">
      <div className="allsponsors flex w-full flex-row flex-wrap justify-center gap-3 lg:justify-start lg:gap-6">
        {sponsors.map((sponsor, index) => {
          if (sponsor.ImageUrl !== logo) {
            return (
              <div
                key={index}
                className="flex w-24 items-center justify-center rounded-xl border-[1px] border-solid border-zinc-300 px-2 py-2 lg:w-max lg:px-4"
              >
                <img
                  src={sponsor.ImageUrl}
                  alt="Portrait"
                  className={`h-6 w-max object-contain lg:h-12 ${
                    sponsor.hasBackground
                      ? "grayscale"
                      : "brightness-0 invert"
                  }`}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
      <div className="informationcontainer flex flex-col items-center text-xs font-bold uppercase lg:items-start lg:text-base">
        <div>SV Alemannia Thalexweiler</div>
        <div>Alemaniastra&szlig;e 21</div>
        <div>66822 Lebach</div>
      </div>
      <div className="flex w-full flex-col flex-wrap items-center gap-8 text-xs font-bold uppercase lg:flex-row lg:items-start lg:gap-8 lg:text-base">
        <div>&copy; 2025 SV Thalexweiler</div>
        <div className="flex flex-row flex-wrap items-center justify-center gap-2 text-xs font-bold lg:items-start lg:gap-8 lg:text-base">
          <Link to="/">Startseite</Link>
          <a
            className="h-max"
            href="https://www.instagram.com/sgthalexweileraschbach/"
          >
            Instagram
          </a>
          <Link to="/Impressum">Impressum</Link>
          <Link to="/Datenschutzerklaerung">Datenschutzerkl&auml;rung</Link>
        </div>
      </div>
    </div>
  );
}
