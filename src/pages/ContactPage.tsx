import { useState } from "react";

const CONTACT_EMAIL = "info@svthalexweiler.de";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const subject = `Kontakt von ${name || "Website-Besucher"}`;
    const body = `${message}\n\n— ${name}${email ? ` (${email})` : ""}`;
    const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  return (
    <section style={{ padding: "56px 24px 80px" }}>
      <div
        className="mx-auto w-full max-w-6xl"
        style={{
          display: "grid",
          gap: 48,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(36px, 5vw, 48px)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Kontakt.
          </h1>
          <p
            className="font-serif"
            style={{
              marginTop: 12,
              fontSize: 16,
              color: "var(--p-ink-2)",
              maxWidth: 480,
              lineHeight: 1.5,
            }}
          >
            SV Alemannia Thalexweiler e.V.
            <br />
            Alemaniastraße 21, 66822 Lebach
          </p>

          <div style={{ marginTop: 28, display: "grid", gap: 18, fontSize: 14 }}>
            <div>
              <div
                className="caps"
                style={{
                  fontSize: 10,
                  color: "var(--p-ink-3)",
                  letterSpacing: "0.2em",
                }}
              >
                E-Mail
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                style={{ color: "var(--p-ink)", textDecoration: "none" }}
              >
                {CONTACT_EMAIL}
              </a>
            </div>
            <div>
              <div
                className="caps"
                style={{
                  fontSize: 10,
                  color: "var(--p-ink-3)",
                  letterSpacing: "0.2em",
                }}
              >
                Instagram
              </div>
              <a
                href="https://www.instagram.com/sgthalexweileraschbach/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--p-ink)", textDecoration: "none" }}
              >
                @sgthalexweileraschbach
              </a>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "var(--p-paper-2)",
            border: "1px solid var(--p-rule)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <div
            className="caps"
            style={{
              fontSize: 10,
              color: "var(--p-ink-3)",
              letterSpacing: "0.2em",
              marginBottom: 16,
            }}
          >
            Schreib uns
          </div>

          <label
            style={{ display: "block", marginBottom: 12 }}
            htmlFor="contact-name"
          >
            <span className="sr-only">Name</span>
            <input
              id="contact-name"
              className="p-input"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label
            style={{ display: "block", marginBottom: 12 }}
            htmlFor="contact-email"
          >
            <span className="sr-only">E-Mail</span>
            <input
              id="contact-email"
              className="p-input"
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label
            style={{ display: "block", marginBottom: 16 }}
            htmlFor="contact-message"
          >
            <span className="sr-only">Nachricht</span>
            <textarea
              id="contact-message"
              className="p-input"
              placeholder="Nachricht …"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="p-btn p-btn-primary" style={{ width: "100%" }}>
            Absenden
          </button>
          <p
            style={{
              marginTop: 12,
              fontSize: 11.5,
              color: "var(--p-ink-3)",
            }}
          >
            Beim Absenden öffnet sich Ihr E-Mail-Programm — wir verschicken
            keine Daten ohne Ihr Zutun.
          </p>
        </form>
      </div>
    </section>
  );
}
