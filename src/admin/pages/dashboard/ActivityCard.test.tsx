import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ActivityCard } from "./ActivityCard";
import type { ActivityItem } from "./activity";

const NOW = new Date("2026-04-23T12:00:00Z");

function renderCard(items: ActivityItem[]) {
  return render(
    <MemoryRouter>
      <ActivityCard items={items} now={NOW} />
    </MemoryRouter>,
  );
}

describe("ActivityCard — populated", () => {
  it("renders one row per item with linked entity title", () => {
    const items: ActivityItem[] = [
      {
        kind: "news",
        noun: "Meldung",
        title: "Kreisligaderby",
        at: "2026-04-23T11:55:00Z",
        href: "/admin/news/1",
      },
      {
        kind: "sponsor",
        noun: "Sponsor",
        title: "Reifen Stiegler",
        at: "2026-04-23T11:00:00Z",
        href: "/admin/sponsors/3",
      },
    ];
    const { container } = renderCard(items);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/admin/news/1");
    expect(links[1].getAttribute("href")).toBe("/admin/sponsors/3");
    expect(links[0].textContent).toContain("Kreisligaderby");
    expect(links[1].textContent).toContain("Reifen Stiegler");
  });

  it("formats the timestamp using relativeTime against the injected now", () => {
    const items: ActivityItem[] = [
      {
        kind: "vorstand",
        noun: "Vorstand",
        title: "Anna",
        at: "2026-04-23T08:00:00Z",
        href: "/admin/vorstand",
      },
    ];
    const { getByText } = renderCard(items);
    expect(getByText("vor 4 Std.")).toBeTruthy();
  });

  it("renders the kind dot color via inline style", () => {
    const items: ActivityItem[] = [
      {
        kind: "news",
        noun: "Meldung",
        title: "x",
        at: "2026-04-23T10:00:00Z",
        href: "/admin/news/1",
      },
    ];
    const { container } = renderCard(items);
    const dot = container.querySelector("[aria-hidden]") as HTMLElement;
    expect(dot.getAttribute("style")).toContain("var(--accent)");
  });
});

describe("ActivityCard — empty", () => {
  it("shows the empty-state copy", () => {
    const { getByText } = renderCard([]);
    expect(getByText("Noch keine Aktivität.")).toBeTruthy();
  });

  it("renders the live badge in the header", () => {
    const { getByText } = renderCard([]);
    expect(getByText("live")).toBeTruthy();
  });
});
