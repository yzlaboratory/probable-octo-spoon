import { describe, it, expect } from "vitest";
import { sponsorJSON } from "../../src/utilities/sponsors";

describe("sponsorJSON", () => {
  it("exports a non-empty sponsors array", () => {
    expect(Array.isArray(sponsorJSON.sponsors)).toBe(true);
    expect(sponsorJSON.sponsors.length).toBeGreaterThan(0);
  });

  it("each sponsor has required fields", () => {
    for (const sponsor of sponsorJSON.sponsors) {
      expect(sponsor).toHaveProperty("Name");
      expect(sponsor).toHaveProperty("Title");
      expect(sponsor).toHaveProperty("ImageUrl");
      expect(sponsor).toHaveProperty("Link");

      expect(typeof sponsor.Name).toBe("string");
      expect(sponsor.Name.length).toBeGreaterThan(0);
      expect(typeof sponsor.Link).toBe("string");
      expect(sponsor.Link.length).toBeGreaterThan(0);
    }
  });

  it("each sponsor Link is a valid URL", () => {
    for (const sponsor of sponsorJSON.sponsors) {
      expect(() => new URL(sponsor.Link)).not.toThrow();
    }
  });

  it("no duplicate sponsor names", () => {
    const names = sponsorJSON.sponsors.map((s) => s.Name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("optional Color field is a valid Tailwind class when present", () => {
    for (const sponsor of sponsorJSON.sponsors) {
      if ("Color" in sponsor && sponsor.Color) {
        expect(sponsor.Color).toMatch(/^bg-/);
      }
    }
  });

  it("hasBackground is boolean when present", () => {
    for (const sponsor of sponsorJSON.sponsors) {
      if ("hasBackground" in sponsor) {
        expect(typeof sponsor.hasBackground).toBe("boolean");
      }
    }
  });
});
