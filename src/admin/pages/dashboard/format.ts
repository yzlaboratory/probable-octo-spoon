/**
 * Dashboard date helpers. All formatting is German-locale and timezone-naive
 * (the backend already serves ISO strings; we display as-is).
 */

const MONTHS_DE_LONG = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const MONTHS_DE_SHORT = [
  "JAN",
  "FEB",
  "MRZ",
  "APR",
  "MAI",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OKT",
  "NOV",
  "DEZ",
];

const WEEKDAYS_DE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

/** "Donnerstag, 23. April" */
export function formatLongDate(date: Date): string {
  const wd = WEEKDAYS_DE[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_DE_LONG[date.getMonth()];
  return `${wd}, ${day}. ${month}`;
}

/** "23 · APR" — for the calendar tile in Termine card. */
export function formatDayMonthShort(date: Date): {
  day: string;
  month: string;
} {
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: MONTHS_DE_SHORT[date.getMonth()],
  };
}

/**
 * "Guten Morgen" before 11, "Guten Tag" before 18, otherwise "Guten Abend".
 * Keeps the dashboard greeting time-of-day appropriate.
 */
export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

/**
 * Relative German time string: "gerade eben", "vor 5 Min.", "vor 2 Std.",
 * "vor 3 T.", or the date for anything older than a week.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diffSec = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (diffSec < 60) return "gerade eben";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `vor ${diffHr} Std.`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `vor ${diffDay} T.`;
  return new Date(iso).toISOString().slice(0, 10);
}

/** "23.04." compact day.month for table date columns. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.`;
}
