import { describe, expect, it } from "vitest";
import { deriveTodos } from "./todos";
import type { News, Sponsor, Vorstand } from "../../types";

const NOW = new Date("2026-04-23T12:00:00Z");

function n(over: Partial<News>): News {
  return {
    id: 1,
    slug: "x",
    title: "X",
    tag: "x",
    short: "",
    longHtml: "",
    status: "draft",
    publishAt: null,
    hero: null,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    ...over,
  };
}

function s(over: Partial<Sponsor>): Sponsor {
  return {
    id: 1,
    name: "Acme",
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
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function v(over: Partial<Vorstand>): Vorstand {
  return {
    id: 1,
    name: "Anna",
    role: "Vorsitzende",
    email: null,
    phone: null,
    notes: null,
    status: "active",
    displayOrder: 0,
    portrait: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("deriveTodos — news drafts", () => {
  it("includes drafts older than 24h", () => {
    const items = deriveTodos(
      [n({ id: 5, title: "Alt", updatedAt: "2026-04-21T12:00:00Z" })],
      [],
      [],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "news-draft",
      tag: "News",
      label: "Alt",
      action: "Prüfen & veröffentlichen",
      href: "/admin/news/5",
      tone: "accent",
    });
    expect(items[0].meta).toMatch(/Entwurf seit/);
  });

  it("excludes drafts younger than 24h", () => {
    expect(
      deriveTodos(
        [n({ updatedAt: "2026-04-23T08:00:00Z" })],
        [],
        [],
        NOW,
      ),
    ).toEqual([]);
  });

  it("ignores published / scheduled / withdrawn news", () => {
    expect(
      deriveTodos(
        [
          n({ status: "published", updatedAt: "2026-01-01T00:00:00Z" }),
          n({ status: "scheduled", updatedAt: "2026-01-01T00:00:00Z" }),
          n({ status: "withdrawn", updatedAt: "2026-01-01T00:00:00Z" }),
        ],
        [],
        [],
        NOW,
      ),
    ).toEqual([]);
  });

  it("falls back to '(ohne Titel)' when title is empty", () => {
    const items = deriveTodos(
      [n({ title: "", updatedAt: "2026-04-21T00:00:00Z" })],
      [],
      [],
      NOW,
    );
    expect(items[0].label).toBe("(ohne Titel)");
  });
});

describe("deriveTodos — sponsor expirations", () => {
  it("includes sponsors expiring within 30 days", () => {
    const items = deriveTodos(
      [],
      [s({ id: 11, name: "Reifen Stiegler", activeUntil: "2026-04-30T00:00:00Z" })],
      [],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "sponsor-expiring",
      tag: "Sponsor",
      label: "Reifen Stiegler",
      action: "Verlängern oder archivieren",
      href: "/admin/sponsors/11",
      tone: "warn",
    });
    expect(items[0].meta).toMatch(/läuft in 7 T/);
  });

  it("includes already-expired sponsors and labels them as such", () => {
    const items = deriveTodos(
      [],
      [s({ id: 12, activeUntil: "2026-04-20T00:00:00Z" })],
      [],
      NOW,
    );
    expect(items[0].meta).toMatch(/abgelaufen vor 3 T/);
  });

  it("uses 'läuft heute aus' when daysLeft === 0", () => {
    const items = deriveTodos(
      [],
      [s({ id: 13, activeUntil: "2026-04-23T12:00:00Z" })],
      [],
      NOW,
    );
    expect(items[0].meta).toBe("Vertrag läuft heute aus");
  });

  it("excludes sponsors expiring beyond 30 days", () => {
    expect(
      deriveTodos(
        [],
        [s({ activeUntil: "2026-06-30T00:00:00Z" })],
        [],
        NOW,
      ),
    ).toEqual([]);
  });

  it("excludes sponsors with no activeUntil", () => {
    expect(
      deriveTodos([], [s({ activeUntil: null })], [], NOW),
    ).toEqual([]);
  });

  it("excludes paused / archived sponsors", () => {
    expect(
      deriveTodos(
        [],
        [
          s({ status: "paused", activeUntil: "2026-04-30T00:00:00Z" }),
          s({ status: "archived", activeUntil: "2026-04-30T00:00:00Z" }),
        ],
        [],
        NOW,
      ),
    ).toEqual([]);
  });
});

describe("deriveTodos — vorstand portraits", () => {
  it("includes active members without a portrait", () => {
    const items = deriveTodos(
      [],
      [],
      [v({ id: 21, name: "Thomas Brandt", portrait: null })],
      NOW,
    );
    expect(items[0]).toMatchObject({
      kind: "vorstand-portrait",
      tag: "Vorstand",
      label: "Portrait für Thomas Brandt fehlt",
      action: "Hochladen",
      href: "/admin/vorstand",
      tone: "tertiary",
    });
  });

  it("excludes members with a portrait", () => {
    const portrait = { id: 1, variants: { thumb: "/x" }, mimeType: "image/jpeg" };
    expect(deriveTodos([], [], [v({ portrait })], NOW)).toEqual([]);
  });

  it("excludes hidden / archived members", () => {
    expect(
      deriveTodos(
        [],
        [],
        [v({ status: "hidden", portrait: null }), v({ status: "archived", portrait: null })],
        NOW,
      ),
    ).toEqual([]);
  });
});

describe("deriveTodos — sorting and limit", () => {
  it("expired sponsors rank ahead of soon-to-expire", () => {
    const items = deriveTodos(
      [],
      [
        s({ id: 1, name: "soon", activeUntil: "2026-05-15T00:00:00Z" }), // ~22 days out
        s({ id: 2, name: "expired", activeUntil: "2026-04-10T00:00:00Z" }), // already past
      ],
      [],
      NOW,
    );
    expect(items.map((i) => i.label)).toEqual(["expired", "soon"]);
  });

  it("respects the cap (default 5)", () => {
    const drafts = Array.from({ length: 8 }, (_, i) =>
      n({ id: i + 1, title: `t${i}`, updatedAt: "2026-04-01T00:00:00Z" }),
    );
    expect(deriveTodos(drafts, [], [], NOW)).toHaveLength(5);
  });

  it("respects an explicit cap", () => {
    const drafts = Array.from({ length: 4 }, (_, i) =>
      n({ id: i + 1, title: `t${i}`, updatedAt: "2026-04-01T00:00:00Z" }),
    );
    expect(deriveTodos(drafts, [], [], NOW, 2)).toHaveLength(2);
  });

  it("returns empty list when nothing pending", () => {
    expect(deriveTodos([], [], [], NOW)).toEqual([]);
  });
});
