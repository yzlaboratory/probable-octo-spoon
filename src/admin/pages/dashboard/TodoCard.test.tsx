import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TodoCard } from "./TodoCard";
import type { TodoItem } from "./todos";

function renderCard(items: TodoItem[]) {
  return render(
    <MemoryRouter>
      <TodoCard items={items} />
    </MemoryRouter>,
  );
}

const NEWS_ITEM: TodoItem = {
  kind: "news-draft",
  tag: "News",
  label: "Kreisligaderby: Sieg in der Nachspielzeit",
  meta: "Entwurf seit 3 T.",
  action: "Prüfen & veröffentlichen",
  href: "/admin/news/42",
  tone: "accent",
  rank: -72,
};

const SPONSOR_ITEM: TodoItem = {
  kind: "sponsor-expiring",
  tag: "Sponsor",
  label: "Reifen Stiegler",
  meta: "Vertrag läuft in 7 T. aus",
  action: "Verlängern oder archivieren",
  href: "/admin/sponsors/11",
  tone: "warn",
  rank: 7,
};

describe("TodoCard — populated", () => {
  it("renders the headline pluralized for multiple items", () => {
    const { getByText } = renderCard([NEWS_ITEM, SPONSOR_ITEM]);
    expect(getByText("2 Dinge warten auf dich")).toBeTruthy();
  });

  it("renders the headline singular for one item", () => {
    const { getByText } = renderCard([NEWS_ITEM]);
    expect(getByText("Eine Sache wartet auf dich")).toBeTruthy();
  });

  it("renders each todo as a link to its href", () => {
    const { container } = renderCard([NEWS_ITEM, SPONSOR_ITEM]);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/admin/news/42");
    expect(links[1].getAttribute("href")).toBe("/admin/sponsors/11");
  });

  it("shows the label, meta, and action for each row", () => {
    const { getByText } = renderCard([NEWS_ITEM]);
    expect(getByText("Kreisligaderby: Sieg in der Nachspielzeit")).toBeTruthy();
    expect(getByText("Entwurf seit 3 T.")).toBeTruthy();
    expect(getByText("Prüfen & veröffentlichen")).toBeTruthy();
  });

  it("renders the tag pill text per row", () => {
    const { getByText } = renderCard([NEWS_ITEM, SPONSOR_ITEM]);
    expect(getByText("News")).toBeTruthy();
    expect(getByText("Sponsor")).toBeTruthy();
  });
});

describe("TodoCard — empty", () => {
  it("shows the empty-state copy when items is []", () => {
    const { getByText, queryByText } = renderCard([]);
    expect(getByText("Alles erledigt")).toBeTruthy();
    // Empty-state text fragment.
    expect(getByText(/Keine Entwürfe/)).toBeTruthy();
    // No "Alle anzeigen" button when empty.
    expect(queryByText("Alle anzeigen")).toBeNull();
  });

  it("renders no link rows when empty", () => {
    const { container } = renderCard([]);
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });
});
