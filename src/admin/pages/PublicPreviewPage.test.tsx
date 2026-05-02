import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PublicPreviewPage from "./PublicPreviewPage";
import { api } from "../api";
import type { News } from "../types";

function n(over: Partial<News> & { id: number; slug: string }): News {
  return {
    title: `Item ${over.id}`,
    tag: "Fußball",
    short: "kurz",
    longHtml: "",
    blocks: [],
    status: "published",
    publishAt: "2026-04-01T00:00:00.000Z",
    hero: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...over,
  } as News;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PublicPreviewPage />
    </MemoryRouter>,
  );
}

const PUBLISHED: News[] = [
  n({ id: 12, slug: "derbysieg-vs-waldau" }),
  n({ id: 11, slug: "trainingsauftakt" }),
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PublicPreviewPage", () => {
  describe("with published news", () => {
    beforeEach(() => {
      vi.spyOn(api, "get").mockImplementation(async (path: string) => {
        if (path === "/api/news?status=published")
          return PUBLISHED as unknown as never;
        throw new Error(`unexpected fetch: ${path}`);
      });
    });

    it("renders the iframe pointing at the home route by default", async () => {
      renderPage();
      const frame = (await screen.findByTestId(
        "preview-iframe",
      )) as HTMLIFrameElement;
      expect(frame.getAttribute("src")).toBe("/");
    });

    it("switches the iframe src when a tab is clicked", async () => {
      renderPage();
      await screen.findByTestId("preview-iframe");

      fireEvent.click(screen.getByRole("tab", { name: "Spielplan" }));
      expect(
        (
          screen.getByTestId("preview-iframe") as HTMLIFrameElement
        ).getAttribute("src"),
      ).toBe("/spiele");

      fireEvent.click(screen.getByRole("tab", { name: "Impressum" }));
      expect(
        (
          screen.getByTestId("preview-iframe") as HTMLIFrameElement
        ).getAttribute("src"),
      ).toBe("/Impressum");
    });

    it("uses the latest published news slug for the news tab", async () => {
      renderPage();
      // Wait for the news tab to enable (it's disabled until the fetch resolves).
      await waitFor(() => {
        const tab = screen.getByRole("tab", {
          name: "Meldung",
        }) as HTMLButtonElement;
        expect(tab.disabled).toBe(false);
      });

      fireEvent.click(screen.getByRole("tab", { name: "Meldung" }));
      const frame = screen.getByTestId("preview-iframe") as HTMLIFrameElement;
      expect(frame.getAttribute("src")).toBe("/news/derbysieg-vs-waldau");
      expect(screen.getByTestId("preview-url-bar").textContent).toContain(
        "/news/derbysieg-vs-waldau",
      );
    });

    it("clamps wrapper width per device toggle", async () => {
      renderPage();
      const wrapper = await screen.findByTestId("preview-frame-wrapper");
      expect(wrapper.getAttribute("data-device")).toBe("desktop");

      fireEvent.click(screen.getByRole("radio", { name: "Tablet" }));
      expect(wrapper.getAttribute("data-device")).toBe("tablet");
      expect(wrapper.style.width).toBe("820px");

      fireEvent.click(screen.getByRole("radio", { name: "Smartphone" }));
      expect(wrapper.getAttribute("data-device")).toBe("mobile");
      expect(wrapper.style.width).toBe("390px");
    });

    it("shows the URL bar with the active path appended to the club domain", async () => {
      renderPage();
      const bar = await screen.findByTestId("preview-url-bar");
      // home → no path appended
      expect(bar.textContent).toBe("https://svthalexweiler.de");

      fireEvent.click(screen.getByRole("tab", { name: "Training" }));
      expect(screen.getByTestId("preview-url-bar").textContent).toBe(
        "https://svthalexweiler.de/training",
      );
    });
  });

  describe("without published news", () => {
    beforeEach(() => {
      vi.spyOn(api, "get").mockImplementation(async (path: string) => {
        if (path === "/api/news?status=published")
          return [] as unknown as never;
        throw new Error(`unexpected fetch: ${path}`);
      });
    });

    it("disables the news tab and shows an explanatory empty state when selected", async () => {
      renderPage();
      // Wait for the fetch to resolve so the disabled-reason flips from
      // "Lade neueste Meldung …" to the no-published-news message.
      await waitFor(() => {
        const tab = screen.getByRole("tab", {
          name: "Meldung",
        }) as HTMLButtonElement;
        expect(tab.disabled).toBe(true);
        expect(tab.getAttribute("title")).toContain(
          "Keine veröffentlichten Meldungen",
        );
      });

      // Other tabs still work.
      expect(
        (
          screen.getByTestId("preview-iframe") as HTMLIFrameElement
        ).getAttribute("src"),
      ).toBe("/");
    });
  });

  describe("when news fetch fails", () => {
    beforeEach(() => {
      vi.spyOn(api, "get").mockRejectedValue(new Error("network down"));
    });

    it("still renders the home preview and disables the news tab gracefully", async () => {
      renderPage();
      const frame = (await screen.findByTestId(
        "preview-iframe",
      )) as HTMLIFrameElement;
      expect(frame.getAttribute("src")).toBe("/");
      await waitFor(() => {
        const tab = screen.getByRole("tab", {
          name: "Meldung",
        }) as HTMLButtonElement;
        expect(tab.disabled).toBe(true);
      });
    });
  });
});
