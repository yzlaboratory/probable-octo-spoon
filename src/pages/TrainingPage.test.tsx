import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TrainingPage from "./TrainingPage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TrainingPage", () => {
  it("renders the TRAINING eyebrow + intro copy and embeds the TrainingSection (with hideHeading)", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const { container, getByText } = render(
      <MemoryRouter>
        <TrainingPage />
      </MemoryRouter>,
    );
    expect(getByText("TRAINING")).toBeInTheDocument();
    expect(container.textContent).toContain("Wöchentliche Trainingszeiten");
    // Footer is rendered after the section.
    expect(container.textContent).toContain("Partner & Förderer");
  });
});
