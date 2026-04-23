import { describe, expect, it } from "vitest";
import {
  newsKpi,
  newsSubline,
  sponsorKpi,
  sponsorSubline,
  vorstandKpi,
  vorstandSubline,
} from "./kpi";
import type { News, Sponsor, Vorstand } from "../../types";

function n(status: News["status"], rest: Partial<News> = {}): News {
  return {
    id: 1,
    slug: "x",
    title: "x",
    tag: "x",
    short: "",
    longHtml: "",
    blocks: [],
    status,
    publishAt: null,
    hero: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...rest,
  };
}

function s(status: Sponsor["status"], rest: Partial<Sponsor> = {}): Sponsor {
  return {
    id: 1,
    name: "x",
    tagline: null,
    linkUrl: "",
    logoHasOwnBackground: false,
    cardPalette: "transparent",
    weight: 1,
    status,
    activeFrom: null,
    activeUntil: null,
    notes: null,
    displayOrder: 0,
    logo: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...rest,
  };
}

function v(
  status: Vorstand["status"],
  portrait: Vorstand["portrait"] = null,
  rest: Partial<Vorstand> = {},
): Vorstand {
  return {
    id: 1,
    name: "x",
    role: "x",
    email: null,
    phone: null,
    notes: null,
    status,
    displayOrder: 0,
    portrait,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...rest,
  };
}

describe("newsKpi", () => {
  it("counts each status bucket", () => {
    const k = newsKpi([
      n("published"),
      n("published"),
      n("draft"),
      n("scheduled"),
      n("withdrawn"),
      n("deleted"),
    ]);
    expect(k).toEqual({ published: 2, drafts: 1, scheduled: 1, withdrawn: 1 });
  });

  it("handles empty input", () => {
    expect(newsKpi([])).toEqual({
      published: 0,
      drafts: 0,
      scheduled: 0,
      withdrawn: 0,
    });
  });
});

describe("sponsorKpi", () => {
  it("counts active / paused / archived", () => {
    expect(
      sponsorKpi([s("active"), s("active"), s("paused"), s("archived")]),
    ).toEqual({ active: 2, paused: 1, archived: 1 });
  });

  it("handles empty input", () => {
    expect(sponsorKpi([])).toEqual({ active: 0, paused: 0, archived: 0 });
  });
});

describe("vorstandKpi", () => {
  it("counts active members and active members without portrait", () => {
    const portrait = {
      id: 1,
      variants: { thumb: "/x" },
      mimeType: "image/jpeg",
    };
    expect(
      vorstandKpi([
        v("active", portrait),
        v("active", null),
        v("active", null),
        v("hidden", null),
        v("archived", null),
      ]),
    ).toEqual({ active: 3, withoutPortrait: 2 });
  });

  it("ignores non-active members in the without-portrait count", () => {
    expect(vorstandKpi([v("hidden", null), v("archived", null)])).toEqual({
      active: 0,
      withoutPortrait: 0,
    });
  });
});

describe("subline formatters", () => {
  it("newsSubline: composes geplant + Entwürfe parts", () => {
    expect(
      newsSubline({ published: 5, drafts: 2, scheduled: 1, withdrawn: 0 }),
    ).toBe("+1 geplant · 2 Entwürfe");
  });

  it("newsSubline: singular Entwurf when drafts === 1", () => {
    expect(
      newsSubline({ published: 5, drafts: 1, scheduled: 0, withdrawn: 0 }),
    ).toBe("1 Entwurf");
  });

  it("newsSubline: 'Alles veröffentlicht' when nothing pending", () => {
    expect(
      newsSubline({ published: 5, drafts: 0, scheduled: 0, withdrawn: 0 }),
    ).toBe("Alles veröffentlicht");
  });

  it("sponsorSubline: shows paused + archived counts", () => {
    expect(sponsorSubline({ active: 3, paused: 1, archived: 2 })).toBe(
      "1 pausiert · 2 archiviert",
    );
  });

  it("vorstandSubline: 'vollständig' when all have portrait", () => {
    expect(vorstandSubline({ active: 4, withoutPortrait: 0 })).toBe(
      "vollständig · alle mit Foto",
    );
  });

  it("vorstandSubline: surfaces missing portrait count", () => {
    expect(vorstandSubline({ active: 4, withoutPortrait: 2 })).toBe(
      "2 ohne Portrait",
    );
  });

  it("vorstandSubline: 'Keine aktiven Mitglieder' when active is zero", () => {
    expect(vorstandSubline({ active: 0, withoutPortrait: 0 })).toBe(
      "Keine aktiven Mitglieder",
    );
  });
});
