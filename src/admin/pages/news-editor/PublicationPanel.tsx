import type { NewsStatus } from "../../types";

export type ScheduleMode = "draft" | "publish-now" | "schedule";

interface Props {
  mode: ScheduleMode;
  onModeChange: (m: ScheduleMode) => void;
  publishAt: string;
  onPublishAtChange: (v: string) => void;
  /** Present when editing a withdrawn article — lets the author keep that state. */
  currentStatus?: NewsStatus;
}

const options: {
  key: ScheduleMode;
  label: string;
  hint: (publishAt: string) => string;
}[] = [
  { key: "draft", label: "Entwurf", hint: () => "Intern sichtbar." },
  {
    key: "schedule",
    label: "Geplant",
    hint: (v) =>
      v
        ? new Date(v).toLocaleString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Zeitpunkt wählen.",
  },
  {
    key: "publish-now",
    label: "Jetzt live",
    hint: () => "Sofort auf der Startseite.",
  },
];

/**
 * Publication-status radio group in the editor's right rail. The datetime
 * input only shows when the author is actually scheduling.
 */
export default function PublicationPanel({
  mode,
  onModeChange,
  publishAt,
  onPublishAtChange,
  currentStatus,
}: Props) {
  return (
    <div className="space-y-3 p-5" data-testid="publication-panel">
      {currentStatus === "withdrawn" && (
        <div
          className="mb-1 rounded-md p-2 text-[11px]"
          style={{
            background: "oklch(0.5 0.15 25 / 0.12)",
            border: "1px solid oklch(0.5 0.15 25 / 0.35)",
            color: "oklch(0.85 0.12 25)",
          }}
          data-testid="publication-withdrawn-notice"
        >
          Dieser Beitrag ist zurückgezogen. Um ihn wieder zu veröffentlichen,
          wähle „Jetzt live" oder plane einen Zeitpunkt.
        </div>
      )}
      {options.map((o) => (
        <label
          key={o.key}
          className="flex cursor-pointer items-start gap-3"
          data-testid={`publication-option-${o.key}`}
        >
          <div
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
            style={{
              border: `1.5px solid ${
                mode === o.key ? "var(--primary)" : "var(--rule-2)"
              }`,
            }}
          >
            {mode === o.key && (
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--primary)" }}
              />
            )}
          </div>
          <input
            type="radio"
            name="publish-mode"
            checked={mode === o.key}
            onChange={() => onModeChange(o.key)}
            className="hidden"
          />
          <div className="flex-1">
            <div className="text-[13px] font-medium">{o.label}</div>
            <div
              className="mt-0.5 text-[11.5px]"
              style={{ color: "var(--ink-3)" }}
            >
              {o.hint(publishAt)}
            </div>
          </div>
        </label>
      ))}
      {mode === "schedule" && (
        <input
          type="datetime-local"
          required
          value={publishAt}
          onChange={(e) => onPublishAtChange(e.target.value)}
          className="cs-input"
          data-testid="publication-datetime"
        />
      )}
    </div>
  );
}
