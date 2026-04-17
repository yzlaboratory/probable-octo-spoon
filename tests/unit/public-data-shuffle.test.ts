import { describe, it, expect } from "vitest";
import { shuffleSponsors, shuffleTopSponsors, type PublicSponsor } from "../../src/utilities/publicData";

function s(name: string, money: number): PublicSponsor {
  return {
    Name: name,
    Title: "",
    Link: "https://example.com",
    ImageUrl: "",
    money,
  };
}

describe("shuffleSponsors", () => {
  it("returns the same set of sponsors it was given", () => {
    const input = [s("A", 1), s("B", 1), s("C", 1)];
    const out = shuffleSponsors(input);
    expect(out).toHaveLength(3);
    for (const x of input) expect(out).toContain(x);
  });

  it("does not mutate its input", () => {
    const input = [s("A", 1), s("B", 1)];
    const snapshot = [...input];
    shuffleSponsors(input);
    expect(input).toEqual(snapshot);
  });

  it("produces different orderings across many calls", () => {
    const input = [s("A", 1), s("B", 1), s("C", 1), s("D", 1)];
    const orders = new Set<string>();
    for (let i = 0; i < 40; i++) {
      orders.add(shuffleSponsors(input).map((x) => x.Name).join(","));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it("weights the front toward higher money", () => {
    const input = [s("High", 1000), s("Low", 1)];
    let high = 0;
    for (let i = 0; i < 500; i++) {
      if (shuffleSponsors(input)[0].Name === "High") high += 1;
    }
    expect(high / 500).toBeGreaterThan(0.85);
  });
});

describe("shuffleTopSponsors", () => {
  it("takes the top N by money before shuffling", () => {
    const input = [s("A", 1), s("B", 2), s("C", 3), s("D", 4), s("E", 5)];
    const out = shuffleTopSponsors(input, 3);
    expect(out).toHaveLength(3);
    const names = new Set(out.map((x) => x.Name));
    expect(names).toEqual(new Set(["C", "D", "E"]));
  });

  it("defaults to 8 when no count is given", () => {
    const input = Array.from({ length: 12 }, (_, i) => s(`S${i}`, i + 1));
    expect(shuffleTopSponsors(input)).toHaveLength(8);
  });
});
