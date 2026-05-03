// Public types + small pure helpers for the training schedule. The actual
// slots and the seasonal banner are admin-edited and fetched at runtime
// from /api/training/public — see components/TrainingSection.tsx.

export type TrainingVisibility =
  | "offen für Gäste"
  | "Anmeldung erforderlich"
  | "nur Mitglieder";

export type TrainingDay =
  | "Montag"
  | "Dienstag"
  | "Mittwoch"
  | "Donnerstag"
  | "Freitag"
  | "Samstag"
  | "Sonntag";

export interface TrainingSlot {
  id: number;
  group: string;
  day: TrainingDay;
  timeFrom: string; // "HH:MM"
  timeTo: string; // "HH:MM"
  trainer: string;
  phone: string;
  visibility: TrainingVisibility;
}

export interface SeasonalBanner {
  message: string | null;
}

export const trainingDaysInOrder: TrainingDay[] = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export function slotsForDay(
  slots: TrainingSlot[],
  day: TrainingDay,
): TrainingSlot[] {
  return slots
    .filter((slot) => slot.day === day)
    .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}
