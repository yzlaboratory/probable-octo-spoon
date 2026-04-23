import { describe, expect, it } from "vitest";
import { breadcrumbsFor } from "./breadcrumbs";

describe("breadcrumbsFor", () => {
  it("returns the club crumb for the admin root", () => {
    expect(breadcrumbsFor("/admin")).toEqual(["SV Alemannia"]);
  });

  it("returns the club crumb for the true site root too", () => {
    expect(breadcrumbsFor("/")).toEqual(["SV Alemannia"]);
  });

  it("maps known section segments to German labels", () => {
    expect(breadcrumbsFor("/admin/news")).toEqual(["SV Alemannia", "News"]);
    expect(breadcrumbsFor("/admin/sponsors")).toEqual(["SV Alemannia", "Sponsoren"]);
    expect(breadcrumbsFor("/admin/vorstand")).toEqual(["SV Alemannia", "Vorstand"]);
    expect(breadcrumbsFor("/admin/admins")).toEqual(["SV Alemannia", "Administratoren"]);
  });

  it("treats numeric ids as 'Bearbeiten' so raw ids do not surface", () => {
    expect(breadcrumbsFor("/admin/news/42")).toEqual([
      "SV Alemannia",
      "News",
      "Bearbeiten",
    ]);
  });

  it("maps 'new' to 'Neu' for the create routes", () => {
    expect(breadcrumbsFor("/admin/news/new")).toEqual([
      "SV Alemannia",
      "News",
      "Neu",
    ]);
  });

  it("handles trailing slashes", () => {
    expect(breadcrumbsFor("/admin/news/")).toEqual(["SV Alemannia", "News"]);
  });

  it("preserves unknown segments so unexpected deep links still render", () => {
    expect(breadcrumbsFor("/admin/news/weird-slug")).toEqual([
      "SV Alemannia",
      "News",
      "weird-slug",
    ]);
  });
});
