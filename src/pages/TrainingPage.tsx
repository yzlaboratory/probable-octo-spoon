import Footer from "../components/Footer";
import TrainingSection from "../components/TrainingSection";

export default function TrainingPage() {
  return (
    <div className="flex flex-1 flex-col justify-start overflow-auto">
      <div className="mt-10 flex w-full flex-col gap-14 md:mt-16">
        <header className="flex flex-col gap-3 px-6 md:px-20">
          <h1
            className="section-eyebrow text-[13px] md:text-[14px]"
            style={{ color: "var(--ink-2)" }}
          >
            TRAINING
          </h1>
          <p
            className="max-w-3xl text-[14px] md:text-[15.5px]"
            style={{ color: "var(--ink-2)" }}
          >
            Wöchentliche Trainingszeiten der SV Alemannia Thalexweiler. Rufen
            Sie gerne die verantwortliche Trainerin oder den Trainer direkt an,
            bevor Sie zum ersten Mal vorbeikommen.
          </p>
        </header>
        <TrainingSection hideHeading />
        <Footer />
      </div>
    </div>
  );
}
