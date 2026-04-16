import { describe, it, expect } from "vitest";
import {
  slotsForDay,
  telHref,
  trainingDaysInOrder,
  trainingSlots,
  seasonalBanner,
  type TrainingVisibility,
} from "../../src/data/training";

const ALLOWED_VISIBILITIES: TrainingVisibility[] = [
  "offen für Gäste",
  "Anmeldung erforderlich",
  "nur Mitglieder",
];

describe("trainingDaysInOrder", () => {
  it("has seven unique days starting with Montag", () => {
    expect(trainingDaysInOrder).toHaveLength(7);
    expect(new Set(trainingDaysInOrder).size).toBe(7);
    expect(trainingDaysInOrder[0]).toBe("Montag");
    expect(trainingDaysInOrder[6]).toBe("Sonntag");
  });
});

describe("trainingSlots schema", () => {
  it("each slot carries the required fields", () => {
    for (const slot of trainingSlots) {
      expect(slot.id).toBeTypeOf("string");
      expect(slot.id.length).toBeGreaterThan(0);
      expect(slot.group.length).toBeGreaterThan(0);
      expect(trainingDaysInOrder).toContain(slot.day);
      expect(slot.timeFrom).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.timeTo).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.trainer.length).toBeGreaterThan(0);
      expect(slot.phone.length).toBeGreaterThan(0);
      expect(ALLOWED_VISIBILITIES).toContain(slot.visibility);
    }
  });

  it("each slot's timeFrom is strictly before timeTo", () => {
    for (const slot of trainingSlots) {
      expect(slot.timeFrom < slot.timeTo, `${slot.id}: ${slot.timeFrom} < ${slot.timeTo}`).toBe(true);
    }
  });

  it("slot ids are unique", () => {
    const ids = trainingSlots.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the AH slot marked as 'offen für Gäste' per spec", () => {
    const ah = trainingSlots.find((s) => /alte herren|^ah\b/i.test(s.group));
    expect(ah, "AH slot present").toBeDefined();
    expect(ah!.visibility).toBe("offen für Gäste");
  });
});

describe("slotsForDay", () => {
  it("only returns slots for the requested day", () => {
    for (const day of trainingDaysInOrder) {
      const slots = slotsForDay(day);
      for (const slot of slots) expect(slot.day).toBe(day);
    }
  });

  it("returns slots sorted by timeFrom ascending", () => {
    for (const day of trainingDaysInOrder) {
      const slots = slotsForDay(day);
      for (let i = 1; i < slots.length; i++) {
        expect(slots[i - 1].timeFrom <= slots[i].timeFrom).toBe(true);
      }
    }
  });

  it("total slot count across all days equals trainingSlots.length", () => {
    const total = trainingDaysInOrder.reduce(
      (acc, d) => acc + slotsForDay(d).length,
      0,
    );
    expect(total).toBe(trainingSlots.length);
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

describe("seasonalBanner", () => {
  it("is either null or a non-empty string", () => {
    if (seasonalBanner.message !== null) {
      expect(typeof seasonalBanner.message).toBe("string");
      expect(seasonalBanner.message!.length).toBeGreaterThan(0);
    }
  });
});
