import Footer from "../components/Footer";

export default function ImpressumPage() {
  return (
    <div className="flex flex-1 flex-col justify-start overflow-auto">
      <div className="mt-8 flex w-full flex-col">
        <div className="m-8 flex flex-col gap-8 text-white md:m-16 md:gap-16">
          <div>
            <h1 className="text-3xl font-black md:text-7xl">IMPRESSUM</h1>
            <p>
              Yannik Zeyer
              <br />
              Zum Eisresch 36a
              <br />
              66822 Lebach
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-black md:text-7xl">KONTAKT</h2>
            <p>
              Telefon: 0151 2222 8048
              <br />
              E-Mail: throwaway.relock977@passinbox.com
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-black md:text-7xl">
              REDAKTIONELL VERANTWORTLICH
            </h2>
            <p>Yannik Zeyer</p>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
