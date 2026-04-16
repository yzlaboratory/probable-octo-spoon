import Frontpageheader from "./Frontpageheader";
import {
  seasonalBanner,
  slotsForDay,
  telHref,
  trainingDaysInOrder,
  type TrainingSlot,
  type TrainingVisibility,
} from "../data/training";

function visibilityChipClasses(visibility: TrainingVisibility): string {
  switch (visibility) {
    case "offen für Gäste":
      return "bg-emerald-900/60 text-emerald-200 border border-emerald-700/50";
    case "Anmeldung erforderlich":
      return "bg-amber-900/60 text-amber-200 border border-amber-700/50";
    case "nur Mitglieder":
      return "bg-zinc-800 text-zinc-300 border border-zinc-700";
  }
}

function SlotCard({ slot }: { slot: TrainingSlot }) {
  return (
    <div
      className="trainingslot bg-dark-gray-700 relative flex flex-col gap-2 p-4 text-sm text-white"
      data-visibility={slot.visibility}
    >
      <div className="flex flex-row items-center gap-2">
        <div className="bg-primary h-3 w-10" />
        <span className="font-mono text-xs text-gray-300">
          {slot.timeFrom}–{slot.timeTo}
        </span>
      </div>
      <h3 className="text-base font-semibold">{slot.group}</h3>
      <div className="flex flex-col gap-1 text-xs text-gray-300">
        <span>Trainer: {slot.trainer}</span>
        <a
          href={telHref(slot.phone)}
          className="hover:text-primary underline-offset-2 hover:underline"
        >
          {slot.phone}
        </a>
      </div>
      <span
        className={`mt-2 inline-block w-max rounded-full px-3 py-1 text-[11px] ${visibilityChipClasses(slot.visibility)}`}
      >
        {slot.visibility}
      </span>
    </div>
  );
}

interface Props {
  /** When true the section omits its own heading (used by the /training page that has its own). */
  hideHeading?: boolean;
}

export default function TrainingSection({ hideHeading = false }: Props) {
  return (
    <section className="trainingsection flex w-full flex-col">
      {!hideHeading && <Frontpageheader text="TRAINING" />}

      {seasonalBanner.message && (
        <div
          className="trainingbanner mx-4 mb-6 rounded border border-amber-700/50 bg-amber-900/30 p-3 text-sm text-amber-100 md:mx-20"
          role="status"
        >
          {seasonalBanner.message}
        </div>
      )}

      <div className="hidescrollbar flex w-full flex-row overflow-x-auto px-4 md:px-20">
        <div className="grid w-full min-w-[56rem] grid-cols-7 gap-2">
          {trainingDaysInOrder.map((day) => {
            const slots = slotsForDay(day);
            return (
              <div
                key={day}
                className="trainingday flex flex-col gap-2"
                data-day={day}
              >
                <h2 className="sticky top-0 z-1 bg-background py-2 text-center text-xs font-bold tracking-widest text-white uppercase">
                  {day}
                </h2>
                {slots.length === 0 ? (
                  <div className="text-center text-xs text-gray-500">—</div>
                ) : (
                  slots.map((slot) => <SlotCard key={slot.id} slot={slot} />)
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
