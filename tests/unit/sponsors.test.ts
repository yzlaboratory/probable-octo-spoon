import { describe, it, expect } from "vitest";
import { sponsorJSON, shuffleSponsors } from "../../src/utilities/sponsors";

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

  it("each sponsor has a positive money value", () => {
    for (const sponsor of sponsorJSON.sponsors) {
      expect(sponsor).toHaveProperty("money");
      expect(typeof sponsor.money).toBe("number");
      expect(sponsor.money).toBeGreaterThan(0);
    }
  });
});

describe("shuffleSponsors", () => {
  it("returns all sponsors without adding or removing any", () => {
    const result = shuffleSponsors();
    expect(result).toHaveLength(sponsorJSON.sponsors.length);
    for (const sponsor of sponsorJSON.sponsors) {
      expect(result).toContain(sponsor);
    }
  });

  it("does not mutate the original array", () => {
    const original = [...sponsorJSON.sponsors];
    shuffleSponsors();
    expect(sponsorJSON.sponsors).toEqual(original);
  });

  it("produces different orderings across multiple calls", () => {
    const orders = new Set<string>();
    for (let i = 0; i < 20; i++) {
      orders.add(shuffleSponsors().map((s) => s.Name).join(","));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("favors higher-money sponsors toward the front", () => {
    // Temporarily patch sponsors with known unequal weights
    const original = [...sponsorJSON.sponsors];
    sponsorJSON.sponsors.length = 0;
    sponsorJSON.sponsors.push(
      { Name: "High", Title: "", ImageUrl: "", Link: "https://example.com", hasBackground: true, money: 1000 } as any,
      { Name: "Low", Title: "", ImageUrl: "", Link: "https://example.com", hasBackground: true, money: 1 } as any,
    );

    let highFirst = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      const result = shuffleSponsors();
      if (result[0].Name === "High") highFirst++;
    }

    // Restore original sponsors
    sponsorJSON.sponsors.length = 0;
    sponsorJSON.sponsors.push(...original);

    // With 1000:1 weight ratio, "High" should be first far more than 50% of the time
    expect(highFirst / runs).toBeGreaterThan(0.85);
  });
});
