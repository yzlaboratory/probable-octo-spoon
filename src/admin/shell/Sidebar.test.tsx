import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  it("renders both nav section headers", () => {
    const { getByText } = renderAt("/admin/news");
    expect(getByText("Inhalte")).toBeInTheDocument();
    expect(getByText("Konfiguration")).toBeInTheDocument();
  });

  it("renders the club wordmark in the top slot", () => {
    const { getByText } = renderAt("/admin/news");
    expect(getByText("SV Alemannia")).toBeInTheDocument();
    expect(getByText("svthalexweiler.de")).toBeInTheDocument();
  });

  it("marks the current route active via NavLink", () => {
    const { getByText } = renderAt("/admin/news");
    const link = getByText("News").closest("a")!;
    expect(link.className).toContain("active");
  });

  it("does NOT mark other routes active", () => {
    const { getByText } = renderAt("/admin/news");
    const sponsors = getByText("Sponsoren").closest("a")!;
    expect(sponsors.className).not.toContain("active");
  });

  describe.each([
    "Termine",
    "Mitglieder",
    "Website-Vorschau",
    "Erscheinungsbild",
    "Einstellungen",
  ])('"%s" is disabled (feature not yet shipped)', (label) => {
    it("renders as disabled button with 'bald' badge", () => {
      const { getByText } = renderAt("/admin/news");
      const entry = getByText(label);
      const button = entry.closest("button")!;
      expect(button.tagName).toBe("BUTTON");
      expect(button.disabled).toBe(true);
      expect(button.className).toContain("opacity-50");
    });
  });

  it("links live entries to their admin routes", () => {
    const { getByText } = renderAt("/admin");
    const dashboard = getByText("Übersicht").closest("a") as HTMLAnchorElement;
    const news = getByText("News").closest("a") as HTMLAnchorElement;
    const media = getByText("Mediathek").closest("a") as HTMLAnchorElement;
    const sponsors = getByText("Sponsoren").closest("a") as HTMLAnchorElement;
    const admins = getByText("Administratoren").closest(
      "a",
    ) as HTMLAnchorElement;
    expect(dashboard.getAttribute("href")).toBe("/admin");
    expect(news.getAttribute("href")).toBe("/admin/news");
    expect(media.getAttribute("href")).toBe("/admin/media");
    expect(sponsors.getAttribute("href")).toBe("/admin/sponsors");
    expect(admins.getAttribute("href")).toBe("/admin/admins");
  });

  it("marks Mediathek active at /admin/media", () => {
    const { getByText } = renderAt("/admin/media");
    const link = getByText("Mediathek").closest("a")!;
    expect(link.className).toContain("active");
  });

  it("keeps nested edit paths marked under the parent section", () => {
    const { getByText } = renderAt("/admin/news/42");
    const link = getByText("News").closest("a")!;
    expect(link.className).toContain("active");
  });

  it("marks Übersicht active only at /admin (strict, not prefix)", () => {
    const onDash = renderAt("/admin");
    const dashLink = onDash.getByText("Übersicht").closest("a")!;
    expect(dashLink.className).toContain("active");
    onDash.unmount();

    const onNews = renderAt("/admin/news");
    const dashLink2 = onNews.getByText("Übersicht").closest("a")!;
    expect(dashLink2.className).not.toContain("active");
  });
});
