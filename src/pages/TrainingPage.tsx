import {
  seasonalBanner,
  slotsForDay,
  telHref,
  trainingDaysInOrder,
  type TrainingSlot,
  type TrainingVisibility,
} from "../data/training";

function visibilityStyle(v: TrainingVisibility): React.CSSProperties {
  switch (v) {
    case "offen für Gäste":
      return {
        background: "rgba(31, 58, 46, 0.1)",
        color: "var(--p-primary)",
        border: "1px solid rgba(31, 58, 46, 0.25)",
      };
    case "Anmeldung erforderlich":
      return {
        background: "rgba(181, 64, 27, 0.08)",
        color: "var(--p-accent)",
        border: "1px solid rgba(181, 64, 27, 0.25)",
      };
    case "nur Mitglieder":
      return {
        background: "var(--p-paper-2)",
        color: "var(--p-ink-3)",
        border: "1px solid var(--p-rule)",
      };
  }
}

function SlotCard({ slot }: { slot: TrainingSlot }) {
  return (
    <div
      data-visibility={slot.visibility}
      style={{
        padding: 14,
        borderRadius: 6,
        background: "var(--p-paper-2)",
        border: "1px solid var(--p-rule)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 12,
          color: "var(--p-ink-2)",
          letterSpacing: "0.02em",
        }}
      >
        {slot.timeFrom}–{slot.timeTo}
      </span>
      <span
        className="font-display"
        style={{ fontSize: 17, letterSpacing: "-0.01em", lineHeight: 1.2 }}
      >
        {slot.group}
      </span>
      <span style={{ fontSize: 12, color: "var(--p-ink-2)" }}>
        Trainer: {slot.trainer}
      </span>
      <a
        href={telHref(slot.phone)}
        style={{
          fontSize: 12,
          color: "var(--p-ink-2)",
          textDecoration: "underline dotted",
          textUnderlineOffset: 3,
        }}
      >
        {slot.phone}
      </a>
      <span
        className="caps"
        style={{
          marginTop: 4,
          alignSelf: "flex-start",
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: 9.5,
          letterSpacing: "0.18em",
          ...visibilityStyle(slot.visibility),
        }}
      >
        {slot.visibility}
      </span>
    </div>
  );
}

export default function TrainingPage() {
  return (
    <section style={{ padding: "56px 24px 80px" }}>
      <div className="mx-auto w-full max-w-6xl">
        <div
          className="caps"
          style={{
            fontSize: 10.5,
            color: "var(--p-accent)",
            letterSpacing: "0.2em",
            marginBottom: 12,
          }}
        >
          Wochenplan
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(36px, 5vw, 48px)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Training.
        </h1>
        <p
          className="font-serif"
          style={{
            marginTop: 12,
            fontSize: 16,
            color: "var(--p-ink-2)",
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          Wöchentliche Trainingszeiten der SV Alemannia Thalexweiler. Rufen Sie
          gerne die verantwortliche Trainerin oder den Trainer direkt an, bevor
          Sie zum ersten Mal vorbeikommen.
        </p>

        {seasonalBanner.message && (
          <div
            role="status"
            style={{
              marginTop: 24,
              padding: 14,
              borderRadius: 6,
              background: "rgba(181, 64, 27, 0.08)",
              border: "1px solid rgba(181, 64, 27, 0.25)",
              color: "var(--p-accent)",
              fontSize: 13.5,
            }}
          >
            {seasonalBanner.message}
          </div>
        )}

        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {trainingDaysInOrder.map((day) => {
            const slots = slotsForDay(day);
            return (
              <div
                key={day}
                data-day={day}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <h2
                  className="caps"
                  style={{
                    fontSize: 11,
                    color: "var(--p-ink-3)",
                    letterSpacing: "0.2em",
                    margin: 0,
                    paddingBottom: 6,
                    borderBottom: "1px solid var(--p-rule)",
                  }}
                >
                  {day}
                </h2>
                {slots.length === 0 ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--p-ink-4)",
                      textAlign: "center",
                      padding: "8px 0",
                    }}
                  >
                    —
                  </span>
                ) : (
                  slots.map((s) => <SlotCard key={s.id} slot={s} />)
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
