import { describe, it, expect } from "vitest";
import {
  slotsForDay,
  telHref,
  trainingDaysInOrder,
  type TrainingSlot,
} from "../../src/data/training";

const SAMPLE: TrainingSlot[] = [
  {
    id: 1,
    group: "Bambini",
    day: "Dienstag",
    timeFrom: "17:00",
    timeTo: "18:00",
    trainer: "A",
    phone: "0151 1",
    visibility: "offen für Gäste",
  },
  {
    id: 2,
    group: "Herren",
    day: "Dienstag",
    timeFrom: "19:00",
    timeTo: "20:30",
    trainer: "B",
    phone: "0151 2",
    visibility: "nur Mitglieder",
  },
  {
    id: 3,
    group: "AH",
    day: "Freitag",
    timeFrom: "19:30",
    timeTo: "21:00",
    trainer: "C",
    phone: "0151 3",
    visibility: "offen für Gäste",
  },
];

describe("trainingDaysInOrder", () => {
  it("has seven unique days starting with Montag", () => {
    expect(trainingDaysInOrder).toHaveLength(7);
    expect(new Set(trainingDaysInOrder).size).toBe(7);
    expect(trainingDaysInOrder[0]).toBe("Montag");
    expect(trainingDaysInOrder[6]).toBe("Sonntag");
  });
});

describe("slotsForDay", () => {
  it("only returns slots for the requested day", () => {
    for (const day of trainingDaysInOrder) {
      const slots = slotsForDay(SAMPLE, day);
      for (const slot of slots) expect(slot.day).toBe(day);
    }
  });

  it("returns slots sorted by timeFrom ascending", () => {
    const slots = slotsForDay(SAMPLE, "Dienstag");
    expect(slots.map((s) => s.timeFrom)).toEqual(["17:00", "19:00"]);
  });

  it("total slot count across all days equals input length", () => {
    const total = trainingDaysInOrder.reduce(
      (acc, d) => acc + slotsForDay(SAMPLE, d).length,
      0,
    );
    expect(total).toBe(SAMPLE.length);
  });

  it("returns empty array on empty input", () => {
    expect(slotsForDay([], "Montag")).toEqual([]);
  });
});

describe("telHref", () => {
  it("strips whitespace and prefixes with tel:", () => {
    expect(telHref("0151 2222 8048")).toBe("tel:015122228048");
    expect(telHref("+49 151 00 00 0000")).toBe("tel:+4915100000000");
  });

  it("returns tel: on empty phone without crashing", () => {
    expect(telHref("")).toBe("tel:");
  });
});
