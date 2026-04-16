import Footer from "../components/Footer";
import TrainingSection from "../components/TrainingSection";

export default function TrainingPage() {
  return (
    <div className="flex flex-1 flex-col justify-start overflow-auto">
      <div className="mt-8 flex w-full flex-col gap-16 md:mt-16">
        <div className="px-6 text-white md:px-20">
          <h1 className="text-3xl font-black md:text-7xl">TRAINING</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-300 md:text-base">
            Wöchentliche Trainingszeiten der SV Alemannia Thalexweiler. Rufen
            Sie gerne die verantwortliche Trainerin oder den Trainer direkt an,
            bevor Sie zum ersten Mal vorbeikommen.
          </p>
        </div>
        <TrainingSection hideHeading />
        <Footer />
      </div>
    </div>
  );
}
