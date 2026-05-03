export default function ImpressumPage() {
  return (
    <article
      className="mx-auto"
      style={{ maxWidth: 720, padding: "56px 24px 80px" }}
    >
      <div
        className="caps"
        style={{
          fontSize: 10.5,
          color: "var(--p-accent)",
          letterSpacing: "0.2em",
          marginBottom: 12,
        }}
      >
        Rechtliches
      </div>
      <h1
        className="font-display"
        style={{
          fontSize: "clamp(36px, 5vw, 48px)",
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        Impressum.
      </h1>

      <div
        className="font-serif"
        style={{
          marginTop: 32,
          fontSize: 16,
          lineHeight: 1.65,
          color: "var(--p-ink)",
          display: "grid",
          gap: 28,
        }}
      >
        <section>
          <h2
            className="caps"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.2em",
              color: "var(--p-ink-3)",
              margin: 0,
              marginBottom: 6,
            }}
          >
            Anbieter
          </h2>
          <p style={{ margin: 0 }}>
            Yannik Zeyer
            <br />
            Zum Eisresch 36a
            <br />
            66822 Lebach
          </p>
        </section>

        <section>
          <h2
            className="caps"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.2em",
              color: "var(--p-ink-3)",
              margin: 0,
              marginBottom: 6,
            }}
          >
            Kontakt
          </h2>
          <p style={{ margin: 0 }}>
            Telefon: 0151 2222 8048
            <br />
            E-Mail: throwaway.relock977@passinbox.com
          </p>
        </section>

        <section>
          <h2
            className="caps"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.2em",
              color: "var(--p-ink-3)",
              margin: 0,
              marginBottom: 6,
            }}
          >
            Redaktionell verantwortlich
          </h2>
          <p style={{ margin: 0 }}>Yannik Zeyer</p>
        </section>
      </div>
    </article>
  );
}
