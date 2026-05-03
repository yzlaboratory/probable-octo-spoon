import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import NotFoundPage from "./NotFoundPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("renders the 404 eyebrow + headline", () => {
    const { getByText } = renderAt("/admin/totally-bogus");
    expect(getByText("404 · Nicht gefunden")).toBeInTheDocument();
    expect(getByText("Diese Seite gibt es hier nicht.")).toBeInTheDocument();
  });

  it("surfaces the requested pathname so the user sees what was missing", () => {
    const { getByTestId } = renderAt("/admin/theme");
    expect(getByTestId("not-found-path").textContent).toBe("/admin/theme");
  });

  it("links back to the admin overview", () => {
    const { getByRole } = renderAt("/admin/foo/bar");
    const link = getByRole("link", { name: /zur übersicht/i });
    expect(link.getAttribute("href")).toBe("/admin");
  });

  it("handles deep nested paths with a single catch-all", () => {
    const { getByTestId } = renderAt("/admin/settings/keys/42");
    expect(getByTestId("not-found-path").textContent).toBe(
      "/admin/settings/keys/42",
    );
  });
});
