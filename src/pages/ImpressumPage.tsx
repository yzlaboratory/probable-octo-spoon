import Footer from "../components/Footer";

export default function ImpressumPage() {
  return (
    <div className="flex flex-1 flex-col justify-start overflow-auto">
      <div className="mt-10 flex w-full flex-col gap-14 md:mt-16">
        <header className="flex flex-col gap-3 px-6 md:px-20">
          <h1
            className="section-eyebrow text-[13px] md:text-[14px]"
            style={{ color: "var(--ink-2)" }}
          >
            IMPRESSUM
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-6 px-4 md:grid-cols-3 md:gap-8 md:px-20">
          <section
            className="cs-card flex flex-col gap-2 p-5"
            style={{ color: "var(--ink-2)" }}
          >
            <span
              className="caps text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              Verantwortlich
            </span>
            <p className="text-[14px] leading-[1.6]">
              Yannik Zeyer
              <br />
              Zum Eisresch 36a
              <br />
              66822 Lebach
            </p>
          </section>

          <section
            className="cs-card flex flex-col gap-2 p-5"
            style={{ color: "var(--ink-2)" }}
          >
            <h2
              className="caps text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              KONTAKT
            </h2>
            <p className="text-[14px] leading-[1.6]">
              Telefon: 0151 2222 8048
              <br />
              E-Mail: throwaway.relock977@passinbox.com
            </p>
          </section>

          <section
            className="cs-card flex flex-col gap-2 p-5"
            style={{ color: "var(--ink-2)" }}
          >
            <h2
              className="caps text-[10.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              REDAKTIONELL VERANTWORTLICH
            </h2>
            <p className="text-[14px] leading-[1.6]">Yannik Zeyer</p>
          </section>
        </div>

        <Footer />
      </div>
    </div>
  );
}
