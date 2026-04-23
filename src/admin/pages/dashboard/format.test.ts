import { describe, expect, it } from "vitest";
import {
  formatDayMonthShort,
  formatLongDate,
  formatShortDate,
  greetingFor,
  relativeTime,
} from "./format";

describe("formatLongDate", () => {
  it("formats a Thursday in April", () => {
    // 2026-04-23 is a Thursday.
    expect(formatLongDate(new Date(2026, 3, 23))).toBe("Donnerstag, 23. April");
  });

  it("formats a Sunday in December", () => {
    // 2025-12-21 is a Sunday.
    expect(formatLongDate(new Date(2025, 11, 21))).toBe(
      "Sonntag, 21. Dezember",
    );
  });
});

describe("formatDayMonthShort", () => {
  it("zero-pads single-digit days", () => {
    expect(formatDayMonthShort(new Date(2026, 4, 3))).toEqual({
      day: "03",
      month: "MAI",
    });
  });

  it("uses the german month abbreviation MRZ for March", () => {
    expect(formatDayMonthShort(new Date(2026, 2, 17))).toEqual({
      day: "17",
      month: "MRZ",
    });
  });
});

describe("greetingFor", () => {
  it("returns Guten Morgen before 11", () => {
    expect(greetingFor(new Date(2026, 3, 23, 8, 0))).toBe("Guten Morgen");
  });

  it("returns Guten Tag at midday", () => {
    expect(greetingFor(new Date(2026, 3, 23, 14, 0))).toBe("Guten Tag");
  });

  it("returns Guten Abend in the evening", () => {
    expect(greetingFor(new Date(2026, 3, 23, 20, 0))).toBe("Guten Abend");
  });

  it("treats 11:00 as Guten Tag (boundary)", () => {
    expect(greetingFor(new Date(2026, 3, 23, 11, 0))).toBe("Guten Tag");
  });

  it("treats 18:00 as Guten Abend (boundary)", () => {
    expect(greetingFor(new Date(2026, 3, 23, 18, 0))).toBe("Guten Abend");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-04-23T12:00:00Z");

  it("'gerade eben' for less than a minute", () => {
    expect(relativeTime("2026-04-23T11:59:30Z", now)).toBe("gerade eben");
  });

  it("'vor X Min.' for sub-hour deltas", () => {
    expect(relativeTime("2026-04-23T11:55:00Z", now)).toBe("vor 5 Min.");
  });

  it("'vor X Std.' for sub-day deltas", () => {
    expect(relativeTime("2026-04-23T08:00:00Z", now)).toBe("vor 4 Std.");
  });

  it("'vor X T.' for sub-week deltas", () => {
    expect(relativeTime("2026-04-20T12:00:00Z", now)).toBe("vor 3 T.");
  });

  it("ISO date for older than a week", () => {
    expect(relativeTime("2026-03-15T12:00:00Z", now)).toBe("2026-03-15");
  });

  it("returns '—' for unparseable input", () => {
    expect(relativeTime("not-a-date", now)).toBe("—");
  });
});

describe("formatShortDate", () => {
  it("returns dd.mm. format", () => {
    expect(formatShortDate("2026-04-23T10:00:00Z")).toBe("23.04.");
  });

  it("returns dash for null/undefined", () => {
    expect(formatShortDate(null)).toBe("—");
    expect(formatShortDate(undefined)).toBe("—");
  });

  it("returns dash for unparseable input", () => {
    expect(formatShortDate("nonsense")).toBe("—");
  });
});
