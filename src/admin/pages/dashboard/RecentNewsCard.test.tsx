import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecentNewsCard } from "./RecentNewsCard";
import type { News, NewsStatus } from "../../types";

function n(
  over: Partial<News> & { id: number; status: NewsStatus; updatedAt: string },
): News {
  return {
    slug: `n-${over.id}`,
    title: `News ${over.id}`,
    tag: "Allgemein",
    short: "",
    longHtml: "",
    publishAt: null,
    hero: null,
    createdAt: over.updatedAt,
    ...over,
  };
}

function renderCard(news: News[], limit?: number) {
  return render(
    <MemoryRouter>
      <RecentNewsCard news={news} limit={limit} />
    </MemoryRouter>,
  );
}

describe("RecentNewsCard — sorting and limit", () => {
  it("renders newest items first by updatedAt", () => {
    const { container } = renderCard([
      n({
        id: 1,
        status: "published",
        updatedAt: "2026-04-20T10:00:00Z",
        title: "Old",
      }),
      n({
        id: 2,
        status: "draft",
        updatedAt: "2026-04-22T10:00:00Z",
        title: "Mid",
      }),
      n({
        id: 3,
        status: "scheduled",
        updatedAt: "2026-04-23T10:00:00Z",
        title: "New",
      }),
    ]);
    const rows = Array.from(container.querySelectorAll("a"));
    const titles = rows.map(
      (r) => r.querySelector(".font-medium")?.textContent,
    );
    expect(titles).toEqual(["New", "Mid", "Old"]);
  });

  it("respects the limit (default 5)", () => {
    const news = Array.from({ length: 8 }, (_, i) =>
      n({
        id: i + 1,
        status: "published",
        updatedAt: `2026-04-${String(15 + i).padStart(2, "0")}T10:00:00Z`,
      }),
    );
    const { container } = renderCard(news);
    expect(container.querySelectorAll("a")).toHaveLength(5);
  });

  it("respects an explicit limit", () => {
    const news = Array.from({ length: 4 }, (_, i) =>
      n({
        id: i + 1,
        status: "published",
        updatedAt: `2026-04-${String(15 + i).padStart(2, "0")}T10:00:00Z`,
      }),
    );
    const { container } = renderCard(news, 2);
    expect(container.querySelectorAll("a")).toHaveLength(2);
  });

  it("hides 'deleted' (Papierkorb) news from the dashboard", () => {
    const { queryByText } = renderCard([
      n({
        id: 1,
        status: "deleted",
        updatedAt: "2026-04-23T10:00:00Z",
        title: "Trashed",
      }),
      n({
        id: 2,
        status: "published",
        updatedAt: "2026-04-22T10:00:00Z",
        title: "Live",
      }),
    ]);
    expect(queryByText("Trashed")).toBeNull();
    expect(queryByText("Live")).toBeTruthy();
  });
});

describe("RecentNewsCard — filter pills", () => {
  const items = [
    n({
      id: 1,
      status: "draft",
      updatedAt: "2026-04-23T12:00:00Z",
      title: "DraftA",
    }),
    n({
      id: 2,
      status: "scheduled",
      updatedAt: "2026-04-23T11:00:00Z",
      title: "Sched",
    }),
    n({
      id: 3,
      status: "published",
      updatedAt: "2026-04-23T10:00:00Z",
      title: "Pub",
    }),
  ];

  it("Alle is the default filter and shows everything", () => {
    const { getByText, queryByText } = renderCard(items);
    expect(getByText("DraftA")).toBeTruthy();
    expect(getByText("Sched")).toBeTruthy();
    expect(getByText("Pub")).toBeTruthy();
    expect(queryByText("Keine Meldungen in dieser Ansicht.")).toBeNull();
  });

  it("clicking 'Entwurf' restricts the visible rows to drafts", () => {
    const { getByRole, getByText, queryByText } = renderCard(items);
    fireEvent.click(getByRole("tab", { name: "Entwurf" }));
    expect(getByText("DraftA")).toBeTruthy();
    expect(queryByText("Sched")).toBeNull();
    expect(queryByText("Pub")).toBeNull();
  });

  it("filter button gets aria-selected when active", () => {
    const { getByRole } = renderCard(items);
    const sched = getByRole("tab", { name: "Geplant" });
    fireEvent.click(sched);
    expect(sched.getAttribute("aria-selected")).toBe("true");
  });

  it("shows the empty state when no rows match the filter", () => {
    const { getByRole, getByText } = renderCard([
      n({ id: 1, status: "published", updatedAt: "2026-04-23T10:00:00Z" }),
    ]);
    fireEvent.click(getByRole("tab", { name: "Entwurf" }));
    expect(getByText("Keine Meldungen in dieser Ansicht.")).toBeTruthy();
  });
});

describe("RecentNewsCard — row content", () => {
  it("links each row to its admin edit route", () => {
    const { container } = renderCard([
      n({ id: 99, status: "published", updatedAt: "2026-04-23T10:00:00Z" }),
    ]);
    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/admin/news/99");
  });

  it("falls back to '(ohne Titel)' when title is empty", () => {
    const { getByText } = renderCard([
      n({
        id: 1,
        status: "draft",
        updatedAt: "2026-04-23T10:00:00Z",
        title: "",
      }),
    ]);
    expect(getByText("(ohne Titel)")).toBeTruthy();
  });

  it("renders the publishAt date when present, otherwise updatedAt", () => {
    const { getByText } = renderCard([
      n({
        id: 1,
        status: "scheduled",
        updatedAt: "2026-04-20T10:00:00Z",
        publishAt: "2026-05-01T10:00:00Z",
      }),
    ]);
    expect(getByText("01.05.")).toBeTruthy();
  });

  it("renders the localized status pill label", () => {
    const { container } = renderCard([
      n({ id: 1, status: "scheduled", updatedAt: "2026-04-23T10:00:00Z" }),
      n({ id: 2, status: "withdrawn", updatedAt: "2026-04-22T10:00:00Z" }),
    ]);
    // Status pills live inside the row links; filter pills live outside.
    const rowPills = Array.from(container.querySelectorAll("a .chip"));
    const labels = rowPills.map((p) => p.textContent?.trim());
    expect(labels).toEqual(["Geplant", "Zurückgezogen"]);
  });
});
