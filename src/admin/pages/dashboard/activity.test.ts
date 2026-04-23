import { describe, expect, it } from "vitest";
import { mergeActivity } from "./activity";
import type { News, Sponsor, Vorstand } from "../../types";

function n(id: number, title: string, updatedAt: string): News {
  return {
    id,
    slug: `n-${id}`,
    title,
    tag: "x",
    short: "",
    longHtml: "",
    status: "published",
    publishAt: null,
    hero: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

function s(id: number, name: string, updatedAt: string): Sponsor {
  return {
    id,
    name,
    tagline: null,
    linkUrl: "",
    logoHasOwnBackground: false,
    cardPalette: "transparent",
    weight: 1,
    status: "active",
    activeFrom: null,
    activeUntil: null,
    notes: null,
    displayOrder: 0,
    logo: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

function v(id: number, name: string, updatedAt: string): Vorstand {
  return {
    id,
    name,
    role: "x",
    email: null,
    phone: null,
    notes: null,
    status: "active",
    displayOrder: 0,
    portrait: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

describe("mergeActivity", () => {
  it("merges and sorts newest-first across all three entity types", () => {
    const items = mergeActivity(
      [n(1, "older news", "2026-04-20T10:00:00Z"), n(2, "newer news", "2026-04-22T09:00:00Z")],
      [s(1, "sponsor mid", "2026-04-21T12:00:00Z")],
      [v(1, "vorstand newest", "2026-04-23T07:00:00Z")],
    );
    expect(items.map((i) => i.title)).toEqual([
      "vorstand newest",
      "newer news",
      "sponsor mid",
      "older news",
    ]);
  });

  it("annotates each item with kind, noun, and href", () => {
    const items = mergeActivity(
      [n(7, "Foo", "2026-04-23T10:00:00Z")],
      [s(3, "Bar GmbH", "2026-04-22T10:00:00Z")],
      [v(9, "Anna Beispiel", "2026-04-21T10:00:00Z")],
    );
    expect(items[0]).toMatchObject({
      kind: "news",
      noun: "Meldung",
      href: "/admin/news/7",
    });
    expect(items[1]).toMatchObject({
      kind: "sponsor",
      noun: "Sponsor",
      href: "/admin/sponsors/3",
    });
    expect(items[2]).toMatchObject({
      kind: "vorstand",
      noun: "Vorstand",
      href: "/admin/vorstand",
    });
  });

  it("respects the limit", () => {
    const news = Array.from({ length: 15 }, (_, i) =>
      n(i, `t${i}`, `2026-04-${String(i + 1).padStart(2, "0")}T10:00:00Z`),
    );
    expect(mergeActivity(news, [], [], 5)).toHaveLength(5);
  });

  it("returns empty list when no entities exist", () => {
    expect(mergeActivity([], [], [])).toEqual([]);
  });

  it("default limit is 10", () => {
    const news = Array.from({ length: 20 }, (_, i) =>
      n(i, `t${i}`, `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`),
    );
    expect(mergeActivity(news, [], [])).toHaveLength(10);
  });

  it("keeps stable ordering when timestamps tie (insertion order within kind)", () => {
    const t = "2026-04-23T10:00:00Z";
    const items = mergeActivity([n(1, "a", t), n(2, "b", t)], [s(3, "c", t)], [v(4, "d", t)]);
    // Sort is stable per spec, so original concat order (news, sponsors, vorstand) is preserved.
    expect(items.map((i) => i.title)).toEqual(["a", "b", "c", "d"]);
  });
});
