// Temporäre hardgecodete Trainingsdaten.
// Per specs/planned/training-times.md MVP: "If the data source can't be
// admin-editable yet, ship it as a hardcoded list and treat that as a
// temporary state." Ersetzen, sobald der Admin-Editor (planned/admin-*) live ist.

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
  id: string;
  group: string;
  day: TrainingDay;
  timeFrom: string; // "HH:MM"
  timeTo: string; // "HH:MM"
  trainer: string;
  phone: string; // display + tel: link
  visibility: TrainingVisibility;
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

// PLATZHALTER — echte Zeiten bitte vom Geschäftsführer einsetzen.
// AH-Eintrag bleibt auf "offen für Gäste" per spec-Anweisung.
export const trainingSlots: TrainingSlot[] = [
  {
    id: "bambini-di",
    group: "Bambini (U7)",
    day: "Dienstag",
    timeFrom: "17:00",
    timeTo: "18:00",
    trainer: "N.N.",
    phone: "0151 0000 0000",
    visibility: "offen für Gäste",
  },
  {
    id: "f-jugend-mi",
    group: "F-Jugend (U9)",
    day: "Mittwoch",
    timeFrom: "17:00",
    timeTo: "18:30",
    trainer: "N.N.",
    phone: "0151 0000 0000",
    visibility: "Anmeldung erforderlich",
  },
  {
    id: "herren-di",
    group: "Herrenmannschaft",
    day: "Dienstag",
    timeFrom: "19:00",
    timeTo: "20:30",
    trainer: "N.N.",
    phone: "0151 0000 0000",
    visibility: "nur Mitglieder",
  },
  {
    id: "herren-do",
    group: "Herrenmannschaft",
    day: "Donnerstag",
    timeFrom: "19:00",
    timeTo: "20:30",
    trainer: "N.N.",
    phone: "0151 0000 0000",
    visibility: "nur Mitglieder",
  },
  {
    id: "ah-fr",
    group: "Alte Herren",
    day: "Freitag",
    timeFrom: "19:30",
    timeTo: "21:00",
    trainer: "N.N.",
    phone: "0151 0000 0000",
    visibility: "offen für Gäste",
  },
];

export interface SeasonalBanner {
  // null = no banner; a non-empty string shows above the grid.
  message: string | null;
}

export const seasonalBanner: SeasonalBanner = {
  message: null,
};

export function slotsForDay(day: TrainingDay): TrainingSlot[] {
  return trainingSlots
    .filter((slot) => slot.day === day)
    .sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}
