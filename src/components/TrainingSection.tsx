import Frontpageheader from "./Frontpageheader";
import {
  seasonalBanner,
  slotsForDay,
  telHref,
  trainingDaysInOrder,
  type TrainingSlot,
  type TrainingVisibility,
} from "../data/training";

interface ChipSpec {
  bg: string;
  fg: string;
  border: string;
  dot: string;
}

const VISIBILITY_TONE: Record<TrainingVisibility, ChipSpec> = {
  "offen für Gäste": {
    bg: "oklch(0.6 0.18 150 / 0.15)",
    fg: "oklch(0.85 0.15 150)",
    border: "oklch(0.6 0.18 150 / 0.4)",
    dot: "oklch(0.7 0.18 150)",
  },
  "Anmeldung erforderlich": {
    bg: "oklch(0.78 0.16 85 / 0.15)",
    fg: "oklch(0.86 0.14 85)",
    border: "oklch(0.6 0.16 85 / 0.4)",
    dot: "var(--warn)",
  },
  "nur Mitglieder": {
    bg: "var(--paper-3)",
    fg: "var(--ink-2)",
    border: "var(--rule-2)",
    dot: "var(--ink-3)",
  },
};

function VisibilityChip({ value }: { value: TrainingVisibility }) {
  const t = VISIBILITY_TONE[value];
  return (
    <span
      className="chip mt-1"
      style={{
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
      }}
    >
      <span className="chip-dot" style={{ background: t.dot }} />
      {value}
    </span>
  );
}

function SlotCard({ slot }: { slot: TrainingSlot }) {
  return (
    <div
      className="trainingslot cs-tile relative flex flex-col gap-2 p-4"
      data-visibility={slot.visibility}
    >
      <div className="flex items-center gap-2">
        <span
          className="font-mono text-[11.5px]"
          style={{ color: "var(--ink-2)" }}
        >
          {slot.timeFrom}–{slot.timeTo}
        </span>
      </div>
      <h3
        className="font-display text-[15px] leading-tight"
        style={{ letterSpacing: "-0.01em", color: "var(--ink)" }}
      >
        {slot.group}
      </h3>
      <div
        className="flex flex-col gap-0.5 text-[11.5px]"
        style={{ color: "var(--ink-3)" }}
      >
        <span>Trainer: {slot.trainer}</span>
        <a
          href={telHref(slot.phone)}
          className="cs-focus underline-offset-2 hover:underline"
          style={{ color: "var(--ink-2)" }}
        >
          {slot.phone}
        </a>
      </div>
      <VisibilityChip value={slot.visibility} />
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
          className="trainingbanner mx-4 mb-6 flex items-start gap-2 rounded-md p-3 text-[13px] md:mx-20"
          role="status"
          style={{
            background: "oklch(0.5 0.16 85 / 0.12)",
            border: "1px solid oklch(0.6 0.16 85 / 0.35)",
            color: "oklch(0.88 0.13 85)",
          }}
        >
          <span
            className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "var(--warn)" }}
          />
          <span>{seasonalBanner.message}</span>
        </div>
      )}

      <div className="hidescrollbar flex w-full flex-row overflow-x-auto px-4 md:px-20">
        <div className="grid w-full min-w-[56rem] grid-cols-7 gap-3">
          {trainingDaysInOrder.map((day) => {
            const slots = slotsForDay(day);
            return (
              <div
                key={day}
                className="trainingday flex flex-col gap-2"
                data-day={day}
              >
                <h2
                  className="caps sticky top-0 z-1 py-2 text-center text-[10.5px]"
                  style={{
                    background:
                      "color-mix(in oklab, var(--paper) 88%, transparent)",
                    color: "var(--ink-3)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {day}
                </h2>
                {slots.length === 0 ? (
                  <div
                    className="rounded-md border border-dashed py-3 text-center text-[11px]"
                    style={{
                      borderColor: "var(--rule)",
                      color: "var(--ink-4)",
                    }}
                  >
                    —
                  </div>
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
