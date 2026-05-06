import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DatenschutzPage from "./DatenschutzPage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DatenschutzPage", () => {
  it("renders the Rechtliches eyebrow and injects the Datenschutzerklärung HTML body", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const { container, getByText } = render(
      <MemoryRouter>
        <DatenschutzPage />
      </MemoryRouter>,
    );
    expect(getByText("Rechtliches")).toBeInTheDocument();
    // The HTML payload is injected via dangerouslySetInnerHTML — assert a couple of canonical landmarks.
    expect(container.textContent).toContain("Datenschutzerklärung");
    expect(container.textContent).toContain("Hetzner");
    expect(container.textContent).toContain("Google Fonts");
  });
});
