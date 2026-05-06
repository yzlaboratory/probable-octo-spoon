import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ImpressumPage from "./ImpressumPage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ImpressumPage", () => {
  it("renders the IMPRESSUM eyebrow and the three Verantwortlich/KONTAKT/REDAKTIONELL VERANTWORTLICH cards", () => {
    // Footer triggers a sponsor fetch — stub to keep the test deterministic.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const { container, getByText } = render(
      <MemoryRouter>
        <ImpressumPage />
      </MemoryRouter>,
    );
    expect(getByText("IMPRESSUM")).toBeInTheDocument();
    expect(getByText("Verantwortlich")).toBeInTheDocument();
    expect(getByText("KONTAKT")).toBeInTheDocument();
    expect(getByText("REDAKTIONELL VERANTWORTLICH")).toBeInTheDocument();
    // Footer rendered too (carries the partner heading).
    expect(container.textContent).toContain("Partner & Förderer");
  });
});
