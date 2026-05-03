import { Link } from "react-router-dom";

export default function PublicFooter() {
  return (
    <footer
      className="public-footer"
      style={{
        background: "var(--p-primary)",
        color: "#e8e4d6",
        marginTop: 80,
      }}
    >
      <div
        className="mx-auto w-full max-w-6xl px-6 py-10"
        style={{ display: "grid", gap: 32, gridTemplateColumns: "1fr" }}
      >
        <div
          className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between"
          style={{ borderBottom: "1px solid rgba(244,238,226,0.15)", paddingBottom: 28 }}
        >
          <div>
            <div
              className="font-display"
              style={{
                fontSize: 22,
                color: "#fff",
                letterSpacing: "-0.02em",
                marginBottom: 6,
              }}
            >
              SV Alemannia Thalexweiler e.V.
            </div>
            <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.6 }}>
              Alemaniastraße 21
              <br />
              66822 Lebach
              <br />
              gegründet 1947
            </div>
          </div>

          <nav
            aria-label="Footer-Navigation"
            style={{
              display: "grid",
              gridAutoFlow: "row",
              gap: 8,
              fontSize: 13,
              minWidth: 200,
            }}
          >
            <span
              className="caps"
              style={{
                fontSize: 10,
                opacity: 0.6,
                letterSpacing: "0.2em",
                marginBottom: 4,
              }}
            >
              Verein
            </span>
            <Link to="/team" style={footerLink}>
              Mannschaften
            </Link>
            <Link to="/spiele" style={footerLink}>
              Spielplan
            </Link>
            <Link to="/training" style={footerLink}>
              Training
            </Link>
            <Link to="/sponsors" style={footerLink}>
              Sponsoren
            </Link>
          </nav>

          <nav
            aria-label="Rechtliches"
            style={{
              display: "grid",
              gridAutoFlow: "row",
              gap: 8,
              fontSize: 13,
              minWidth: 200,
            }}
          >
            <span
              className="caps"
              style={{
                fontSize: 10,
                opacity: 0.6,
                letterSpacing: "0.2em",
                marginBottom: 4,
              }}
            >
              Rechtliches
            </span>
            <Link to="/Impressum" style={footerLink}>
              Impressum
            </Link>
            <Link to="/Datenschutzerklaerung" style={footerLink}>
              Datenschutz
            </Link>
            <a
              href="https://www.instagram.com/sgthalexweileraschbach/"
              style={footerLink}
              rel="noopener noreferrer"
              target="_blank"
            >
              Instagram
            </a>
            <Link to="/contact" style={footerLink}>
              Kontakt
            </Link>
          </nav>
        </div>

        <div
          className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
          style={{ fontSize: 11.5, opacity: 0.7 }}
        >
          <span>© {new Date().getFullYear()} SV Alemannia Thalexweiler</span>
          <span className="caps" style={{ letterSpacing: "0.2em" }}>
            Mitglied im SFV
          </span>
        </div>
      </div>
    </footer>
  );
}

const footerLink: React.CSSProperties = {
  color: "#e8e4d6",
  opacity: 0.85,
  textDecoration: "none",
};
